// Entrypoint for the makefun-frontend-01 bounty (Node 22, stdlib only).
//
// The frontend lives in app/ as plain static files — index.html, a handful
// of small ES modules and one stylesheet, no build step — and reads make.fun's
// public API (https://make.fun/api, GET only, no sign-in). This program is
// the hand-in step: it copies app/ and screenshots/ next to this file into
// the output directory and writes dossier.json there with the kit's vendored
// library, so the judge can read the screenshots, the first-load bytes and
// the source. vendor/makefun-frontend.ts must stay byte-for-byte as shipped:
// the scorer rebuilds the dossier with its own copy and compares.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (In the grader, MAKEFUN_OUTPUT_DIR is unset and the output is /output.)
// Serve the app itself with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Caps from the kit's reference/gate.json. text_max_bytes shapes the
// dossier text; the rest refuse anything the scorer would refuse anyway:
// at most 3 screenshots of 256 KiB, at most 993 files/dirs in app/ totalling
// 16 MiB (app/ shares /output's own 1000-entry cap with screenshots/ and
// dossier.json).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

function handIn(repoDir, outDir) {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });
  const shots = join(repoDir, 'screenshots');
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(shots)) cpSync(shots, join(outDir, 'screenshots'), { recursive: true });
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));
  console.log(`Wrote ${outDir}/dossier.json`);
}

handIn(fileURLToPath(new URL('.', import.meta.url)), process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
