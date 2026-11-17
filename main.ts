// makefun-frontend-01 entry (Node 22, standard library only).
//
// The entry is a static frontend: app/ holds index.html plus the ES modules,
// CSS and images it loads — no build step, no framework. It reads only
// make.fun's public API (https://make.fun/api, GET) and renders the bounty
// board, a bounty page, its leaderboard and a public profile, each on its own
// hash route. screenshots/ holds three real renders of the running app on live
// data; the first by name is the cover.
//
// This program hands the entry in: it copies app/ and screenshots/ from
// beside this file into /output and writes /output/dossier.json with
// buildDossier from the kit's vendored library (vendor/makefun-frontend.ts,
// unchanged — the scorer rebuilds the dossier with its own copy and compares
// the two byte for byte, so the vendored file must stay exactly as shipped).
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program runs twice in the grader and both runs must write identical bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps from the gate: at most 3 screenshots, each at most 256 KiB;
// app/ at most 993 files and directories and 16 MiB; the dossier text at most
// 160 KiB. buildDossier refuses anything past them, with its own words.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 3, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);
