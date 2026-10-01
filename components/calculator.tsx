import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Copy,
  RotateCcw,
} from "lucide-react";
import {
  calculate,
  formatLev,
  formatPct,
  formatPrice,
  formatQty,
  formatUsd,
  parseNum,
  recipeText,
  type CalcOk,
  type Side,
} from "@/lib/calc";
import { COPY, type Lang } from "@/lib/copy";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "slfit:v1";

const EXAMPLE = {
  side: "short" as Side,
  entry: "0.0110",
  sl: "0.0113",
  risk: "10",
  wallet: "",
  bufferOn: false,
  feesOn: false,
};

type Saved = {
  lang: Lang;
  side: Side;
  entry: string;
  sl: string;
  risk: string;
  wallet: string;
  bufferOn: boolean;
  feesOn: boolean;
};

function loadSaved(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Saved;
  } catch {
    return {};
  }
}

function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M4 8h24M4 24h24"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16 8v16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  prefix,
  id,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  id: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex h-12 items-center rounded-md border border-border bg-muted px-4 focus-within:border-foreground/35">
        {prefix ? (
          <span className="mr-2 font-mono text-sm text-subtle">{prefix}</span>
        ) : null}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-lg tabular text-foreground outline-none placeholder:text-subtle"
        />
      </div>
      {hint ? <p className="text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}

function Stat({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-muted px-4 py-3">
      <span className="text-xs font-medium text-subtle">{label}</span>
      <span
        className={cn(
          "text-base text-foreground",
          mono && "font-mono tabular",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PriceRail({
  result,
  entry,
  sl,
}: {
  result: CalcOk;
  entry: number;
  sl: number;
}) {
  const high = Math.max(entry, sl);
  const low = Math.min(entry, sl);
  const highIsSl = sl === high;
  return (
    <div className="relative flex gap-4 rounded-lg bg-muted px-4 py-5">
      <div className="flex w-3 flex-col items-center">
        <span
          className={cn(
            "size-2.5 rounded-full",
            highIsSl
              ? result.side === "short"
                ? "bg-short"
                : "bg-long"
              : "bg-foreground",
          )}
        />
        <span className="w-px flex-1 bg-border" />
        <span
          className={cn(
            "size-2.5 rounded-full",
            !highIsSl
              ? result.side === "short"
                ? "bg-short"
                : "bg-long"
              : "bg-foreground",
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-subtle">
            {highIsSl ? "SL" : "Entry"}
          </span>
          <span className="font-mono tabular text-base text-foreground">
            {formatPrice(high)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {formatPct(result.slPct)}
          </span>
          <span className="font-mono tabular text-sm text-foreground">
            {formatUsd(result.notional * result.slPct)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-subtle">
            {highIsSl ? "Entry" : "SL"}
          </span>
          <span className="font-mono tabular text-base text-foreground">
            {formatPrice(low)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Calculator() {
  const [lang, setLang] = useState<Lang>("ur");
  const [side, setSide] = useState<Side>(EXAMPLE.side);
  const [entry, setEntry] = useState(EXAMPLE.entry);
  const [sl, setSl] = useState(EXAMPLE.sl);
  const [risk, setRisk] = useState(EXAMPLE.risk);
  const [wallet, setWallet] = useState(EXAMPLE.wallet);
  const [bufferOn, setBufferOn] = useState(EXAMPLE.bufferOn);
  const [feesOn, setFeesOn] = useState(EXAMPLE.feesOn);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const t = COPY[lang];

  useEffect(() => {
    const saved = loadSaved();
    if (saved.lang === "en" || saved.lang === "ur") setLang(saved.lang);
    if (saved.side === "long" || saved.side === "short") setSide(saved.side);
    if (saved.entry) setEntry(saved.entry);
    if (saved.sl) setSl(saved.sl);
    if (saved.risk) setRisk(saved.risk);
    if (typeof saved.wallet === "string") setWallet(saved.wallet);
    if (typeof saved.bufferOn === "boolean") setBufferOn(saved.bufferOn);
    if (typeof saved.feesOn === "boolean") setFeesOn(saved.feesOn);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: Saved = {
      lang,
      side,
      entry,
      sl,
      risk,
      wallet,
      bufferOn,
      feesOn,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  }, [hydrated, lang, side, entry, sl, risk, wallet, bufferOn, feesOn]);

  const result = useMemo(() => {
    const e = parseNum(entry);
    const s = parseNum(sl);
    const r = parseNum(risk);
    if (e == null || s == null || r == null) {
      return { ok: false as const, reason: "invalid" as const };
    }
    const w = wallet.trim() === "" ? null : parseNum(wallet);
    if (wallet.trim() !== "" && w == null) {
      return { ok: false as const, reason: "invalid" as const };
    }
    return calculate({
      side,
      entry: e,
      sl: s,
      risk: r,
      availableMargin: w,
      bufferPct: bufferOn ? 10 : 0,
      takerFeePct: feesOn ? 0.04 : 0,
    });
  }, [side, entry, sl, risk, wallet, bufferOn, feesOn]);

  function loadExample() {
    setSide(EXAMPLE.side);
    setEntry(EXAMPLE.entry);
    setSl(EXAMPLE.sl);
    setRisk(EXAMPLE.risk);
    setWallet(EXAMPLE.wallet);
    setBufferOn(EXAMPLE.bufferOn);
    setFeesOn(EXAMPLE.feesOn);
  }

  async function copySetup() {
    if (!result.ok) return;
    const text = recipeText({ side, entry, sl, risk, result });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  const failMessage =
    !result.ok && result.reason === "same"
      ? t.same
      : !result.ok && result.reason === "long-sl"
        ? t.longSl
        : !result.ok && result.reason === "short-sl"
          ? t.shortSl
          : !result.ok
            ? t.invalid
            : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-foreground">
            <Mark className="size-7" />
            <p className="text-sm font-medium tracking-wide text-muted-foreground">
              {t.brand}
            </p>
          </div>
          <h1 className="max-w-xl text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl">
            {t.tagline}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-1">
            <button
              type="button"
              className={cn(
                "pressable h-10 min-w-11 rounded-sm px-3 text-sm font-medium",
                lang === "ur"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
              onClick={() => setLang("ur")}
            >
              {t.langUr}
            </button>
            <button
              type="button"
              className={cn(
                "pressable h-10 min-w-11 rounded-sm px-3 text-sm font-medium",
                lang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
              onClick={() => setLang("en")}
            >
              {t.langEn}
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 lg:col-span-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("long")}
              className={cn(
                "pressable flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium",
                side === "long"
                  ? "border-long/40 bg-long/10 text-long"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <ArrowUpRight className="size-4" />
              {t.long}
            </button>
            <button
              type="button"
              onClick={() => setSide("short")}
              className={cn(
                "pressable flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium",
                side === "short"
                  ? "border-short/40 bg-short/10 text-short"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <ArrowDownRight className="size-4" />
              {t.short}
            </button>
          </div>
          <p className="text-xs text-subtle">
            {side === "long" ? t.hintLong : t.hintShort}
          </p>

          <Field
            id="entry"
            label={t.entry}
            value={entry}
            onChange={setEntry}
          />
          <Field id="sl" label={t.stop} value={sl} onChange={setSl} />
          <Field
            id="risk"
            label={t.risk}
            hint={t.riskHint}
            prefix="$"
            value={risk}
            onChange={setRisk}
          />
          <Field
            id="wallet"
            label={t.wallet}
            hint={t.walletHint}
            prefix="$"
            value={wallet}
            onChange={setWallet}
          />

          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{t.buffer}</span>
              <div className="flex rounded-md border border-border p-1">
                <button
                  type="button"
                  className={cn(
                    "pressable h-10 min-w-11 rounded-sm px-3 text-sm",
                    !bufferOn
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setBufferOn(false)}
                >
                  {t.bufferOff}
                </button>
                <button
                  type="button"
                  className={cn(
                    "pressable h-10 min-w-11 rounded-sm px-3 text-sm",
                    bufferOn
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setBufferOn(true)}
                >
                  {t.bufferOn}
                </button>
              </div>
            </div>
            <label className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{t.fees}</span>
              <button
                type="button"
                role="switch"
                aria-checked={feesOn}
                onClick={() => setFeesOn((v) => !v)}
                className={cn(
                  "pressable relative h-7 w-12 rounded-full border",
                  feesOn
                    ? "border-foreground/20 bg-primary"
                    : "border-border bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-6 rounded-full transition-transform duration-150",
                    feesOn
                      ? "translate-x-5 bg-primary-foreground"
                      : "translate-x-0.5 bg-muted-foreground",
                  )}
                />
              </button>
            </label>
          </div>

          <button
            type="button"
            onClick={loadExample}
            className="pressable inline-flex h-11 items-center justify-center gap-2 self-start text-sm text-muted-foreground"
          >
            <RotateCcw className="size-4" />
            {t.example}
          </button>
        </section>

        <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 lg:col-span-7">
          {failMessage ? (
            <p className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              {failMessage}
            </p>
          ) : result.ok ? (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                  {result.canOpenAt1x ? t.noLev : t.minLev}
                </p>
                <p
                  className={cn(
                    "font-mono tabular text-5xl font-medium tracking-tight sm:text-6xl",
                    result.canOpenAt1x
                      ? "text-foreground"
                      : result.side === "short"
                        ? "text-short"
                        : "text-long",
                  )}
                >
                  {result.canOpenAt1x ? "1x" : `${result.minLeverageToOpen}x`}
                </p>
                {result.canOpenAt1x ? null : (
                  <p className="font-mono text-sm text-subtle">
                    exact {formatLev(result.minLeverageExact)}
                    {result.usedDefaultMargin &&
                    Math.abs(result.classicLevExact - result.minLeverageExact) >
                      0.05
                      ? ` · ${t.classic} ${formatLev(result.classicLevExact)}`
                      : ""}
                  </p>
                )}
              </div>

              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                {result.canOpenAt1x ? t.openAt1x : t.needLev}
              </p>

              <PriceRail
                result={result}
                entry={parseNum(entry) ?? 0}
                sl={parseNum(sl) ?? 0}
              />

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label={t.position} value={formatUsd(result.notional)} />
                <Stat label={t.qty} value={formatQty(result.qty)} />
                <Stat label={t.margin} value={formatUsd(result.marginLocked)} />
                <Stat label={t.slMove} value={formatPct(result.slPct)} />
                <Stat label={t.liq} value={formatPrice(result.liqPrice)} />
                <Stat
                  label={t.isolate}
                  value={formatUsd(
                    result.usedDefaultMargin
                      ? result.isolatedMargin
                      : result.workingMargin,
                  )}
                />
              </div>

              <div className="rounded-lg border border-border px-4 py-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-subtle">
                  {t.recipeTitle}
                </p>
                <ol className="flex flex-col gap-2 font-mono text-sm tabular text-foreground">
                  <li>
                    {t.setLev}:{" "}
                    {result.canOpenAt1x ? "1x" : `${result.minLeverageToOpen}x`}
                  </li>
                  <li>
                    {t.placeQty}: {formatQty(result.qty)}
                  </li>
                  <li>
                    {t.isolate}: {formatUsd(result.marginLocked)}
                  </li>
                </ol>
              </div>

              {result.aboveSafeLev || !result.slHitsFirst ? (
                <p className="text-sm text-warn">{t.liqWarn}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t.slFirst}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={copySetup}
                  className="pressable inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? t.copied : t.copy}
                </button>
              </div>
            </>
          ) : null}

          <p className="mt-auto pt-2 text-xs leading-relaxed text-subtle">
            {t.footnote}
          </p>
        </section>
      </div>
    </div>
  );
}
