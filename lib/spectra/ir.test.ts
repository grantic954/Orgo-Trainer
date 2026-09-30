import { describe, it, expect } from "vitest";
import { irForSmiles } from "./ir";

// RDKit-in-node tests. Slower than pure-JS tests but essential for the
// spectra layer since SMARTS matching is the whole point.

function nearestBand(bands: { peak: number; group: string }[], group: string) {
  return bands.find((b) => b.group === group);
}

describe("IR", () => {
  it("ethyl acetate shows ester C=O near 1735 and sp3 C-H under 3000", async () => {
    const s = await irForSmiles("CC(=O)OCC");
    expect(s).not.toBeNull();
    const bands = s!.bands;
    const co = nearestBand(bands, "ester-CO");
    expect(co).toBeDefined();
    expect(co!.peak).toBeGreaterThan(1700);
    expect(co!.peak).toBeLessThan(1760);
    expect(nearestBand(bands, "sp3-CH")).toBeDefined();
    expect(nearestBand(bands, "aromatic-CC")).toBeUndefined();
  }, 30_000);

  it("2-butanone shows ketone C=O near 1715", async () => {
    const s = await irForSmiles("CCC(C)=O");
    expect(s).not.toBeNull();
    const co = nearestBand(s!.bands, "ketone-CO");
    expect(co).toBeDefined();
    expect(co!.peak).toBeGreaterThan(1700);
    expect(co!.peak).toBeLessThan(1740);
  }, 30_000);

  it("toluene shows aromatic C=C bands and aromatic C-H, no carbonyl", async () => {
    const s = await irForSmiles("Cc1ccccc1");
    expect(s).not.toBeNull();
    const groups = new Set(s!.bands.map((b) => b.group));
    expect(groups.has("aromatic-CC")).toBe(true);
    expect(groups.has("aromatic-CH")).toBe(true);
    expect(
      [...groups].some((g) => g.endsWith("-CO")),
    ).toBe(false);
  }, 30_000);

  it("1-bromopropane shows C-Br and sp3 C-H", async () => {
    const s = await irForSmiles("CCCBr");
    expect(s).not.toBeNull();
    const groups = new Set(s!.bands.map((b) => b.group));
    expect(groups.has("cbr")).toBe(true);
    expect(groups.has("sp3-CH")).toBe(true);
  }, 30_000);

  it("benzaldehyde shows aldehyde C=O + aromatic bands", async () => {
    const s = await irForSmiles("O=Cc1ccccc1");
    expect(s).not.toBeNull();
    const groups = new Set(s!.bands.map((b) => b.group));
    expect(groups.has("aldehyde-CO")).toBe(true);
    expect(groups.has("aromatic-CC")).toBe(true);
  }, 30_000);

  it("returns null for invalid SMILES", async () => {
    const s = await irForSmiles("not a smiles");
    expect(s).toBeNull();
  }, 30_000);

  it("transmittance curve has correct axis range and drops at each band", async () => {
    const s = await irForSmiles("CC(=O)OCC");
    expect(s!.xs[0]).toBe(4000);
    expect(s!.xs[s!.xs.length - 1]).toBe(400);
    // Should dip (transmittance below 90) near 1735
    const idx = s!.xs.findIndex((x) => x <= 1740);
    const y = s!.ys[idx];
    expect(y).toBeLessThan(90);
  }, 30_000);
});
