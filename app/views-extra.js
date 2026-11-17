// The two heavier surfaces, loaded on demand: main.js imports this module
// only when the leaderboard or profile route opens, so the board's first load
// never pays for it. Same rendering as before the split — same markup, same
// live data, same __shotReady contract.

import { bytes, date, esc, money, num, rate } from './format.js';

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
