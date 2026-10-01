// Chapter organization for the Orgo 2 practice app. Chapter numbers and
// titles follow Klein & Starkey's Organic Chemistry (5e); each chapter
// maps to one or more topic ids from the question bank.

export interface Chapter {
  number: number;
  title: string;
  topics: string[]; // topic ids that live in this chapter
  blurb?: string;
}

export const CHAPTERS: Chapter[] = [
  {
    number: 10,
    title: "Radical Reactions",
    topics: [],
    blurb: "Radical halogenation, allylic bromination, polymerization basics.",
  },
  {
    number: 11,
    title: "Synthesis",
    topics: ["synthesis"],
    blurb: "Multistep planning and retrosynthesis.",
  },
  {
    number: 12,
    title: "Alcohols and Phenols",
    topics: ["alcohols-ethers"],
    blurb: "Alcohol synthesis + reactions (shared with Ch. 13 for now).",
  },
  {
    number: 13,
    title: "Ethers and Epoxides; Thiols and Sulfides",
    topics: ["alcohols-ethers"],
    blurb: "Williamson, epoxide ring-opening, thiol chemistry.",
  },
  {
    number: 14,
    title: "Infrared Spectroscopy and Mass Spectrometry",
    topics: ["ir", "ms"],
    blurb: "Functional group identification by IR; molecular ion + fragmentation.",
  },
  {
    number: 15,
    title: "Nuclear Magnetic Resonance Spectroscopy",
    topics: ["hnmr", "cnmr", "structure-id"],
    blurb: "¹H / ¹³C / DEPT + combined structure determination.",
  },
  {
    number: 16,
    title: "Conjugated Pi Systems and Pericyclic Reactions",
    topics: ["conjugation"],
    blurb: "1,2 vs 1,4 addition, Diels–Alder, endo rule.",
  },
  {
    number: 17,
    title: "Aromatic Compounds",
    topics: ["aromaticity"],
    blurb: "Hückel's rule, heteroaromatics, MO theory.",
  },
  {
    number: 18,
    title: "Aromatic Substitution Reactions",
    topics: ["eas", "snar", "side-chain"],
    blurb: "EAS, SNAr/benzyne, benzylic chemistry, diazonium.",
  },
  {
    number: 19,
    title: "Aldehydes and Ketones",
    topics: ["carbonyls"],
    blurb: "Grignard/hydride addition, acetals, imines/enamines, Wittig.",
  },
  {
    number: 20,
    title: "Carboxylic Acids and Their Derivatives",
    topics: ["carboxylic-acids", "acid-derivatives"],
    blurb: "Reactivity ladder, Fischer esterification, saponification, nitrile hydrolysis.",
  },
  {
    number: 21,
    title: "Alpha Carbon Chemistry: Enols and Enolates",
    topics: ["alpha-carbon"],
    blurb: "Kinetic vs thermodynamic enolates, aldol, Claisen, Michael.",
  },
  {
    number: 22,
    title: "Amines",
    topics: ["amines"],
    blurb: "Basicity, Gabriel, reductive amination, Hofmann.",
  },
  {
    number: 23,
    title: "Introduction to Organometallic Compounds",
    topics: [],
    blurb: "Grignards, organolithiums, Gilman reagents, cross-coupling.",
  },
  {
    number: 24,
    title: "Carbohydrates",
    topics: [],
    blurb: "Fischer/Haworth, anomers, mutarotation, glycosides.",
  },
  {
    number: 25,
    title: "Amino Acids, Peptides, and Proteins",
    topics: [],
    blurb: "pI calculations, peptide synthesis, protein structure levels.",
  },
  {
    number: 26,
    title: "Lipids",
    topics: [],
    blurb: "Fatty acids, triglycerides, phospholipids, steroids.",
  },
  {
    number: 27,
    title: "Synthetic Polymers",
    topics: [],
    blurb: "Chain-growth vs step-growth polymerization.",
  },
];

export function chapterByNumber(n: number): Chapter | undefined {
  return CHAPTERS.find((c) => c.number === n);
}

export function chapterForTopic(topic: string): Chapter | undefined {
  // First chapter that owns this topic (used for dashboard breakdown).
  return CHAPTERS.find((c) => c.topics.includes(topic));
}
