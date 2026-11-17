// The first-load surfaces: the board and one bounty page. The two heavier
// surfaces (leaderboard, profile) live in views-extra.js and are imported on
// demand by main.js, so the board never pays for them. A bounty past its
// deadline is shown as closed even when its status still reads open: the
// deadline decides.

import { date, esc, money, num, paragraphs, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
export const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** True while a bounty still takes entries: deadline ahead (status alone lies). */
export const takesEntries = (b) => new Date(b.deadline).getTime() > Date.now();

const feeLabel = (b) => (b.entryFeeUsd != null ? `${money(b.entryFeeUsd)} fee` : 'Free entry');

const statusBadge = (b) =>
  takesEntries(b) ? '<span class="badge open">Open for entries</span>' : '<span class="badge closed">Entries closed</span>';

/** Sort + filter + paginate the board in memory: the list is fetched once and cached (api.js). */
export function board(data, state) {
  const items = (data.items ?? []).slice();
  const query = state.query.trim().toLowerCase();
  let rows = items.filter((b) => !query || `${b.title} ${b.slug}`.toLowerCase().includes(query));
  if (state.filter === 'open') rows = rows.filter(takesEntries);
  const sorts = {
    closing: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
    entries: (a, b) => b.submissionCount - a.submissionCount,
  };
  rows.sort(sorts[state.sort] ?? sorts.closing);
  const perPage = 12;
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const page = Math.min(state.page, pages);
  const shown = rows.slice((page - 1) * perPage, page * perPage);
  const row = (b) => `
      <li class="card">
        <h2><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h2>
        <p class="meta"><strong>${pot(b)}</strong> live pot · ${feeLabel(b)}</p>
        <p class="meta">${timeLeft(b.deadline)} · ends ${date(b.deadline)}</p>
        <p class="meta">${num(b.submissionCount)} ${b.submissionCount === 1 ? 'entry' : 'entries'} · ${statusBadge(b)}</p>
        <p><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard →</a></p>
      </li>`;
  return `
    <h1>Open bounties</h1>
    <p class="lede">${num(rows.length)} ${rows.length === 1 ? 'bounty' : 'bounties'} · pots include entry fees paid in · updated live from make.fun</p>
    <div class="controls" role="group" aria-label="Board controls">
      <label>Sort
        <select data-action="sort">
          <option value="closing"${state.sort === 'closing' ? ' selected' : ''}>Closing soonest</option>
          <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Biggest pot</option>
          <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
        </select>
      </label>
      <button type="button" data-action="filter" data-filter="open"${state.filter === 'open' ? ' aria-pressed="true" class="on"' : ''}>Taking entries</button>
      <button type="button" data-action="filter" data-filter="all"${state.filter === 'all' ? ' aria-pressed="true" class="on"' : ''}>All incl. ended</button>
      <label>Search <input type="search" data-action="query" value="${esc(state.query)}" placeholder="title or slug"></label>
      <button type="button" data-action="refresh">Refresh ↻</button>
    </div>
    ${rows.length ? `<ul class="board">${shown.map(row).join('')}</ul>` : '<p class="note">No bounties match — clear the search or show all, including ended ones.</p>'}
    <p class="pager">Page ${page} of ${pages}
      ${page > 1 ? `<button type="button" data-action="page" data-page="${page - 1}">← Prev</button>` : ''}
      ${page < pages ? `<button type="button" data-action="page" data-page="${page + 1}">Next →</button>` : ''}
    </p>`;
}

/** One bounty: summary, live rewards table, dates, description and rules. */
export function bounty(b) {
  const rewards = (b.rewardsNow ?? []).map(
    (r) => `<tr><td>${r.place}</td><td>${money(r.baseUsd)}</td><td>${money(r.feeShareUsd)}</td><td><strong>${money(r.amountUsd)}</strong></td></tr>`,
  );
  return `
    <p><a href="#/">← All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? '')}</p>
    <p>${statusBadge(b)}</p>
    <dl class="facts">
      <dt>Live pot</dt><dd><strong>${pot(b)}</strong>${b.entryFeesUsd && Number(b.entryFeesUsd) > 0 ? ` (includes ${money(b.entryFeesUsd)} in entry fees)` : ''}</dd>
      <dt>Entry fee</dt><dd>${b.entryFeeUsd != null ? money(b.entryFeeUsd) : 'None'}</dd>
      <dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd>
      <dt>Opens</dt><dd>${date(b.publishedAt ?? b.opensAt)}</dd>
      <dt>Entries</dt><dd>${num(b.submissionCount)}</dd>
      <dt>Category</dt><dd>${esc(b.category ?? '—')}${b.skills?.length ? ` · ${b.skills.map(esc).join(', ')}` : ''}</dd>
      <dt>Sponsor</dt><dd>${esc(b.sponsor?.name ?? '—')}</dd>
    </dl>
    <p><a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View leaderboard →</a>
       <a class="button ghost" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun ↗</a></p>
    ${rewards.length ? `<h2>Rewards now</h2><table><thead><tr><th>Place</th><th>Prize</th><th>Fee share</th><th>Total</th></tr></thead><tbody>${rewards.join('')}</tbody></table>` : ''}
    <h2>About</h2>
    <div class="prose">${paragraphs(b.description)}</div>
    ${b.rules ? `<details><summary>Full rules</summary><div class="prose">${paragraphs(b.rules)}</div></details>` : ''}`;
}
