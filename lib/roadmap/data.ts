// Functional-group interconversion graph. Nodes are functional-group
// classes; edges carry the reagent needed to go from one to the other.

export interface RoadmapNode {
  id: string;
  label: string;
}

export interface RoadmapEdge {
  from: string;
  to: string;
  reagents: string;
  note?: string;
}

export const ROADMAP_NODES: RoadmapNode[] = [
  { id: "alkene", label: "Alkene (C=C)" },
  { id: "alkyne", label: "Alkyne (C≡C)" },
  { id: "alcohol-1", label: "1° Alcohol" },
  { id: "alcohol-2", label: "2° Alcohol" },
  { id: "aldehyde", label: "Aldehyde" },
  { id: "ketone", label: "Ketone" },
  { id: "carboxylic-acid", label: "Carboxylic acid" },
  { id: "ester", label: "Ester" },
  { id: "amide", label: "Amide" },
  { id: "amine-1", label: "1° Amine" },
  { id: "nitrile", label: "Nitrile" },
  { id: "alkyl-halide", label: "Alkyl halide" },
  { id: "arene", label: "Arene (ArH)" },
  { id: "aryl-halide", label: "Aryl halide" },
  { id: "nitroarene", label: "Nitroarene (ArNO₂)" },
  { id: "arylamine", label: "Aryl amine (ArNH₂)" },
  { id: "diazonium", label: "Diazonium (ArN₂⁺)" },
];

export const ROADMAP_EDGES: RoadmapEdge[] = [
  // alkene ↔ alcohol
  { from: "alkene", to: "alcohol-2", reagents: "H₂O / H⁺ (Markovnikov)" },
  { from: "alkene", to: "alcohol-1", reagents: "BH₃·THF, then H₂O₂ / NaOH (anti-Markovnikov)" },
  { from: "alcohol-2", to: "alkene", reagents: "H₂SO₄, heat (dehydration)" },

  // alcohol → carbonyl
  { from: "alcohol-1", to: "aldehyde", reagents: "PCC" },
  { from: "alcohol-1", to: "carboxylic-acid", reagents: "Jones (CrO₃/H₂SO₄) or KMnO₄" },
  { from: "alcohol-2", to: "ketone", reagents: "PCC or Jones" },

  // carbonyl → alcohol
  { from: "aldehyde", to: "alcohol-1", reagents: "NaBH₄ or LiAlH₄" },
  { from: "ketone", to: "alcohol-2", reagents: "NaBH₄ or LiAlH₄" },

  // ester
  { from: "carboxylic-acid", to: "ester", reagents: "ROH + H₂SO₄ (cat), heat (Fischer)" },
  { from: "ester", to: "carboxylic-acid", reagents: "NaOH, H₂O, heat (saponification), then H⁺" },
  { from: "ester", to: "alcohol-1", reagents: "LiAlH₄, then H₃O⁺ (reduces to 1° OH)" },
  { from: "ester", to: "aldehyde", reagents: "DIBAL-H (1 eq, −78 °C)" },

  // amide
  { from: "carboxylic-acid", to: "amide", reagents: "SOCl₂ (→ acyl chloride), then R₂NH" },

  // amine
  { from: "ketone", to: "amine-1", reagents: "NH₃, then NaBH₃CN (reductive amination)" },
  { from: "aldehyde", to: "amine-1", reagents: "NH₃, then NaBH₃CN" },
  { from: "nitrile", to: "amine-1", reagents: "LiAlH₄, then H₃O⁺" },
  { from: "amide", to: "amine-1", reagents: "LiAlH₄" },

  // nitrile chain extension
  { from: "alkyl-halide", to: "nitrile", reagents: "NaCN (SN2)" },
  { from: "nitrile", to: "carboxylic-acid", reagents: "H₃O⁺, heat" },

  // alkyl halide
  { from: "alcohol-1", to: "alkyl-halide", reagents: "SOCl₂ or PBr₃ or HBr" },
  { from: "alcohol-2", to: "alkyl-halide", reagents: "HBr or SOCl₂ (with pyridine for retention/SN1 pitfalls)" },

  // alkyne ↔ alkene
  { from: "alkyne", to: "alkene", reagents: "H₂ / Lindlar (Z) or Na / NH₃ (E)" },

  // aromatics
  { from: "arene", to: "nitroarene", reagents: "HNO₃ / H₂SO₄" },
  { from: "nitroarene", to: "arylamine", reagents: "Sn / HCl (or Fe/HCl, H₂/Pd), basic workup" },
  { from: "arylamine", to: "diazonium", reagents: "NaNO₂ / HCl, 0 °C" },
  { from: "diazonium", to: "aryl-halide", reagents: "CuCl (→ Ar-Cl), CuBr (→ Ar-Br), Sandmeyer" },
  { from: "arene", to: "aryl-halide", reagents: "Br₂ / FeBr₃ (or Cl₂ / AlCl₃)" },
];
