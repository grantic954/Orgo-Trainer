# Orgo 2 Trainer

Personal Organic Chemistry 2 practice app: structure drawing (Ketcher), deterministic grading (RDKit), generated IR / ¹H NMR / ¹³C NMR + DEPT / MS spectra, and an AI tutor with a tiered hint ladder.

Full plan lives in [`CLAUDE.md`](./CLAUDE.md).

## Phase status

- [x] **Phase 0** — Scaffold (Next.js + TS + Tailwind, Vitest + Playwright, §11 file skeleton).
- [x] **Phase 1** — Chemistry core (RDKit.js, `StructureView`, `grade.ts`, 10-molecule demo).
- [x] **Phase 2** — Drawing (Ketcher `StructureEditor`, benzoic-acid demo).
- [x] **Phase 3** — Question engine + MCQ + trap detector + 30 seed questions.
- [x] **Phase 4** — Spectra (IR, ¹H, ¹³C+DEPT, MS) and `/sandbox`.
- [x] **Phase 5** — AI tutor (`/api/tutor`, hint ladder, `<mol>` rendering, HintPanel + TutorChat wired into QuestionCard).
- [x] **Phase 6** — Progress + FSRS SRS + dashboard + Practice/Exam/Drill/Mistakes modes.
- [x] **Phase 7** — 103 seed questions across every core topic + reaction-template generator (10 reactions, 29 substrates, `/api/generate`).
- [x] **Phase 8** — MechanismCanvas + 5 seed mechanisms at `/mechanism`.
- [x] **Phase 9** — Reagent flashcards (`/reagents`), reaction roadmap (`/roadmap`), deploy notes (see below).

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import it on [vercel.com/new](https://vercel.com/new).
3. Set the environment variable **`ANTHROPIC_API_KEY`** on the Vercel project (Production + Preview). Everything else is zero-config.
4. First deploy will take a few minutes while Vercel downloads the RDKit WASM and installs Ketcher's peer deps.

### Gotchas

- **Turbopack + `ketcher-core` → `paper.js` → `jsdom`**: paper.js's `dist/node/canvas.js` statically requires `jsdom` for Node contexts. Browser builds normally skip it via paper's `browser` package.json field map, but Turbopack doesn't honor that map. `next.config.ts` aliases `jsdom`, `jsdom/lib/jsdom/living/generated/utils`, and `canvas` to a local empty shim (`shims/empty.js`). Don't delete those.
- **React Strict Mode is disabled** (`reactStrictMode: false`). Ketcher's module-scope `ketcherProvider` keeps a map of mounted instances by id; Strict Mode's dev-only double-mount orphaned instance references and threw `"couldn't find ketcher instance N"`. Prod builds never double-mount.
- **RDKit WASM** (`public/RDKit_minimal.wasm`, ~7 MB) is committed and served from `/public`. `scripts/copy-rdkit-wasm.mjs` keeps it in sync with the npm package on every `npm install`.
- **The API key** must stay server-side. `/api/tutor` reads `ANTHROPIC_API_KEY` from env; it is never bundled into the client.

## Getting started

```bash
npm install
cp .env.example .env.local        # paste your ANTHROPIC_API_KEY when Phase 5 lands
npm run dev                       # http://localhost:3000
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests + question-bank validator |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:ui` | Vitest browser UI |
| `npm run e2e` | Playwright E2E tests |
| `npm run validate` | Validate `data/questions/*.json` with RDKit |

## Engineering rules (see §2 of CLAUDE.md)

1. Grading is deterministic — RDKit, never the LLM.
2. Every question file is validated (`npm run validate`) in CI.
3. LLM-generated SMILES are always parsed by RDKit before use.
4. `ANTHROPIC_API_KEY` stays server-side.
5. Heavy chem libs (Ketcher, RDKit WASM) are lazy-loaded.
6. Grader and spectrum generators get unit tests before UI.
7. Mobile works for MCQ + spectra; drawing is desktop-first.
