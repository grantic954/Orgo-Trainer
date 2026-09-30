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
- [ ] Phase 6 — Progress + SRS + dashboard + modes.
- [ ] Phase 7 — Content expansion + template generator.
- [ ] Phase 8 — Mechanisms.
- [ ] Phase 9 — Extras + deploy.

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
