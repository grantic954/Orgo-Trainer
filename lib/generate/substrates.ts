// Substrate pool for the reaction-template generator. Each entry is a
// SMILES + a short display name used in generated prompts.

export interface Substrate {
  smiles: string;
  name: string;
  classes: string[]; // substrate categories: 'aldehyde', 'ketone', 'ester', ...
}

export const SUBSTRATES: Substrate[] = [
  // aldehydes
  { smiles: "O=CC", name: "acetaldehyde", classes: ["aldehyde"] },
  { smiles: "O=CCC", name: "propanal", classes: ["aldehyde"] },
  { smiles: "O=Cc1ccccc1", name: "benzaldehyde", classes: ["aldehyde", "aromatic"] },
  { smiles: "O=CC(C)C", name: "isobutyraldehyde", classes: ["aldehyde"] },
  // ketones
  { smiles: "CC(=O)C", name: "acetone", classes: ["ketone"] },
  { smiles: "CCC(=O)C", name: "2-butanone", classes: ["ketone"] },
  { smiles: "CC(=O)c1ccccc1", name: "acetophenone", classes: ["ketone", "aromatic"] },
  { smiles: "O=C1CCCCC1", name: "cyclohexanone", classes: ["ketone", "cyclic"] },
  // esters
  { smiles: "CC(=O)OC", name: "methyl acetate", classes: ["ester"] },
  { smiles: "CC(=O)OCC", name: "ethyl acetate", classes: ["ester"] },
  { smiles: "O=C(OC)c1ccccc1", name: "methyl benzoate", classes: ["ester", "aromatic"] },
  // carboxylic acids
  { smiles: "CC(=O)O", name: "acetic acid", classes: ["carboxylic-acid"] },
  { smiles: "CCC(=O)O", name: "propanoic acid", classes: ["carboxylic-acid"] },
  { smiles: "O=C(O)c1ccccc1", name: "benzoic acid", classes: ["carboxylic-acid", "aromatic"] },
  // alcohols (as nucleophiles for esterification)
  { smiles: "CO", name: "methanol", classes: ["alcohol"] },
  { smiles: "CCO", name: "ethanol", classes: ["alcohol"] },
  { smiles: "CCCO", name: "1-propanol", classes: ["alcohol"] },
  // amines
  { smiles: "NC", name: "methylamine", classes: ["amine"] },
  { smiles: "NCC", name: "ethylamine", classes: ["amine"] },
  { smiles: "Nc1ccccc1", name: "aniline", classes: ["amine", "aromatic"] },
  // nitriles
  { smiles: "CC#N", name: "acetonitrile", classes: ["nitrile"] },
  { smiles: "CCC#N", name: "propanenitrile", classes: ["nitrile"] },
  // activated arenes (for EAS)
  { smiles: "COc1ccccc1", name: "anisole", classes: ["aromatic", "activated-arene"] },
  { smiles: "Oc1ccccc1", name: "phenol", classes: ["aromatic", "activated-arene"] },
  { smiles: "Cc1ccccc1", name: "toluene", classes: ["aromatic", "activated-arene"] },
  // Grignard reagents (SMILES form)
  { smiles: "[Mg]Br.C", name: "methylmagnesium bromide (CH3MgBr)", classes: ["grignard"] },
  { smiles: "CC[Mg]Br", name: "ethylmagnesium bromide (CH3CH2MgBr)", classes: ["grignard"] },
  { smiles: "[Mg]Br.c1ccccc1", name: "phenylmagnesium bromide (PhMgBr)", classes: ["grignard"] },
  // ylides
  { smiles: "C=P(c1ccccc1)(c1ccccc1)c1ccccc1", name: "methylidenetriphenylphosphorane (CH2=PPh3)", classes: ["ylide"] },
];

export function substratesByClass(cls: string): Substrate[] {
  return SUBSTRATES.filter((s) => s.classes.includes(cls));
}
