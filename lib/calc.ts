export type Side = "long" | "short";

export type CalcParams = {
  side: Side;
  entry: number;
  sl: number;
  risk: number;
  availableMargin: number | null;
  bufferPct: number;
  takerFeePct: number;
};

export type CalcFail = {
  ok: false;
  reason: "invalid" | "same" | "long-sl" | "short-sl";
};

export type CalcOk = {
  ok: true;
  side: Side;
  priceMove: number;
  slPct: number;
  notional: number;
  qty: number;
  workingMargin: number;
  isolatedMargin: number;
  minLeverageExact: number;
  minLeverageToOpen: number;
  canOpenAt1x: boolean;
  maxSafeLevExact: number;
  classicLevExact: number;
  levUsed: number;
  liqPrice: number;
  slHitsFirst: boolean;
  marginLocked: number;
  usedDefaultMargin: boolean;
  aboveSafeLev: boolean;
};

export type CalcResult = CalcOk | CalcFail;

const MMR = 0.004;

export function parseNum(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function calculate(p: CalcParams): CalcResult {
  if (!(p.entry > 0) || !(p.sl > 0) || !(p.risk > 0)) {
    return { ok: false, reason: "invalid" };
  }
  if (p.entry === p.sl) return { ok: false, reason: "same" };
  if (p.side === "long" && p.sl >= p.entry) {
    return { ok: false, reason: "long-sl" };
  }
  if (p.side === "short" && p.sl <= p.entry) {
    return { ok: false, reason: "short-sl" };
  }

  const priceMove = Math.abs(p.entry - p.sl);
  const slPct = priceMove / p.entry;
  const feeRate = (p.takerFeePct / 100) * 2;
  const denom = slPct + feeRate;
  if (!(denom > 0)) return { ok: false, reason: "invalid" };

  const notional = p.risk / denom;
  const qty = notional / p.entry;
  const classicLevExact = notional / p.risk;
  const maxSafeLevExact = 1 / (slPct + MMR);

  const usedDefaultMargin = !(p.availableMargin != null && p.availableMargin > 0);
  const buffer = Math.max(0, p.bufferPct) / 100;

  let workingMargin: number;
  if (!usedDefaultMargin) {
    workingMargin = p.availableMargin as number;
  } else if (buffer > 0) {
    const paddedSafe = 1 / (slPct * (1 + buffer) + MMR);
    const safeLev = Math.max(1, Math.floor(paddedSafe + 1e-9));
    workingMargin = notional / safeLev;
  } else {
    workingMargin = p.risk;
  }

  const minLeverageExact = notional / workingMargin;
  const canOpenAt1x = minLeverageExact <= 1 + 1e-12;
  const minLeverageToOpen = canOpenAt1x
    ? 1
    : Math.max(1, Math.ceil(minLeverageExact - 1e-9));
  const levUsed = minLeverageToOpen;
  const isolatedMargin = workingMargin;

  const liqPrice =
    p.side === "long"
      ? p.entry * (1 - 1 / levUsed + MMR)
      : p.entry * (1 + 1 / levUsed - MMR);

  const slHitsFirst =
    p.side === "long" ? p.sl > liqPrice : p.sl < liqPrice;
  const aboveSafeLev = levUsed > maxSafeLevExact + 1e-9;
  const marginLocked = notional / levUsed;

  return {
    ok: true,
    side: p.side,
    priceMove,
    slPct,
    notional,
    qty,
    workingMargin,
    isolatedMargin,
    minLeverageExact,
    minLeverageToOpen,
    canOpenAt1x,
    maxSafeLevExact,
    classicLevExact,
    levUsed,
    liqPrice,
    slHitsFirst,
    marginLocked,
    usedDefaultMargin,
    aboveSafeLev,
  };
}

function trimZeros(s: string): string {
  if (/[eE]/.test(s)) return s;
  return s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

export function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs >= 1000) return trimZeros(n.toFixed(2));
  if (abs >= 1) return trimZeros(n.toFixed(6));
  if (abs >= 0.0001) return trimZeros(n.toFixed(8));
  return trimZeros(n.toPrecision(6));
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const max = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: max,
  }).format(n);
}

export function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const max = abs >= 1000 ? 2 : abs >= 1 ? 4 : 8;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: max,
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatPct(frac: number): string {
  if (!Number.isFinite(frac)) return "—";
  const pct = frac * 100;
  const d = Math.abs(pct) >= 10 ? 2 : 3;
  return `${pct.toFixed(d)}%`;
}

export function formatLev(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return `${Math.round(n)}x`;
  if (n >= 10) return `${n.toFixed(1).replace(/\.0$/, "")}x`;
  return `${n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}x`;
}

export function recipeText(input: {
  side: Side;
  entry: string;
  sl: string;
  risk: string;
  result: CalcOk;
}): string {
  const { side, entry, sl, risk, result } = input;
  const parsedRisk = Number(risk);
  const riskUsd = Number.isFinite(parsedRisk)
    ? parsedRisk
    : result.notional * result.slPct;
  const lines = [
    `SL Fit`,
    `Side: ${side.toUpperCase()}`,
    `Entry: ${entry}`,
    `SL: ${sl}`,
    `Risk: ${formatUsd(riskUsd)}`,
    `Position: ${formatUsd(result.notional)}`,
    `Qty: ${formatQty(result.qty)}`,
    result.canOpenAt1x
      ? `Leverage: 1x (no extra leverage)`
      : `Leverage: ${result.minLeverageToOpen}x (min to open)`,
    `Margin locked: ${formatUsd(result.marginLocked)}`,
    `SL distance: ${formatPct(result.slPct)}`,
    `If isolating only the risk: ${formatLev(result.classicLevExact)}`,
  ];
  return lines.join("\n");
}
