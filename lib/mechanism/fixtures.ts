// Seed mechanisms. Atom indices follow RDKit's canonical atom order for
// the SMILES as written (0-indexed). Verify by rendering with atom labels
// on when authoring new mechanisms.

import type { Mechanism } from "./schema";

export const MECHANISMS: Mechanism[] = [
  {
    id: "imine-formation",
    name: "Imine formation (acetaldehyde + methylamine)",
    topic: "carbonyls",
    description:
      "A 1° amine condenses with an aldehyde to form an iminium → imine. Here we trace step 1: amine attacks the carbonyl.",
    steps: [
      {
        prompt:
          "Step 1: methylamine attacks the carbonyl carbon of acetaldehyde. Draw the arrow from the N lone pair to C.",
        smiles: "CC=O.CN",
        expectedArrows: [
          // N (index 4) lone pair → C=O carbon (index 1)
          { sourceAtom: 4, sinkAtom: 1, label: "N lone pair → carbonyl C" },
        ],
        explanation:
          "The amine nitrogen's lone pair attacks the electrophilic carbonyl carbon, forming a C–N bond.",
      },
    ],
  },
  {
    id: "fischer-esterification-step1",
    name: "Fischer esterification — protonation step",
    topic: "acid-derivatives",
    description:
      "The acid-catalyzed step that activates the C=O toward nucleophilic attack by alcohol.",
    steps: [
      {
        prompt:
          "Step 1: H3O+ protonates the carbonyl oxygen of acetic acid. Draw the arrow from the C=O lone pair to H.",
        smiles: "CC(=O)O.[OH3+]",
        expectedArrows: [
          // Carbonyl O (index 2) lone pair → H of H3O+ (index 4 or 5 — just use 4)
          { sourceAtom: 2, sinkAtom: 4, label: "C=O lone pair → H+" },
        ],
        explanation:
          "Protonation of the carbonyl oxygen raises the electrophilicity of the carbonyl carbon.",
      },
    ],
  },
  {
    id: "sn2-generic",
    name: "SN2: hydroxide + methyl bromide",
    topic: "alcohols-ethers",
    description: "Classic back-side displacement.",
    steps: [
      {
        prompt:
          "Hydroxide displaces bromide at the methyl carbon. Draw the arrow from OH⁻ to C, then from C–Br to Br.",
        smiles: "[OH-].CBr",
        expectedArrows: [
          { sourceAtom: 0, sinkAtom: 1, label: "OH⁻ → C" },
          { sourceAtom: 1, sourceAtom2: 2, sinkAtom: 2, label: "C–Br → Br" },
        ],
        explanation:
          "Backside attack: OH⁻'s lone pair attacks the sp³ C, pushing the C–Br bond pair onto Br as a leaving group.",
      },
    ],
  },
  {
    id: "aldol-enolate-formation",
    name: "Aldol — enolate formation step",
    topic: "alpha-carbon",
    description: "Base deprotonates the α-H of acetone.",
    steps: [
      {
        prompt:
          "NaOH deprotonates the α-carbon of acetone. Draw the arrow from OH⁻ to the α-H, then from the α C–H to the C=O carbon (resonance to enolate O).",
        smiles: "[OH-].CC(=O)C",
        expectedArrows: [
          { sourceAtom: 0, sinkAtom: 5, label: "OH⁻ lone pair → α-H" },
          { sourceAtom: 1, sourceAtom2: 5, sinkAtom: 2, label: "C–H bond → C=O carbon" },
        ],
        explanation:
          "Deprotonation of the α-carbon forms the enolate; the negative charge delocalizes onto the carbonyl oxygen.",
      },
    ],
  },
  {
    id: "eas-nitration-electrophile",
    name: "EAS nitration — attack of benzene on NO2+",
    topic: "eas",
    description:
      "The π bond of benzene attacks the nitronium electrophile. Classic step 1 of nitration.",
    steps: [
      {
        prompt:
          "Benzene's π bond attacks the nitronium ion (NO2+). Draw the arrow from one of the aromatic C=C bonds to N.",
        smiles: "c1ccccc1.[N+](=O)=O",
        expectedArrows: [
          { sourceAtom: 0, sourceAtom2: 1, sinkAtom: 6, label: "π bond → N+" },
        ],
        explanation:
          "The aromatic π system is nucleophilic enough to attack NO2+, forming the Wheland (arenium) intermediate.",
      },
    ],
  },
];
