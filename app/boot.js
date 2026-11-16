// A make.fun frontend: the board of live bounties, a page for each bounty,
// its leaderboard and an account's public profile, on hash routes.
//
//   #/                              the board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     its leaderboard
//   #/u/<handle>                    an account's public profile
//
// window.__shotReady is false while a route loads and true once its data is
// on screen and its images have settled, so a screenshot script knows when
// to capture. Time-left labels tick every 30 seconds without refetching,
// and API answers revalidate at most once a minute (see client.js).

import { dropCache, fetchBoard, fetchBounty, fetchLeaderboard, fetchProfile } from './client.js';
import {
  boardCards, boardFilters, boardHeader, bountyDetail, errorCard,
  leaderboardDetail, profileDetail,
} from './screens.js';
import { clockOnly, deadlineKind, remaining } from './text.js';

const app = document.getElementById('app');
const notice = document.getElementById('notice');
const updated = document.getElementById('updated');
const refreshBtn = document.getElementById('refresh');

// Board controls survive navigation, so going back keeps your search.
const boardState = { q: '', sort: 'closing', filter: 'all' };
let boardItems = [];
let lbPage = 1;

function say(text) {
  notice.textContent = text;
}

function stampUpdated() {
  updated.textContent = `updated ${clockOnly(new Date().toISOString())}`;
}

/** Hide avatar and thumbnail images that failed to load, leaving initials. */
function hideBrokenImages(root) {
  for (const img of root.querySelectorAll('img.avatar-img, img.thumb')) {
    if (img.complete && img.naturalWidth === 0) img.style.display = 'none';
    else img.addEventListener('error', () => { img.style.display = 'none'; }, { once: true });
  }
}

/** Refresh every time-left label on screen, without touching the network. */
function tickClocks() {
  for (const el of app.querySelectorAll('[data-deadline]')) {
    el.textContent = remaining(el.getAttribute('data-deadline'));
  }
}
setInterval(tickClocks, 30000);

/** Wait until the route's images have settled (or 2.5s), then signal ready. */
async function waitForImages() {
  const imgs = [...app.querySelectorAll('img')];
  if (!imgs.length) return;
  await Promise.race([
    Promise.all(imgs.map((img) => (img.complete
      ? Promise.resolve()
      : new Promise((done) => {
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        })))),
    new Promise((done) => setTimeout(done, 2500)),
  ]);
}

/** The board's search, sort and filter, applied to the fetched items. */
export function applyBoard(items, state) {
  const q = state.q.trim().toLowerCase();
  let out = items;
  if (state.filter === 'soon') out = out.filter((b) => deadlineKind(b.deadline) === 'soon');
  else if (state.filter === 'ended') out = out.filter((b) => deadlineKind(b.deadline) === 'ended');
  else if (state.filter === 'open') out = out.filter((b) => deadlineKind(b.deadline) !== 'ended');
  if (q) {
    out = out.filter((b) => [b.title, b.summary, b.category, ...(b.skills || [])]
      .join(' ').toLowerCase().includes(q));
  }
  const potOf = (b) => Number(b.potUsd ?? b.rewardAmount) || 0;
  const dueOf = (b) => new Date(b.deadline).getTime() || 0;
  const endedOf = (b) => (deadlineKind(b.deadline) === 'ended' ? 1 : 0);
  const orders = {
    // Closing soonest among the open ones; ended bounties sink to the bottom.
    closing: (a, b) => endedOf(a) - endedOf(b) || dueOf(a) - dueOf(b),
    pot: (a, b) => potOf(b) - potOf(a),
    entries: (a, b) => (b.submissionCount || 0) - (a.submissionCount || 0),
    newest: (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  };
  return [...out].sort(orders[state.sort] || orders.closing);
}

function boardTotals(items) {
  const live = items.filter((b) => deadlineKind(b.deadline) !== 'ended');
  return {
    open: live.length,
    soon: items.filter((b) => deadlineKind(b.deadline) === 'soon').length,
    pot: live.reduce((sum, b) => sum + (Number(b.potUsd ?? b.rewardAmount) || 0), 0),
    entries: items.reduce((sum, b) => sum + (Number(b.submissionCount) || 0), 0),
  };
}

async function showBoard() {
  const data = await fetchBoard();
  boardItems = data.items || [];
  app.innerHTML = boardHeader(boardTotals(boardItems))
    + boardFilters(boardState)
    + boardCards(applyBoard(boardItems, boardState));
  const form = document.getElementById('board-controls');
  form.addEventListener('input', () => {
    boardState.q = form.q.value;
    boardState.sort = form.sort.value;
    boardState.filter = form.filter.value;
    const list = app.querySelector('.cards, .empty');
    const html = boardCards(applyBoard(boardItems, boardState));
    if (list) list.outerHTML = html;
    else app.insertAdjacentHTML('beforeend', html);
    hideBrokenImages(app);
  });
  form.addEventListener('submit', (e) => e.preventDefault());
}

async function showBounty(slug) {
  const b = await fetchBounty(slug);
  document.title = `${b.title} | make.fun bounties`;
  app.innerHTML = bountyDetail(b);
}

async function showLeaderboard(slug) {
  const data = await fetchLeaderboard(slug);
  document.title = `${data.competition?.title || slug} leaderboard | make.fun bounties`;
  app.innerHTML = leaderboardDetail(data, slug, lbPage);
  app.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      lbPage = Number(btn.getAttribute('data-page'));
      renderRoute();
    });
  });
}

async function showProfile(handle) {
  const p = await fetchProfile(handle);
  document.title = `${p.display_name || p.handle} | make.fun bounties`;
  app.innerHTML = profileDetail(p);
}

function readRoute() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\//, '').split('/').map(decodeURIComponent);
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') {
    return { name: 'leaderboard', slug: parts[1] };
  }
  if (parts[0] === 'bounty' && parts[1]) return { name: 'bounty', slug: parts[1] };
  if (parts[0] === 'u' && parts[1]) return { name: 'profile', handle: parts[1] };
  return { name: 'board' };
}

async function renderRoute() {
  window.__shotReady = false;
  const route = readRoute();
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (route.name === 'board') a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (route.name !== 'board') document.title = 'make.fun bounties';
  app.innerHTML = '<p class="loading" aria-busy="true">Loading…</p>';
  say('');
  try {
    if (route.name === 'bounty') await showBounty(route.slug);
    else if (route.name === 'leaderboard') await showLeaderboard(route.slug);
    else if (route.name === 'profile') await showProfile(route.handle);
    else { document.title = 'make.fun bounties'; await showBoard(); }
    stampUpdated();
  } catch (err) {
    app.innerHTML = errorCard(err.message || 'Something went wrong loading this page.');
    const retry = document.getElementById('retry');
    if (retry) retry.addEventListener('click', renderRoute);
    say('Could not load the data. Check your connection and try again.');
  }
  hideBrokenImages(app);
  await waitForImages();
  window.__shotReady = true;
}

window.addEventListener('hashchange', () => {
  lbPage = 1;
  renderRoute();
});

refreshBtn.addEventListener('click', async () => {
  dropCache();
  say('Refreshing…');
  await renderRoute();
  say('');
});

renderRoute();
