// make.fun's public API: read-only GET requests, open to any origin (CORS).
// Full API: https://make.fun/api/openapi.json — docs: https://make.fun/llms.txt
// Every answer is cached and revalidated with its ETag: the API binds ETags to
// the minute, so an If-None-Match inside the same minute answers 304 and the
// cached copy is reused instead of downloading the board again.

const API = 'https://make.fun/api';

const cache = new Map();

export function cacheSize() {
  return cache.size;
}

export function dropCached(path) {
  cache.delete(path);
}

/** GET one API path, reusing the cached copy on a 304. Retries once on a 503 board_pending. */
async function cachedGet(path) {
  const hit = cache.get(path);
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) return hit.data;
  if (res.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return cachedGet(path);
  }
  if (!res.ok) {
    const error = new Error(`make.fun API ${res.status} for ${path}`);
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  cache.set(path, { data, etag: res.headers.get('ETag') });
  return data;
}

/** The board: open bounties with live pots, fees, deadlines and entry counts. */
export const getBounties = () => cachedGet('/competitions?status=open&activity=times');

/** One bounty, with its rules, live rewards table and dates (no submission list). */
export const getBounty = (slug) => cachedGet(`/competitions/${encodeURIComponent(slug)}?submissions=summary`);

/** A bounty's leaderboard: first 10 rows whole, the rest as light rows (?rows=first). */
export const getLeaderboard = (slug) => cachedGet(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first`);

/** An account's public profile: links, record and public solutions. */
export const getProfile = (handle) => cachedGet(`/profiles/${encodeURIComponent(handle)}`);
