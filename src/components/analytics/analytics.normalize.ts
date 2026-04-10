/**
 * Normalizes admin analytics API payloads so UI can rely on one shape
 * (camelCase keys, consistent money fields, telco rows, repayment channels).
 */

import { safeNum } from './analytics.helpers';
import type { TelcoDisbursementRow } from './analytics.types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function camelKey(k: string): string {
  return k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Shallow+recursive camelCase for typical JSON API bodies */
export function deepCamelKeys<T>(input: T): any {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(deepCamelKeys);
  if (!isPlainObject(input)) return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[camelKey(k)] = deepCamelKeys(v);
  }
  return out;
}

export function unwrapAnalyticsBody(res: { data?: unknown }): unknown {
  const d = res?.data as Record<string, unknown> | undefined;
  if (d && typeof d === 'object' && 'data' in d && d.data !== undefined) return d.data;
  return d;
}

/** Normalize disbursement period blocks to use totalGHS consistently */
function patchDisbursementMoney(obj: Record<string, unknown> | undefined): void {
  if (!obj || !isPlainObject(obj)) return;
  const o = obj as Record<string, unknown>;
  const ghs = o.totalGHS ?? o.totalGhs ?? o.amount ?? o.volumeGhs ?? o.volumeGHS ?? o.total;
  if (ghs !== undefined && o.totalGHS === undefined) o.totalGHS = safeNum(ghs);
}

function patchSummaryShape(x: Record<string, unknown>): void {
  const loanBook = x.loanBook as Record<string, unknown> | undefined;
  if (loanBook && loanBook.total === undefined) {
    const t = loanBook.volume;
    if (t !== undefined) loanBook.total = safeNum(t);
  }

  const disb = x.disbursements as Record<string, unknown> | undefined;
  if (disb) {
    patchDisbursementMoney(disb.today as Record<string, unknown>);
    patchDisbursementMoney(disb.thisWeek as Record<string, unknown>);
    patchDisbursementMoney(disb.allTime as Record<string, unknown>);
  }

  const ua = x.userActivity as Record<string, unknown> | undefined;
  if (ua && ua.activeUsers === undefined && ua.active_users !== undefined) {
    ua.activeUsers = safeNum(ua.active_users);
  }
}

function patchPerformanceShape(x: Record<string, unknown>): void {
  for (const key of ['repaymentRate', 'defaultRate', 'collectionRate'] as const) {
    const block = x[key] as Record<string, unknown> | undefined;
    if (block && block.overall === undefined && typeof block.rate === 'number') {
      block.overall = block.rate;
    }
  }

  const par = x.portfolioAtRisk as Record<string, unknown> | undefined;
  if (!par) return;
  if (!par.PAR15) {
    const p = par.par15 ?? par.par_15 ?? (par as { pAR15?: unknown }).pAR15;
    if (p !== undefined) par.PAR15 = p;
  }
  const par15 = par.PAR15 as Record<string, unknown> | undefined;
  if (par15 && par15.overall === undefined) {
    const o = par15.rate ?? par15.value ?? par15.pct;
    if (o !== undefined) par15.overall = safeNum(o);
  }
}

/** Map legacy / alternate repayment channel payloads */
export function normalizeRepaymentChannels(raw: Record<string, unknown> | undefined): {
  channels: Array<{ method: 'app' | 'ussd' | 'other'; transactionCount: number; volumeGHS: number; percentage: number }>;
  total: { transactionCount: number; volumeGHS: number } | null;
} {
  const empty = { channels: [] as Array<{ method: 'app' | 'ussd' | 'other'; transactionCount: number; volumeGHS: number; percentage: number }>, total: null as { transactionCount: number; volumeGHS: number } | null };
  if (!raw) return empty;

  const existing = raw.repaymentChannels as Record<string, unknown> | undefined;
  const ch = (existing?.channels as unknown[]) || (raw.channels as unknown[]);
  if (Array.isArray(ch) && ch.length > 0) {
    const channels = ch.map((c: any) => ({
      method: (c.method || c.channel || 'other') as 'app' | 'ussd' | 'other',
      transactionCount: safeNum(c.transactionCount ?? c.count ?? c.transactions ?? c.txnCount),
      volumeGHS: safeNum(c.volumeGHS ?? c.volume ?? c.volumeGhs ?? c.amount),
      percentage: safeNum(c.percentage ?? c.percent ?? c.share),
    }));
    const totalRaw = existing?.total ?? raw.total;
    const total = totalRaw
      ? {
          transactionCount: safeNum((totalRaw as any).transactionCount ?? (totalRaw as any).count),
          volumeGHS: safeNum((totalRaw as any).volumeGHS ?? (totalRaw as any).volume ?? (totalRaw as any).amount),
        }
      : null;
    return { channels, total };
  }

  // Flat body: { ussd: { count, volume, percentage }, app: { ... }, total }
  const ussd = raw.ussd as Record<string, unknown> | undefined;
  const app = raw.app as Record<string, unknown> | undefined;
  if (ussd || app) {
    const channels = [
      {
        method: 'app' as const,
        transactionCount: safeNum(app?.count),
        volumeGHS: safeNum(app?.volume),
        percentage: safeNum(app?.percentage),
      },
      {
        method: 'ussd' as const,
        transactionCount: safeNum(ussd?.count),
        volumeGHS: safeNum(ussd?.volume),
        percentage: safeNum(ussd?.percentage),
      },
    ];
    const t = raw.total;
    const total =
      typeof t === 'number'
        ? { transactionCount: 0, volumeGHS: safeNum(t) }
        : t && isPlainObject(t as object)
          ? {
              transactionCount: safeNum((t as any).count ?? (t as any).transactionCount),
              volumeGHS: safeNum((t as any).volume ?? (t as any).volumeGHS),
            }
          : null;
    return { channels, total };
  }

  return empty;
}

function pickTelcoArrays(vol: Record<string, unknown>, legacy?: Record<string, unknown>): unknown[] | null {
  const keys = [
    'disbursementByTelco',
    'disbursementsByTelco',
    'telcoDisbursements',
    'byTelco',
    'disbursementByNetwork',
    'mnoDisbursements',
  ];
  for (const k of keys) {
    const v = vol[k];
    if (Array.isArray(v) && v.length) return v;
  }
  if (legacy) {
    const legacyKeys = ['disbursementPerNetwork', 'disbursement_by_network', 'networkDisbursements'];
    for (const k of legacyKeys) {
      const v = (legacy as any)[k];
      if (Array.isArray(v) && v.length) return v;
    }
  }
  return null;
}

export function buildTelcoDisbursementRows(vol: Record<string, unknown>, legacy?: Record<string, unknown>): TelcoDisbursementRow[] {
  const arr = pickTelcoArrays(vol, legacy);
  if (!arr) return [];

  const rows: TelcoDisbursementRow[] = arr.map((item: any, idx: number) => {
    const network = String(
      item.network ?? item.telco ?? item.name ?? item.operator ?? item.mno ?? item.label ?? `Network ${idx + 1}`,
    ).trim();
    const loanCount = safeNum(item.loanCount ?? item.count ?? item.disbursementCount ?? item.loans ?? item.volumeCount);
    let volumeGHS = safeNum(item.volumeGHS ?? item.volumeGhs ?? item.amount ?? item.totalAmount ?? item.rawVolume);
    // Legacy pie: value = share %, rawVolume = GHS
    if (!volumeGHS && item.rawVolume !== undefined) volumeGHS = safeNum(item.rawVolume);
    const plainVal = safeNum(item.value);
    if (!volumeGHS && plainVal > 100) volumeGHS = plainVal;
    const sharePercent = safeNum(item.sharePercent ?? item.percentage ?? item.percent ?? item.share);
    return { network: network || 'Unknown', loanCount, volumeGHS, sharePercent };
  });

  const volSum = rows.reduce((s, r) => s + r.volumeGHS, 0);
  const countSum = rows.reduce((s, r) => s + r.loanCount, 0);

  return rows
    .map((r) => {
      let pct = r.sharePercent;
      if (pct <= 0 && volSum > 0 && r.volumeGHS > 0) pct = (r.volumeGHS / volSum) * 100;
      if (pct <= 0 && countSum > 0 && r.loanCount > 0) pct = (r.loanCount / countSum) * 100;
      return { ...r, sharePercent: pct };
    })
    .sort((a, b) => b.volumeGHS - a.volumeGHS || b.loanCount - a.loanCount);
}

function mapLiquiditySeries(source: unknown[]): Array<{ month: string; disbursed: number; collected: number; net: number }> {
  return source.map((m: any) => {
    const disbursed = safeNum(m.disbursed ?? m.disbursement ?? m.outflow);
    const collected = safeNum(m.collected ?? m.collectedAmount ?? m.repaid ?? m.inflow);
    return {
      month: String(m.month ?? m._id?.month ?? m.period ?? ''),
      disbursed,
      collected,
      net: m.net !== undefined ? safeNum(m.net) : disbursed - collected,
    };
  });
}

function patchVolumeShape(x: Record<string, unknown>, legacy?: Record<string, unknown>, repayment?: Record<string, unknown>): void {
  let rc = normalizeRepaymentChannels(x);
  const hasRepay = rc.channels.some((c) => c.transactionCount > 0 || c.volumeGHS > 0);
  if (!hasRepay && repayment) {
    rc = normalizeRepaymentChannels(repayment);
  }
  x.repaymentChannels = rc;

  const dvc = x.disbursementVsCollection;
  if (!Array.isArray(dvc) || dvc.length === 0) {
    const alt = x.disbursementVsCollectionSeries ?? x.monthlyFlow ?? x.liquidity;
    const legLiq = legacy?.liquidity;
    const source =
      Array.isArray(alt) && alt.length
        ? alt
        : Array.isArray(legLiq) && legLiq.length
          ? legLiq
          : null;
    if (source) {
      x.disbursementVsCollection = mapLiquiditySeries(source);
    }
  }

  x.disbursementByTelco = buildTelcoDisbursementRows(x, legacy);
}

export function normalizeSummaryPayload(raw: unknown): unknown {
  if (!isPlainObject(raw as object)) return raw;
  const x = deepCamelKeys(raw) as Record<string, unknown>;
  patchSummaryShape(x);
  return x;
}

export function normalizePerformancePayload(raw: unknown): unknown {
  if (!isPlainObject(raw as object)) return raw;
  const x = deepCamelKeys(raw) as Record<string, unknown>;
  patchPerformanceShape(x);
  return x;
}

export function normalizeDistributionPayload(raw: unknown): unknown {
  if (!isPlainObject(raw as object)) return raw;
  const x = deepCamelKeys(raw) as Record<string, unknown>;
  if (Array.isArray(x.tierDistribution)) {
    x.tierDistribution = { totalUsers: 0, byTier: x.tierDistribution };
  }
  const td = x.tierDistribution as Record<string, unknown> | undefined;
  if (td && !td.byTier && (td as { by_tier?: unknown }).by_tier) {
    td.byTier = (td as { by_tier: unknown }).by_tier;
  }

  const sg = x.signupGrowth;
  if (!Array.isArray(sg) || sg.length === 0) {
    const growth = x.growth;
    if (Array.isArray(growth) && growth.length) x.signupGrowth = growth;
  }

  const geo = x.geographicDistribution;
  if (!Array.isArray(geo) || geo.length === 0) {
    const regions = x.regions;
    if (Array.isArray(regions) && regions.length) {
      x.geographicDistribution = regions.map((r: any) => ({
        region: String(r.region ?? r.name ?? r._id ?? ''),
        userCount: safeNum(r.userCount ?? r.count ?? r.users),
        repaymentRate: safeNum(r.repaymentRate ?? r.rate ?? r.repayment),
      }));
    }
  }

  return x;
}

export function normalizeVolumePayload(raw: unknown, legacy?: unknown, repayment?: unknown): unknown {
  const base = isPlainObject(raw as object) ? raw : {};
  const x = deepCamelKeys(base) as Record<string, unknown>;
  const leg = isPlainObject(legacy as object) ? (deepCamelKeys(legacy) as Record<string, unknown>) : undefined;
  const rep = isPlainObject(repayment as object) ? (deepCamelKeys(repayment) as Record<string, unknown>) : undefined;
  patchVolumeShape(x, leg, rep);
  return x;
}
