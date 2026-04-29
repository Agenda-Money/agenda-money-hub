export const formatMoney = (v: number): string =>
  v >= 1_000_000 ? `GHS ${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `GHS ${(v / 1_000).toFixed(1)}K`
  : `GHS ${v.toLocaleString("en-GH")}`;

export const formatCount = (v: number): string =>
  v.toLocaleString("en-GH");
