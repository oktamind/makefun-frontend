// A make.fun frontend: board, bounty page, leaderboard and profile, on hash routes.
//   #/                              the bounty board (live pots, fees, time left)
//   #/bounty/<slug>                 one bounty: rewards, dates, rules
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/u/<handle>                    an account's public profile
// The header stays put; only #app is re-rendered, so switching views never
// rebuilds the page. window.__shotReady is false while a view loads and true
// once its live data is on screen, so a screenshot script knows when to capture.

import { cacheSize, dropCached, getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, leaderboard, profile } from './views.js';

const app = document.getElementById('app');

const state = { sort: 'closing', filter: 'open', query: '', page: 1, shown: 25 };
let boardData = null;
let boardRoute = '';
let current = '';

function errorView(message) {
  return `<h1>Could not load this view</h1><p>${message}</p><p><a href="#/">Back to the board</a></p>`;
}

function route() {
  const hash = location.hash || '#/';
  const bountyMatch = hash.match(/^#\/bounty\/([^/]+)(?:\/leaderboard)?$/);
  const boardMatch = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
  const profileMatch = hash.match(/^#\/u\/([^/]+)$/);
  if (boardMatch) return { view: 'leaderboard', slug: decodeURIComponent(boardMatch[1]) };
  if (bountyMatch) return { view: 'bounty', slug: decodeURIComponent(bountyMatch[1]) };
  if (profileMatch) return { view: 'profile', handle: decodeURIComponent(profileMatch[1]) };
  return { view: 'board' };
}

async function render() {
  const r = route();
  current = `${r.view}:${r.slug ?? r.handle ?? ''}`;
  window.__shotReady = false;
  app.innerHTML = '<p class="loading">Loading live data from make.fun…</p>';
  try {
    if (r.view === 'board') {
      boardData = await getBounties();
      boardRoute = current;
      document.title = 'make.fun bounties';
      app.innerHTML = board(boardData, state);
    } else if (r.view === 'bounty') {
      const b = await getBounty(r.slug);
      document.title = `${b.title} | make.fun bounties`;
      app.innerHTML = bounty(b);
    } else if (r.view === 'leaderboard') {
      const lb = await getLeaderboard(r.slug);
      document.title = `${lb.competition?.title ?? r.slug} leaderboard | make.fun bounties`;
      app.innerHTML = leaderboard(lb, state.shown);
    } else {
      const p = await getProfile(r.handle);
      document.title = `@${p.handle} | make.fun bounties`;
      app.innerHTML = profile(p);
    }
  } catch (error) {
    document.title = 'make.fun bounties';
    app.innerHTML = errorView(
      error.status === 404
        ? 'Nothing here: that bounty or account does not exist.'
        : 'make.fun did not answer. Check your connection and try Refresh.',
    );
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

/** Board controls re-render from the cached list: no second fetch, no page rebuild. */
function rerenderBoard() {
  if (current === boardRoute && boardData) app.innerHTML = board(boardData, state);
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'page') {
    state.page = Number(button.dataset.page);
    rerenderBoard();
  } else if (action === 'filter') {
    state.filter = button.dataset.filter;
    state.page = 1;
    rerenderBoard();
  } else if (action === 'more') {
    state.shown += 25;
    render();
  } else if (action === 'refresh') {
    dropCached('/competitions?status=open&activity=times');
    boardData = null;
    render();
  }
});

app.addEventListener('change', (event) => {
  const field = event.target.closest('[data-action="sort"]');
  if (!field) return;
  state.sort = field.value;
  state.page = 1;
  rerenderBoard();
});

app.addEventListener('input', (event) => {
  const field = event.target.closest('[data-action="query"]');
  if (!field) return;
  state.query = field.value;
  state.page = 1;
  rerenderBoard();
});

document.getElementById('profile-search').addEventListener('submit', (event) => {
  event.preventDefault();
  const handle = new FormData(event.target).get('handle').trim().replace(/^@/, '');
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

window.addEventListener('hashchange', render);
render();
