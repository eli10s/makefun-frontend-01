// The app's only network layer: read-only GETs against make.fun's public API.
// Answers are cached in memory and revalidated with ETags. The API's ETags
// are bound to the minute, so a revalidation inside the same minute answers
// 304 and the cached body is reused at almost no cost.

const ORIGIN = 'https://make.fun';
const API = `${ORIGIN}/api`;

// A cached answer counts as fresh for this long; older answers revalidate.
const FRESH_MS = 60 * 1000;

// path -> { body, etag, at }
const store = new Map();
// path -> promise already in flight, so parallel views share one request.
const flying = new Map();

/** Turn an API path (or a root-relative image path the API returned) into a URL. */
export function apiUrl(path) {
  if (typeof path !== 'string' || !path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/api/')) return ORIGIN + path;
  return API + path;
}

/** GET one JSON path, cached and ETag-revalidated. Returns the parsed body. */
export async function apiGet(path) {
  const hit = store.get(path);
  const now = Date.now();
  if (hit && now - hit.at < FRESH_MS) return hit.body;
  if (flying.has(path)) return flying.get(path);

  const job = (async () => {
    const headers = { accept: 'application/json' };
    if (hit && hit.etag) headers['if-none-match'] = hit.etag;
    let res;
    try {
      res = await fetch(apiUrl(path), { headers });
    } catch (cause) {
      throw new Error(`Could not reach make.fun (${cause.message})`);
    }
    if (res.status === 304 && hit) {
      hit.at = Date.now();
      return hit.body;
    }
    if (!res.ok) {
      const err = new Error(`make.fun answered ${res.status} for ${path}`);
      err.status = res.status;
      throw err;
    }
    const body = await res.json();
    store.set(path, { body, etag: res.headers.get('etag'), at: Date.now() });
    return body;
  })();

  flying.set(path, job);
  try {
    return await job;
  } finally {
    flying.delete(path);
  }
}

/** Drop every cached answer, so the next view fetches fresh. */
export function dropCache() {
  store.clear();
}

/** The open bounties: { items: [...], next_cursor }. */
export const fetchBoard = () => apiGet('/competitions?status=open&activity=times');

/** One bounty, by slug. */
export const fetchBounty = (slug) => apiGet(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { entries: [...], competition, ... }. */
export const fetchLeaderboard = (slug) => apiGet(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile, by handle. */
export const fetchProfile = (handle) => apiGet(`/profiles/${encodeURIComponent(handle)}`);
