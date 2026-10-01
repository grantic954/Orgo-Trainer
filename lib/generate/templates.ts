// Reaction templates for the question generator (§9.2 of CLAUDE.md).
// Each template is an RDKit reaction SMARTS plus metadata — a prompt
// stem, reagent list, concepts, and the chemistry topic it belongs to.

export interface ReactionTemplate {
  id: string;
  topic: string;
  name: string;
  promptStem: string; // "Predict the product of ..."
  reagents: string[];
  concepts: string[];
  explanation: string;
  smarts: string;     // reactant_smarts>>product_smarts (RDKit reaction SMARTS)
  expectsRearrangement?: boolean;
}

export const REACTION_TEMPLATES: ReactionTemplate[] = [
  {
    id: "grignard-aldehyde",
    topic: "carbonyls",
    name: "Grignard + aldehyde → 2° alcohol",
    promptStem: "Predict the product of {R1}MgBr + {R2} (then H3O+ workup).",
    reagents: ["RMgBr", "H3O+"],
    concepts: ["Grignard addition", "secondary alcohol"],
    explanation: "Grignard carbanion adds across the C=O; acidic workup protonates the alkoxide to a 2° alcohol.",
    smarts: "[C:1][Mg:2][Br].[#6:3][C:4](=[O:5])[H]>>[#6:3][C:4]([C:1])[O:5][H]",
  },
  {
    id: "grignard-ketone",
    topic: "carbonyls",
    name: "Grignard + ketone → 3° alcohol",
    promptStem: "Predict the product of {R1}MgBr + {R2} (then H3O+ workup).",
    reagents: ["RMgBr", "H3O+"],
    concepts: ["Grignard addition", "tertiary alcohol"],
    explanation: "Grignard adds across the ketone C=O; workup gives a tertiary alcohol.",
    smarts: "[C:1][Mg][Br].[#6:3][C:4](=[O:5])[#6:6]>>[#6:3][C:4]([C:1])([#6:6])[O:5][H]",
  },
  {
    id: "nabh4-aldehyde",
    topic: "carbonyls",
    name: "NaBH4 reduction of aldehyde → 1° alcohol",
    promptStem: "Predict the product of NaBH4 reduction of {R1}.",
    reagents: ["NaBH4", "MeOH"],
    concepts: ["hydride reduction"],
    explanation: "NaBH4 delivers H⁻ to the carbonyl carbon; alkoxide intermediate protonated by solvent.",
    smarts: "[#6:3][C:4](=[O:5])[H]>>[#6:3][C:4]([H])[O:5][H]",
  },
  {
    id: "nabh4-ketone",
    topic: "carbonyls",
    name: "NaBH4 reduction of ketone → 2° alcohol",
    promptStem: "Predict the product of NaBH4 reduction of {R1}.",
    reagents: ["NaBH4", "MeOH"],
    concepts: ["hydride reduction"],
    explanation: "NaBH4 reduces ketone C=O to a 2° alcohol.",
    smarts: "[#6:3][C:4](=[O:5])[#6:6]>>[#6:3][C:4]([H])([#6:6])[O:5][H]",
  },
  {
    id: "lah-ester",
    topic: "acid-derivatives",
    name: "LiAlH4 reduction of ester → 1° alcohol",
    promptStem: "Predict the primary-alcohol product from LiAlH4 reduction of {R1}.",
    reagents: ["LiAlH4", "H3O+"],
    concepts: ["ester reduction"],
    explanation: "LiAlH4 reduces esters all the way to the 1° alcohol (releases the alkoxy group as its alcohol too).",
    smarts: "[#6:3][C:4](=[O:5])[O:6][#6:7]>>[#6:3][C:4]([H])[H][O:5][H]",
  },
  {
    id: "fischer-esterification",
    topic: "acid-derivatives",
    name: "Fischer esterification: COOH + ROH → ester",
    promptStem: "Predict the Fischer esterification product of {R1} + {R2}.",
    reagents: ["H2SO4 (cat)", "heat"],
    concepts: ["Fischer esterification"],
    explanation: "Acid-catalyzed condensation; equilibrium driven by excess alcohol or water removal.",
    smarts: "[#6:3][C:4](=[O:5])[O:6][H].[#6:7][O:8][H]>>[#6:3][C:4](=[O:5])[O:8][#6:7]",
  },
  {
    id: "imine-formation",
    topic: "carbonyls",
    name: "Imine formation: aldehyde + 1° amine → imine",
    promptStem: "Predict the product of {R1} + {R2} (mild acid, −H2O).",
    reagents: ["H+ (cat)", "-H2O"],
    concepts: ["imine formation", "condensation"],
    explanation: "Primary amine + aldehyde condense (−H2O) to form an imine (Schiff base).",
    smarts: "[#6:3][C:4](=[O:5])[H].[#6:7][N:8]([H])[H]>>[#6:3][C:4](=[N:8][#6:7])[H]",
  },
  {
    id: "wittig",
    topic: "carbonyls",
    name: "Wittig: ylide + aldehyde → alkene",
    promptStem: "Predict the Wittig alkene product of {R1} + {R2}.",
    reagents: ["CH2=PPh3 (ylide)", "-OPPh3"],
    concepts: ["Wittig reaction"],
    explanation: "Ylide carbon attacks carbonyl C; oxaphosphetane collapses to alkene + Ph3P=O.",
    smarts: "[#6:3][C:4](=[O:5])[H].[C:6]=[P]([a])([a])[a]>>[#6:3][C:4]([H])=[C:6]",
  },
  {
    id: "eas-bromination",
    topic: "eas",
    name: "EAS bromination of activated arene",
    promptStem: "Predict the major bromination product of {R1}.",
    reagents: ["Br2", "FeBr3"],
    concepts: ["EAS", "ortho/para direction"],
    explanation: "Activating groups direct ortho/para; para dominates for steric reasons.",
    smarts: "[c:1]1[c:2][c:3][c:4][c:5][c:6]1[O:7][C:8].[Br][Br]>>[c:1]1[c:2][c:3][c:4]([Br])[c:5][c:6]1[O:7][C:8]",
  },
  {
    id: "nitrile-hydrolysis",
    topic: "acid-derivatives",
    name: "Nitrile hydrolysis → carboxylic acid",
    promptStem: "Predict the product of acidic hydrolysis of {R1}.",
    reagents: ["H2SO4", "H2O", "heat"],
    concepts: ["nitrile hydrolysis"],
    explanation: "R-CN + H2O under strong acid goes through an amide intermediate to R-COOH.",
    smarts: "[#6:1][C:2]#[N:3]>>[#6:1][C:2](=[O])[O][H]",
  },
];
