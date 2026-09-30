# Orgo 2 Trainer — Build Plan for Claude Code

Drop this file in an empty repo as `CLAUDE.md` (Claude Code reads it automatically), then work through the phases in order. Paste the "Prompt" for each phase into Claude Code one at a time. Use plan mode (Shift+Tab) at the start of each phase so it proposes before it writes.

---

## 1. Product vision

A personal Organic Chemistry 2 practice app that:
- Serves questions across every Orgo 2 topic (list in §4).
- Renders real skeletal structures (never condensed formulas as the only representation).
- Lets me **draw** answers in a structure editor and grades them correctly (including stereochemistry).
- Generates **IR, ¹H NMR, ¹³C NMR (+DEPT), and mass spectra** as real interactive plots.
- Has an **AI tutor** that gives tiered hints and explains mistakes, without just handing over the answer.
- Tracks weak areas and resurfaces them (spaced repetition).

## 2. Non-negotiable engineering rules (Claude Code: follow these always)

1. **Grading is deterministic, never done by the LLM.** Structures are compared with RDKit: canonical SMILES / InChIKey. The AI explains; it does not decide right/wrong.
2. **Every structure in the question bank is validated by a script** (parses in RDKit, sanitizes, formula matches, answer ≠ starting material). CI fails if any question is invalid.
3. **Never trust LLM-generated SMILES without RDKit validation.** If the tutor or generator outputs a structure, parse it first; if it fails, regenerate or drop it.
4. Anthropic API key lives **server-side only** (API route / serverless function). Never in client code.
5. Heavy chem libraries (Ketcher, RDKit WASM) are **lazy-loaded** so the home page stays fast.
6. Write unit tests for the grader and spectrum generators before building UI on top of them.
7. Mobile-usable: multiple-choice and spectra must work on a phone; drawing can be desktop-first.

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | API routes for the AI tutor, easy Vercel deploy |
| Styling | Tailwind CSS | fast, consistent |
| Structure **drawing** | Ketcher (`ketcher-react` + `ketcher-standalone`) | Full editor: bonds, rings, wedges/dashes, charges, arrows. Apache-2.0 |
| Structure **rendering / logic** | RDKit.js (`@rdkit/rdkit`, WASM) | SVG depiction, canonical SMILES, InChIKey, substructure (SMARTS), reaction SMARTS. BSD |
| Alternative/fallback toolkit | OpenChemLib JS | Lighter; also has an editor and useful property calcs |
| Spectra plots | Plotly.js (react-plotly) | Zoom, hover, reversed x-axis for IR/NMR |
| NMR viewer (optional upgrade) | NMRium (React component) | Purpose-built NMR display, MIT |
| Local data | Dexie (IndexedDB) | Progress + spaced repetition, no backend needed at first |
| Accounts later (optional) | Supabase | Only if I want sync across devices |
| AI | Anthropic Messages API via `/api/tutor` route | Hints and explanations |
| Tests | Vitest + Playwright | Grader unit tests, E2E for question flow |
| Deploy | Vercel | Free tier is enough |

## 4. Topic coverage (Orgo 2 — trim/reorder to match my syllabus)

1. IR spectroscopy
2. Mass spectrometry (M⁺, M+1, M+2 for Cl/Br, common fragmentations, McLafferty)
3. ¹H NMR (shift, integration, splitting/n+1, diastereotopic H, exchangeable H)
4. ¹³C NMR + DEPT-90/135
5. Combined structure determination (formula → DoU → IR → MS → NMR → structure)
6. Conjugated systems: allylic stability, 1,2 vs 1,4 addition (kinetic vs thermodynamic), Diels–Alder (endo rule, stereo retention, regiochemistry), UV-Vis/λmax
7. Aromaticity: Hückel's rule, antiaromatic, heteroaromatics, frost circles/MO diagrams
8. Electrophilic aromatic substitution: halogenation, nitration, sulfonation, Friedel–Crafts (and its limitations), directing/activating effects, polysubstituted benzenes
9. Nucleophilic aromatic substitution (SNAr) and benzyne
10. Side-chain reactions: benzylic oxidation/bromination, Clemmensen/Wolff–Kishner, nitro reduction, diazonium (Sandmeyer)
11. Alcohols, phenols, ethers, epoxides (if not covered in Orgo 1), thiols
12. Aldehydes & ketones: hydrates, acetals (protecting groups), imines/enamines, Wittig, Grignard/organolithium, hydride reductions, Baeyer–Villiger, Wolff–Kishner
13. Carboxylic acids: acidity trends, preparation
14. Acid derivatives: nucleophilic acyl substitution, reactivity ladder, hydrolysis, Fischer esterification, reductions (LiAlH₄ vs DIBAL), Grignard + esters, nitriles
15. Alpha-carbon chemistry: keto–enol, enolates (LDA vs NaOEt; kinetic vs thermodynamic), alpha-halogenation, haloform, alkylation, aldol (crossed, intramolecular), Claisen/Dieckmann, malonic & acetoacetic ester synthesis, Michael, Robinson annulation, Stork enamine
16. Amines: basicity, synthesis (Gabriel, reductive amination), Hofmann elimination, diazonium salts
17. Carbohydrates (Fischer/Haworth, anomers, mutarotation, glycosides) — if on syllabus
18. Amino acids/peptides — if on syllabus
19. Pericyclic reactions (electrocyclic, sigmatropic, Woodward–Hoffmann) — if on syllabus
20. **Multistep synthesis & retrosynthesis** (cross-topic)

Store as `data/topics.json` with ids, names, and prerequisite links so the dashboard can show a topic map.

## 5. Question types

| Type | Input | Grading |
|---|---|---|
| Multiple choice (text or structure choices) | click | exact |
| Draw the product | Ketcher | canonical SMILES/InChIKey match; multiple acceptable answers allowed; major vs minor product tagging |
| Draw the starting material / fill in the missing reagent | Ketcher or reagent picker | same / reagent id match |
| Stereo-aware drawing | Ketcher | full match = correct; connectivity-only match = "right skeleton, check stereo" partial credit |
| Rank (acidity, basicity, reactivity, EAS rate) | drag to order | exact order |
| Mechanism arrows | click electron source → sink on rendered structure | compare to expected arrow list per step |
| Spectroscopy ID | IR/NMR/MS plots + formula → draw structure | structure match |
| Spectrum reading sub-questions | "which peak is the C=O?" click a peak | peak id match |
| Multistep synthesis | draw intermediate after each step | grade each step independently |
| Aromatic? / chirality / E-Z / count signals | click or number | exact (computed by RDKit where possible) |

### Question data schema (`data/questions/*.json`)
```json
{
  "id": "eas-021",
  "topic": "eas",
  "type": "draw_product",
  "difficulty": 2,
  "prompt": "Predict the major product.",
  "reactants": ["c1ccc(OC)cc1"],
  "reagents": ["Br2", "FeBr3"],
  "answers": [{ "smiles": "COc1ccc(Br)cc1", "label": "major (para)" }],
  "acceptable": [{ "smiles": "COc1ccccc1Br", "label": "ortho, minor", "credit": 0.5 }],
  "traps": [{ "smiles": "COc1cccc(Br)c1", "trap": "wrong-director", "note": "Treated OMe as a meta director" }],
  "concepts": ["ortho-para director", "activating group", "sterics"],
  "explanation": "OMe donates by resonance...",
  "source": "authored"
}
```

## 6. Structure grading (`lib/chem/grade.ts`)

1. Get the user's drawing from Ketcher as molfile → RDKit mol.
2. Sanitize; if it fails, return a friendly message ("valence error on a carbon").
3. Strip explicit H / normalize charges and tautomers only where the question says to.
4. Compare InChIKey (full) → correct. Compare first InChIKey block (connectivity only) → "stereo wrong" partial credit.
5. Check `acceptable` list for minor products / alternate answers.
6. If wrong, run diagnostics for the tutor: formula difference (e.g., "you have one extra CH₂"), missing/extra functional groups via SMARTS, regio mismatch (same formula, same groups, different position).

These diagnostics get passed to the AI tutor so its feedback is specific.

### Trap detector (`lib/chem/traps.ts`)
Two layers, both deterministic:
1. **Per-question traps.** Each question lists the wrong answers students classically draw (the `traps` field in §5), each tagged with a trap id. If my drawing matches one, the attempt is tagged with that trap.
2. **Generic trap rules.** Checks that work on any question by comparing my answer to the correct one with RDKit:
   - `stereo-ignored`: connectivity right, stereo wrong
   - `regio-wrong`: same formula and functional groups, different position
   - `rearrangement-ignored`: my product has the unrearranged carbon skeleton when a carbocation shift was expected (question flags `expectsRearrangement`)
   - `over-reaction` / `under-reaction`: e.g., ester fully reduced to alcohol when DIBAL was used, or Grignard added once to an ester instead of twice
   - `workup-missing`: product still has an alkoxide/charge that acidic workup would remove
   - `wrong-enolate`: kinetic vs thermodynamic alkylation site swapped
   - `fc-deactivated`: attempted Friedel–Crafts on a strongly deactivated ring
   - `acidic-proton-grignard`: Grignard with an unprotected OH/NH/COOH in the substrate

Trap ids live in `data/traps.json` with a name and a one-line explanation. The dashboard shows my most frequent traps, and the Mistakes mode can drill questions by trap.

## 7. Spectrum generation (`lib/spectra/`)

All spectra are **generated from the structure**, so every question automatically has matching spectra and I can generate unlimited new ones. Don't scrape SDBS/NIST — their licenses restrict redistribution.

**IR (`ir.ts`)**
- Table of functional groups as SMARTS → characteristic bands (position range, intensity, width). E.g., O–H alcohol 3200–3550 broad strong; C=O ketone ~1715; conjugated C=O ~1685; ester ~1735 + C–O 1000–1300; nitrile ~2250; carboxylic acid very broad 2500–3300 + ~1710; sp²/sp³ C–H either side of 3000; aromatic C=C ~1600/1500.
- Sum Gaussian/Lorentzian bands, plot as % transmittance, x-axis 4000→400 reversed, add small noise + a fingerprint region so it looks real.
- Each peak carries metadata (which group made it) for "click the peak" questions and tutor explanations.

**¹H NMR (`hnmr.ts`)**
- Find chemically equivalent H environments with RDKit symmetry classes (canonical ranking with `breakTies=false`).
- Predict shift per environment: base values + additive substituent increments (start with a curated table; evaluate cheminfo's open-source NMR prediction tools as an upgrade).
- Splitting: n+1 from neighboring non-equivalent H (first-order); OH/NH as broad singlets.
- Render: Lorentzian lines at 400 MHz with correct J spacing, integration curves/steps, TMS at 0, x-axis 12→0 reversed.
- Hover shows shift, multiplicity, integration, and (in review mode) highlights those H on the structure.

**¹³C NMR + DEPT (`cnmr.ts`)** — carbon symmetry classes, shift table (C=O 160–220, aromatic 110–160, etc.), DEPT-90 (CH only) and DEPT-135 (CH/CH₃ up, CH₂ down) as separate toggleable traces.

**MS (`ms.ts`)** — exact M⁺ from formula, isotope pattern (M+1 from ¹³C count, M+2 3:1 for Cl, 1:1 for Br), rule-based fragments (alpha cleavage, loss of H₂O from alcohols, McLafferty for carbonyls with γ-H, tropylium 91, acylium ions). Bar chart.

**UV-Vis (optional)** — Woodward–Fieser rules for dienes/enones.

Add a "spectra accuracy" disclaimer in the UI: predicted, textbook-style, not real instrument data.

## 8. AI tutor (`app/api/tutor/route.ts`)

- Input: question, correct answer (SMILES + name), my attempt, grader diagnostics, hint level, chat history.
- System prompt rules:
  - Socratic. Hint ladder: **Level 1** point to the concept → **Level 2** point to the specific atom/group → **Level 3** walk the mechanism step-by-step → **Level 4** full solution (only when I ask).
  - Never contradict the deterministic grader.
  - When referencing structures, output SMILES inside a `<mol>` tag so the frontend renders it with RDKit (validated first; invalid ones are silently dropped).
  - Keep responses short; use arrow-pushing language ("the lone pair on O attacks the carbonyl carbon").
- Buttons: "Hint", "Why is my answer wrong?", "Explain the mechanism", "Show a similar problem".
- Free-form "Ask about this problem" chat box.
- Stream responses.

## 9. Question sources

1. **Hand-authored/seed bank**: have Claude Code write ~20 questions per topic as JSON, then run the validator.
2. **Template generator** (`lib/generate/`): RDKit reaction SMARTS per reaction (e.g., Grignard + ketone → tertiary alcohol, aldol, Diels–Alder, EAS with directing rules) applied to a pool of substrates → unlimited "predict the product" variants. Validator runs on output.
3. **Upload my lecture notes/slides** → Claude drafts questions weighted toward what the professor emphasized → validator → I approve before they enter the bank.

## 10. Study features

- Spaced repetition (FSRS or SM-2) per question and per concept tag.
- Weak-area dashboard: accuracy by topic and by concept (e.g., "kinetic vs thermodynamic enolates: 45%").
- Modes: Practice (hints on), Exam (timed, no hints, review after), Drill (one reaction type rapid-fire), Mistakes (only things I've missed).
- **Reaction roadmap**: interactive graph of functional group interconversions (alkene → alcohol → ketone → …). Click an edge to see reagents; click "quiz me" to drill that edge.
- **Reagent flashcards**: reagent → what it does (e.g., DIBAL-H, −78 °C → ester to aldehyde).
- Keyboard shortcuts; dark mode.

## 11. File structure

```
/app
  /(routes)  page.tsx, practice/, topic/[id]/, dashboard/, roadmap/, review/
  /api/tutor/route.ts
  /api/generate/route.ts
/components
  StructureView.tsx     (RDKit SVG)
  StructureEditor.tsx   (Ketcher, lazy)
  SpectrumPlot.tsx      (Plotly)
  MechanismCanvas.tsx
  QuestionCard.tsx, HintPanel.tsx, TutorChat.tsx
/lib
  /chem  rdkit.ts, grade.ts, smarts.ts, symmetry.ts
  /spectra  ir.ts, hnmr.ts, cnmr.ts, ms.ts
  /generate  templates.ts, substrates.ts
  /srs  fsrs.ts
  db.ts (Dexie)
/data  topics.json, /questions/*.json, ir-table.json, nmr-shifts.json, reagents.json
/scripts  validate-questions.ts
/tests
```

## 12. Build phases (paste one prompt at a time)

**Phase 0 — Scaffold**
> Read CLAUDE.md. Scaffold a Next.js + TypeScript + Tailwind app with the file structure in §11. Add Vitest and Playwright. Create a README and a `.env.example` with ANTHROPIC_API_KEY. Commit.

**Phase 1 — Chemistry core**
> Integrate RDKit.js (WASM, lazy-loaded singleton in lib/chem/rdkit.ts). Build StructureView that renders any SMILES as a skeletal SVG with optional atom highlighting. Build grade.ts per §6 with thorough unit tests, including stereo partial credit, and a demo page rendering 10 test molecules.

**Phase 2 — Drawing**
> Integrate Ketcher as StructureEditor (lazy-loaded, client-only). Export the drawing as molfile/SMILES into grade.ts. Build a demo "draw benzoic acid" question end-to-end.

**Phase 3 — Question engine + MCQ**
> Implement the question schema in §5, the validator script (§2 rule 2) wired into `npm test`, and QuestionCard supporting multiple choice, draw-product, rank, and reagent-fill. Build the trap detector (§6) with unit tests for each generic trap rule. Seed 15 questions each for EAS and aldehydes/ketones, each with at least one trap answer. Run the validator.

**Phase 4 — Spectra**
> Build ir.ts, hnmr.ts, cnmr.ts (with DEPT), ms.ts per §7 with unit tests on known molecules (ethyl acetate, 2-butanone, toluene, 1-bromopropane, benzaldehyde). Build SpectrumPlot with reversed axes, hover info, and peak-click events. Add a structure-ID question type that shows formula + all spectra and asks me to draw the structure. Then build a /sandbox page: Ketcher on one side, and as I draw, IR / ¹H / ¹³C+DEPT / MS tabs update live (debounced). Hovering a peak highlights the responsible atoms or bonds on the structure, and hovering an atom highlights its peaks. Include a side-by-side compare mode for two molecules (e.g., an aldehyde vs its ketone isomer).

**Phase 5 — AI tutor**
> Build /api/tutor per §8 with streaming, the hint ladder, `<mol>` rendering with RDKit validation, and the grader diagnostics as context. Add HintPanel and TutorChat to QuestionCard.

**Phase 6 — Progress + SRS**
> Add Dexie storage, FSRS scheduling, the dashboard (accuracy by topic and concept), and Practice/Exam/Drill/Mistakes modes.

**Phase 7 — Content expansion**
> Seed questions for every topic in §4 (validate all). Build the reaction-template generator in §9.2 for at least 10 reaction types.

**Phase 8 — Mechanisms**
> Build MechanismCanvas: render a structure with RDKit, expose atom/bond coordinates, let me click a lone pair or bond (source) and an atom (sink) to place a curved arrow. Grade against an expected arrow list per step. Seed 10 mechanisms (acetal formation, aldol, Claisen, EAS nitration, SNAr, Fischer esterification, Grignard addition, imine formation, Diels–Alder, Robinson annulation).

**Phase 9 — Extras**
> Reaction roadmap graph, reagent flashcards, lecture-notes → question drafting flow, deploy to Vercel.

## 13. Ideas / stretch goals

- **"Explain it back" mode**: after a correct answer, the app asks you to explain *why* in one sentence and the tutor grades your reasoning, not just the product.
- **"Same molecule, different view"** toggle: skeletal ↔ Newman ↔ chair ↔ Fischer/Haworth (for carbs).
- **Exam simulator** matching your professor's format, with a post-exam breakdown by topic.
- **Synthesis puzzle mode**: start material + target, pick reagents from a palette, the app applies reaction templates and shows what you actually made.
- **Pre-med tie-in**: an MCAT-style passage mode (orgo in a biochem context) for later.
