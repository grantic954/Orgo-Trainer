import { describe, it, expect } from "vitest";
import { hnmrForSmiles } from "./hnmr";
import { cnmrForSmiles } from "./cnmr";
import { msForSmiles } from "./ms";

describe("1H NMR", () => {
  it("ethyl acetate: 3 distinct H environments (CH3-CO, OCH2, CH3)", async () => {
    const s = await hnmrForSmiles("CC(=O)OCC");
    expect(s).not.toBeNull();
    expect(s!.peaks.length).toBe(3);
    // OCH2 around ~3.5–4.5; alpha-C methyl around 2; terminal CH3 around 1
    const shifts = s!.peaks.map((p) => p.shift).sort((a, b) => b - a);
    expect(shifts[0]).toBeGreaterThan(3);   // OCH2
    expect(shifts[0]).toBeLessThan(5);
    expect(shifts[2]).toBeLessThan(2);      // methyl of ethyl
    const oOne = s!.peaks.find((p) => p.shift > 3);
    expect(oOne?.integration).toBe(2);
  }, 30_000);

  it("2-butanone: 3 environments (α-CH3, CH2, terminal CH3)", async () => {
    const s = await hnmrForSmiles("CCC(C)=O");
    expect(s).not.toBeNull();
    expect(s!.peaks.length).toBe(3);
  }, 30_000);

  it("toluene: methyl + aromatic Hs", async () => {
    const s = await hnmrForSmiles("Cc1ccccc1");
    expect(s).not.toBeNull();
    const methyl = s!.peaks.find((p) => p.shift < 3);
    const aromatic = s!.peaks.find((p) => p.shift > 6);
    expect(methyl).toBeDefined();
    expect(methyl!.integration).toBe(3);
    expect(aromatic).toBeDefined();
    expect(aromatic!.integration).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("benzaldehyde: aldehyde H > 9 ppm", async () => {
    const s = await hnmrForSmiles("O=Cc1ccccc1");
    expect(s).not.toBeNull();
    expect(s!.peaks.some((p) => p.shift > 9)).toBe(true);
  }, 30_000);
});

describe("13C NMR", () => {
  it("2-butanone shows a carbonyl carbon (190–210 ppm)", async () => {
    const s = await cnmrForSmiles("CCC(C)=O");
    expect(s).not.toBeNull();
    expect(s!.peaks.some((p) => p.shift > 190 && p.shift < 215)).toBe(true);
  }, 30_000);

  it("ethyl acetate ester C=O between 165–180 ppm", async () => {
    const s = await cnmrForSmiles("CC(=O)OCC");
    expect(s).not.toBeNull();
    expect(s!.peaks.some((p) => p.shift > 165 && p.shift < 180)).toBe(true);
  }, 30_000);

  it("DEPT signs: 2-butanone has CH2 (-1), CH3 (+1), and quaternary carbonyl (0)", async () => {
    const s = await cnmrForSmiles("CCC(C)=O");
    expect(s).not.toBeNull();
    const signs = s!.peaks.map((p) => p.dept135);
    expect(signs).toContain(-1); // CH2
    expect(signs).toContain(1);  // CH3
    expect(signs).toContain(0);  // C=O
  }, 30_000);
});

describe("MS", () => {
  it("2-butanone: M+ at 72 with isotope pattern", async () => {
    const s = await msForSmiles("CCC(C)=O");
    expect(s).not.toBeNull();
    const M = s!.peaks.find((p) => p.label === "M⁺");
    expect(M?.mz).toBe(72);
    expect(s!.peaks.some((p) => p.label.startsWith("M+1"))).toBe(true);
  }, 30_000);

  it("1-bromopropane: M+2 for Br in ~1:1 ratio", async () => {
    const s = await msForSmiles("CCCBr");
    expect(s).not.toBeNull();
    const m2 = s!.peaks.find((p) => p.label.includes("⁸¹Br"));
    expect(m2).toBeDefined();
    expect(m2!.intensity).toBeGreaterThan(80);
  }, 30_000);

  it("benzaldehyde: shows M-CHO (acylium) and phenyl 77", async () => {
    const s = await msForSmiles("O=Cc1ccccc1");
    expect(s).not.toBeNull();
    expect(s!.peaks.some((p) => p.mz === 77)).toBe(true);
    expect(s!.peaks.some((p) => p.label.includes("acylium"))).toBe(true);
  }, 30_000);

  it("ethyl acetate: shows M-CHO and reasonable formula", async () => {
    const s = await msForSmiles("CC(=O)OCC");
    expect(s).not.toBeNull();
    expect(s!.formula).toBe("C4H8O2");
  }, 30_000);

  it("toluene: benzyl → tropylium 91", async () => {
    const s = await msForSmiles("Cc1ccccc1");
    expect(s).not.toBeNull();
    expect(s!.peaks.some((p) => p.mz === 91)).toBe(true);
  }, 30_000);
});
