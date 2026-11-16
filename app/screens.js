// The four surfaces, each a pure function from API data to HTML strings.
// No event handling here and no network calls: boot.js owns state, routing
// and the listeners; these functions only turn data into markup.

import { apiUrl } from './client.js';
import { renderMd } from './md.js';
import {
  byteWords, clockOnly, dayOnly, deadlineKind, entryWords, esc, initials,
  ratePct, remaining, stamp, usd, whole,
} from './text.js';

/** The reward as it stands now: the live pot when there is one, else the base. */
export function livePot(b) {
  return usd(b.potUsd ?? b.rewardAmount);
}

/** "Free entry" or the fee, e.g. "$0.50 entry fee". */
export function feeWords(b) {
  return b.entryFeeUsd ? `${usd(b.entryFeeUsd)} entry fee` : 'Free entry';
}

function statePill(b) {
  const kind = deadlineKind(b.deadline);
  if (kind === 'open') return '<span class="pill open">Open</span>';
  if (kind === 'soon') return '<span class="pill soon">Closing soon</span>';
  return '<span class="pill ended">Ended</span>';
}

function skillTags(b) {
  const seen = new Set([(b.category || '').toLowerCase()]);
  return (b.skills || [])
    .filter((s) => !seen.has(String(s).toLowerCase()) && seen.add(String(s).toLowerCase()))
    .slice(0, 4)
    .map((s) => `<span class="chip">${esc(s)}</span>`)
    .join('');
}

/**
 * An avatar: initials behind the image, so a failed image still shows
 * something readable. crossorigin comes before src, as the API's images need.
 */
export function avatarImg(handle, image, big) {
  const src = image ? apiUrl(image) : '';
  const img = src
    ? `<img class="avatar-img" crossorigin="anonymous" src="${esc(src)}" alt="" loading="lazy" width="32" height="32">`
    : '';
  return `<span class="avatar${big ? ' big' : ''}" aria-hidden="true">${esc(initials(handle))}${img}</span>`;
}

const bountyHref = (slug) => `#/bounty/${encodeURIComponent(slug)}`;

/* ---------------- the board ---------------- */

export function boardHeader(totals) {
  return `<div class="board-head"><h1>Open bounties</h1>
    <p class="totals"><strong>${whole(totals.open)}</strong> open &middot; <strong>${usd(totals.pot)}</strong> live pot &middot; <strong>${whole(totals.entries)}</strong> entries &middot; <strong>${whole(totals.soon)}</strong> closing in 24h</p>
  </div>`;
}

export function boardFilters(state) {
  return `<form class="controls" id="board-controls" role="search" aria-label="Filter bounties">
    <div><label for="q">Search</label>
    <input type="search" id="q" name="q" value="${esc(state.q)}" placeholder="Title, skill or category" autocomplete="off"></div>
    <div><label for="sort">Sort</label>
    <select id="sort" name="sort">
      <option value="closing"${state.sort === 'closing' ? ' selected' : ''}>Closing soonest</option>
      <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Biggest pot</option>
      <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
      <option value="newest"${state.sort === 'newest' ? ' selected' : ''}>Newest</option>
    </select></div>
    <div><label for="filter">Show</label>
    <select id="filter" name="filter">
      <option value="all"${state.filter === 'all' ? ' selected' : ''}>All bounties</option>
      <option value="open"${state.filter === 'open' ? ' selected' : ''}>Open</option>
      <option value="soon"${state.filter === 'soon' ? ' selected' : ''}>Closing in 24h</option>
      <option value="ended"${state.filter === 'ended' ? ' selected' : ''}>Ended</option>
    </select></div>
  </form>`;
}

export function boardCards(items) {
  if (!items.length) return '<p class="empty">No bounties match. Try a different search or filter.</p>';
  const rows = items.map((b) => `
    <li class="card">
      <div class="meta">${statePill(b)}<span class="chip">${esc(b.category || '')}</span>${skillTags(b)}</div>
      <h2><a href="${bountyHref(b.slug)}">${esc(b.title)}</a></h2>
      <p class="summary">${esc(b.summary || b.description || '')}</p>
      <div class="stats">
        <span class="stat"><span class="k">Live pot</span><span class="v pot">${livePot(b)}</span></span>
        <span class="stat"><span class="k">Entry fee</span><span class="v">${feeWords(b)}</span></span>
        <span class="stat"><span class="k">Time left</span><span class="v" data-deadline="${esc(b.deadline)}">${remaining(b.deadline)}</span></span>
        <span class="stat"><span class="k">Entries</span><span class="v">${whole(b.submissionCount)}</span></span>
      </div>
    </li>`).join('');
  return `<ul class="cards">${rows}</ul>`;
}

/* ---------------- one bounty ---------------- */

function rewardRows(b) {
  const now = b.rewardsNow;
  if (Array.isArray(now) && now.length) {
    const rows = now.map((r) => `<tr><td>${whole(r.place)}</td><td>${usd(r.baseUsd)}</td><td>${usd(r.feeShareUsd)}</td><td>${usd(r.amountUsd)}</td></tr>`).join('');
    return `<table class="rewards"><thead><tr><th scope="col">Place</th><th scope="col">Base reward</th><th scope="col">Fee share</th><th scope="col">Total now</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  const map = b.rewards || {};
  const places = Object.keys(map).map(Number).sort((a, c) => a - c);
  if (!places.length) return '<p>No reward table published yet.</p>';
  const rows = places.map((p) => `<tr><td>${whole(p)}</td><td colspan="2">—</td><td>${usd(map[String(p)])}</td></tr>`).join('');
  return `<table class="rewards"><thead><tr><th scope="col">Place</th><th scope="col" colspan="2">Base reward</th><th scope="col">Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function bountyDetail(b) {
  const kind = deadlineKind(b.deadline);
  const taking = kind !== 'ended' && b.acceptingSubmissions !== false;
  const subs = Array.isArray(b.submissions) ? b.submissions : [];
  return `
  <p class="crumb"><a href="#/">All bounties</a> &rsaquo; ${esc(b.category || 'Bounty')}</p>
  <h1>${esc(b.title)}</h1>
  <p>${statePill(b)} <span class="chip">${taking ? 'Taking entries' : 'Not taking entries'}</span></p>
  <p>${esc(b.summary || '')}</p>
  <div class="facts">
    <div class="fact"><div class="k">Live pot</div><div class="v pot">${livePot(b)}</div><div class="s">base ${usd(b.rewardAmount)} + entry fees</div></div>
    <div class="fact"><div class="k">Entry fee</div><div class="v">${b.entryFeeUsd ? usd(b.entryFeeUsd) : 'Free'}</div><div class="s">${b.entryFeePayers ? `${whole(b.entryFeePayers)} paid in` : ''}</div></div>
    <div class="fact"><div class="k">Entries</div><div class="v">${whole(b.submissionCount)}</div><div class="s">${subs.length ? `${Math.min(subs.length, 10)} latest shown below` : ''}</div></div>
    <div class="fact"><div class="k">Deadline</div><div class="v" data-deadline="${esc(b.deadline)}">${remaining(b.deadline)}</div><div class="s">${stamp(b.deadline)}</div></div>
    <div class="fact"><div class="k">Opened</div><div class="v">${dayOnly(b.publishedAt)}</div><div class="s">${clockOnly(b.publishedAt)}</div></div>
    <div class="fact"><div class="k">Sponsor</div><div class="v">${esc(b.sponsor?.name || '—')}</div><div class="s">${esc((b.skills || []).join(' · '))}</div></div>
  </div>
  <p><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard &rarr;</a></p>
  <h2>Rewards</h2>
  ${rewardRows(b)}
  <h2>Description</h2>
  <div class="md">${renderMd(b.description)}</div>
  ${b.rules ? `<h2>Rules</h2><div class="md">${renderMd(b.rules)}</div>` : ''}
  ${subs.length ? `<h2>Latest entries</h2><ul class="solutions">${subs.slice(0, 10).map((s) => `
    <li class="solution">
      <div><h3>${esc(s.title || s.id)}</h3>
      <p class="sub">by <a href="#/u/${encodeURIComponent(s.hunter)}">${esc(s.hunter)}</a> &middot; ${esc(s.status || '')} &middot; ${stamp(s.createdAt)}</p></div>
    </li>`).join('')}</ul>` : ''}`;
}

/* ---------------- leaderboard ---------------- */

export const LB_PAGE_SIZE = 25;

export function leaderboardDetail(data, slug, page) {
  const rows = data.entries || [];
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / LB_PAGE_SIZE));
  const safe = Math.min(Math.max(1, page), pages);
  const slice = rows.slice((safe - 1) * LB_PAGE_SIZE, safe * LB_PAGE_SIZE);
  const comp = data.competition || {};
  const cells = slice.map((r) => {
    const v = r.values || {};
    const d = r.display || {};
    return `<tr>
      <td class="num">${whole(r.rank)}</td>
      <td><span class="entrant">${avatarImg(r.handle, r.image)}<span class="who"><a class="handle" href="#/u/${encodeURIComponent(r.handle)}">${esc(r.handle)}</a><span class="title">${esc(r.title || '')}</span></span></span></td>
      <td class="num">${ratePct(v.judge)}</td>
      <td class="num">${ratePct(v.judge_low)} – ${ratePct(v.judge_high)}</td>
      <td class="num">${whole(r.prize_rank)}</td>
      <td class="num">${d.valid ?? v.valid ?? '—'}</td>
      <td class="num">${byteWords(v.bytes)}</td>
    </tr>`;
  }).join('');
  const nums = [];
  for (let p = 1; p <= pages; p++) {
    if (pages > 7 && p !== 1 && p !== pages && Math.abs(p - safe) > 1) {
      if (nums[nums.length - 1] !== '…') nums.push('…');
      continue;
    }
    nums.push(p);
  }
  const pager = pages > 1 ? `<nav class="pager" aria-label="Leaderboard pages">
    <button type="button" data-page="${safe - 1}"${safe <= 1 ? ' disabled' : ''}>&larr; Prev</button>
    ${nums.map((p) => (p === '…'
      ? '<span aria-hidden="true">…</span>'
      : `<button type="button" data-page="${p}"${p === safe ? ' aria-current="page"' : ''}>${p}</button>`)).join('')}
    <button type="button" data-page="${safe + 1}"${safe >= pages ? ' disabled' : ''}>Next &rarr;</button>
    <span class="of">Showing ${(safe - 1) * LB_PAGE_SIZE + 1}–${Math.min(safe * LB_PAGE_SIZE, total)} of ${whole(total)}</span>
  </nav>` : `<p class="of">Showing ${whole(total)} ${total === 1 ? 'entry' : 'entries'}</p>`;
  return `
  <p class="crumb"><a href="#/">All bounties</a> &rsaquo; <a href="#/bounty/${encodeURIComponent(slug)}">${esc(comp.title || slug)}</a></p>
  <h1>${esc(comp.title || slug)} — leaderboard</h1>
  <p class="totals">${esc(data.title || 'Results')} &middot; phase ${esc(data.phase?.title || data.phase?.key || '')} &middot; ${esc(data.view || '')} view</p>
  ${total ? `<div class="table-wrap"><table class="grid">
    <thead><tr><th scope="col" class="num">Rank</th><th scope="col">Entrant</th><th scope="col" class="num">Win rate</th><th scope="col" class="num">90% interval</th><th scope="col" class="num">Prize rank</th><th scope="col" class="num">Valid</th><th scope="col" class="num">Size</th></tr></thead>
    <tbody>${cells}</tbody></table></div>${pager}`
    : '<p class="empty">No entries on the leaderboard yet.</p>'}`;
}

/* ---------------- profile ---------------- */

export function profileDetail(p) {
  const r = p.record || {};
  const sols = Array.isArray(p.solutions) ? p.solutions : [];
  const links = [];
  if (p.github_login) links.push(`<li><a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub</a></li>`);
  if (p.discord) links.push(`<li>Discord: ${esc(p.discord)}</li>`);
  if (p.x) links.push(`<li><a href="https://x.com/${encodeURIComponent(p.x)}">X</a></li>`);
  if (p.wallet?.address) links.push(`<li><a href="${esc(p.wallet.explorer_url || `https://solscan.io/account/${p.wallet.address}`)}">Wallet</a></li>`);
  return `
  <p class="crumb"><a href="#/">All bounties</a></p>
  <div class="profile-top">
    ${avatarImg(p.handle, p.image || p.avatar, true)}
    <div>
      <h1>${esc(p.display_name || p.handle)}</h1>
      <p class="chip">@${esc(p.handle)} &middot; joined ${stamp(p.joined_at)}</p>
      ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
      ${links.length ? `<ul class="links">${links.join('')}</ul>` : ''}
    </div>
  </div>
  <div class="facts">
    <div class="fact"><div class="k">Entered</div><div class="v">${whole(r.competitions_entered)}</div></div>
    <div class="fact"><div class="k">Placed</div><div class="v">${whole(r.competitions_placed)}</div></div>
    <div class="fact"><div class="k">Won</div><div class="v">${whole(r.competitions_won)}</div></div>
    <div class="fact"><div class="k">Podiums</div><div class="v">${whole(r.podium_finishes)}</div></div>
    <div class="fact"><div class="k">Best placement</div><div class="v">${r.best_placement ? `#${whole(r.best_placement)}` : '—'}</div></div>
    <div class="fact"><div class="k">Prize money</div><div class="v">${usd(r.prize_usd)}</div></div>
  </div>
  <h2>Entries (${whole(sols.length)})</h2>
  ${sols.length ? `<ul class="solutions">${sols.map((s) => {
    const thumb = s.artifact?.preview_url || s.artifact?.url;
    const img = thumb ? `<img class="thumb" crossorigin="anonymous" src="${esc(apiUrl(thumb))}" alt="" loading="lazy" width="72" height="72">` : '';
    return `<li class="solution">${img}<div>
      <h3>${esc(s.title || s.submission_id)}</h3>
      <p class="sub"><a href="#/bounty/${encodeURIComponent(s.competition?.slug || '')}">${esc(s.competition?.title || s.competition?.slug || '')}</a>
      &middot; place #${whole(s.placement)}${s.prize_usd ? ` &middot; ${usd(s.prize_usd)}` : ''}${s.score?.display ? ` &middot; score ${esc(s.score.display)}` : ''}</p>
    </div></li>`;
  }).join('')}</ul>` : '<p class="empty">No entries yet.</p>'}`;
}

/** A one-line error view with a retry button. */
export function errorCard(message) {
  return `<div class="error" role="alert"><p>${esc(message)}</p><button type="button" id="retry" class="btn">Try again</button></div>`;
}
