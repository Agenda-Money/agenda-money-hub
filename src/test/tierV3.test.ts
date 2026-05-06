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
    const l1_l9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const l10_l20 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    l1_l9.forEach(level => {
      const tier = getTierByLevel(level);
      expect(tier?.tenures).toEqual([1, 5, 10, 14]);
    });

    l10_l20.forEach(level => {
      const tier = getTierByLevel(level);
      expect(tier?.tenures).toEqual([1, 5, 10, 14, 30]);
    });
  });
});
