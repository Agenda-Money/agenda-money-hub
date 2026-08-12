import { TIERS, getTierByLevel } from '../lib/constants';

describe('Tier V3 Logic', () => {
  test('Tier ceilings align with V3 matrix', () => {
    const matrix = {
      1: 300,
      2: 360,
      3: 450,
      4: 515,
      5: 600,
      6: 680,
      7: 770,
      8: 870,
      9: 980,
      10: 1100,
      11: 1300,
      12: 1450,
      13: 1600,
      14: 1750,
      15: 1900,
      16: 2100,
      17: 2300,
      18: 2300,
      19: 2300,
      20: 2300,
    };

    Object.entries(matrix).forEach(([level, expectedMax]) => {
      const tier = getTierByLevel(Number(level));
      expect(tier?.maxAmount).toBe(expectedMax);
    });
  });

  test('Tenor options align with V3 rules', () => {
    const l1_l6 = [1, 2, 3, 4, 5, 6];
    const l7 = [7];
    // Tier 8+ trades the 1-day option for 30-day; 20-day stays exclusive to
    // tier 7 (must match backend's getAllowedTenuresForTier in loan.service.ts).
    const l8_l20 = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    l1_l6.forEach(level => {
      const tier = getTierByLevel(level);
      expect(tier?.tenures).toEqual([1, 5, 10, 14]);
    });

    l7.forEach(level => {
      const tier = getTierByLevel(level);
      expect(tier?.tenures).toEqual([1, 5, 10, 14, 20]);
    });

    l8_l20.forEach(level => {
      const tier = getTierByLevel(level);
      expect(tier?.tenures).toEqual([5, 10, 14, 30]);
    });
  });

  test('Processing fees align with V3 rules', () => {
    const l1_l4 = [1, 2, 3, 4];
    const l5_l9 = [5, 6, 7, 8, 9];
    const l10_l14 = [10, 11, 12, 13, 14];
    const l15_l20 = [15, 16, 17, 18, 19, 20];

    l1_l4.forEach(level => {
      const tier = getTierByLevel(level);
      expect(tier?.processingFee).toBe(30);
    });

    l5_l9.forEach(level => {
      const tier = getTierByLevel(level);
      expect(tier?.processingFee).toBe(25);
    });

    l10_l14.forEach(level => {
      const tier = getTierByLevel(level);
      expect(tier?.processingFee).toBe(20);
    });

    l15_l20.forEach(level => {
      const tier = getTierByLevel(level);
      expect(tier?.processingFee).toBe(15);
    });
  });
});
