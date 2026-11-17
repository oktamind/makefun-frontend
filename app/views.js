// The four surfaces, each a function from live API data to HTML.
// Board, bounty page, leaderboard and profile — every one reachable by a link
// and by its own hash route (see main.js). A bounty past its deadline is shown
// as closed even when its status still reads open: the deadline decides.

import { bytes, date, esc, money, num, paragraphs, rate, timeLeft } from './format.js';

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
    <ul class="board">${shown.map(row).join('')}</ul>
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

/** A leaderboard row, whole (entries) or light (rest): same columns either way. */
function leaderRow(e) {
  const judge = e.values?.judge ?? e.value;
  const low = e.values?.judge_low ?? e.interval?.low;
  const high = e.values?.judge_high ?? e.interval?.high;
  const size = e.values?.bytes;
  return `<tr>
      <td>${e.rank ?? e.prize_rank ?? '—'}</td>
      <td><a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>${e.house ? ' <span class="badge">house</span>' : ''}</td>
      <td>${esc(e.title ?? '')}</td>
      <td><strong>${rate(judge)}</strong></td>
      <td>${rate(low)} – ${rate(high)}</td>
      <td>${size != null ? bytes(size) : '—'}</td>
      <td>${e.values?.valid ?? (e.judged ? '1' : '—')}</td>
    </tr>`;
}

/** A bounty's leaderboard: top rows whole, the rest paged in without a reload. */
export function leaderboard(lb, shown) {
  const entries = lb.entries ?? [];
  const rest = lb.rest ?? [];
  const all = entries.concat(rest);
  const visible = all.slice(0, shown);
  const phase = lb.phase ?? {};
  return `
    <p><a href="#/bounty/${encodeURIComponent(lb.competition?.slug ?? '')}">← ${esc(lb.competition?.title ?? 'Bounty')}</a></p>
    <h1>${esc(lb.competition?.title ?? '')} — leaderboard</h1>
    <p class="lede">${esc(phase.title ?? '')} phase · judge win rate with its 90% interval · ${num(all.length)} ranked entries shown of a larger field</p>
    <table>
      <thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th>Judge rate</th><th>Interval</th><th>Size</th><th>Valid</th></tr></thead>
      <tbody>${visible.map(leaderRow).join('')}</tbody>
    </table>
    ${all.length > shown ? `<p><button type="button" data-action="more">Show ${Math.min(25, all.length - shown)} more (${num(all.length - shown)} left)</button></p>` : ''}
    <p class="note">Rates are provisional during development: each entry is judged against the house frontends only. The final heat re-judges every entry afresh.</p>`;
}

/** An account's public profile: links, record and public solutions. */
export function profile(p) {
  const record = p.record ?? {};
  const solutions = (p.solutions ?? []).map(
    (s) => `<tr>
      <td><a href="https://make.fun/s/${encodeURIComponent(s.submission_id)}">${esc(s.title)}</a></td>
      <td><a href="#/bounty/${encodeURIComponent(s.competition?.slug ?? '')}">${esc(s.competition?.title ?? '')}</a></td>
      <td>${s.score ? rate(s.score.value) : '—'}</td>
      <td>${s.placement ? `#${s.placement}` : '—'}</td>
      <td>${date(s.entered_at)}</td>
    </tr>`,
  );
  return `
    <div class="profile-head">
      ${p.image ? `<img crossorigin="anonymous" src="${esc(p.image)}" alt="" width="96" height="96" loading="lazy">` : ''}
      <div>
        <h1>${esc(p.display_name ?? p.handle)}</h1>
        <p class="lede">@${esc(p.handle)} · joined ${date(p.joined_at)}</p>
        ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
      </div>
    </div>
    <p class="links">
      ${p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub @${esc(p.github_login)}</a>` : ''}
      ${p.x ? `<a href="${esc(p.x.url)}">X @${esc(p.x.username)}</a>` : ''}
      ${p.wallet ? `<a href="${esc(p.wallet.explorer_url)}">Wallet ${esc(p.wallet.address.slice(0, 8))}…</a>` : ''}
      <a href="https://make.fun/u/${encodeURIComponent(p.handle)}">Profile on make.fun ↗</a>
    </p>
    <dl class="facts">
      <dt>Entered</dt><dd>${num(record.competitions_entered)}</dd>
      <dt>Won</dt><dd>${num(record.competitions_won)}</dd>
      <dt>Placed</dt><dd>${num(record.competitions_placed)}</dd>
      <dt>Prize money</dt><dd>${money(record.prize_usd)}</dd>
    </dl>
    <h2>Solutions</h2>
    ${solutions.length ? `<table><thead><tr><th>Entry</th><th>Bounty</th><th>Score</th><th>Place</th><th>Entered</th></tr></thead><tbody>${solutions.join('')}</tbody></table>` : '<p>No public solutions yet.</p>'}`;
}
