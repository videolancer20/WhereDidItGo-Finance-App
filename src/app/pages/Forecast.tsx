import { useState, useMemo } from "react";
import { useFinance } from "../data/financeStore";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { formatCurrency } from "../utils";
import {
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp,
  Zap, AlertTriangle, Activity, Shield
} from "lucide-react";

// ════════════════════════════════════════════════════════════
//  PURE UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════

/** Deterministic PRNG — Mulberry32. Produces repeatable random sequences so
 *  the Monte Carlo chart doesn't flicker on React re-renders. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform — converts two uniform samples into a standard
 *  normal variate N(0,1). Used for Monte Carlo noise injection. */
function normalRandom(rng: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Convert any amount from a source currency to the user's display currency,
 *  routing through USD as the base. Pure function — no closures. */
function convertAmount(
  amount: number,
  currency: string,
  exchangeRates: Record<string, number>,
  globalCurrency: string,
): number {
  const rate = exchangeRates[currency] || 1;
  const amtUSD = amount / rate;
  const target =
    globalCurrency === "MULTI" ? 1 : exchangeRates[globalCurrency] || 1;
  return amtUSD * target;
}

// ════════════════════════════════════════════════════════════
//  CUSTOM TOOLTIP
// ════════════════════════════════════════════════════════════

function ForecastTooltip({ active, payload, displayCurrency, events }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const dateLabel = new Date(data.date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric" },
  );
  const dayEvents: any[] = events?.[data.date] || [];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl min-w-[210px]">
      <p className="text-zinc-400 text-xs mb-2 font-medium">{dateLabel}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[11px] text-zinc-500">Optimistic</span>
          <span className="text-[11px] text-emerald-400 font-medium">
            {formatCurrency(data.p90, displayCurrency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-zinc-300 font-semibold">Expected</span>
          <span className="text-sm text-indigo-400 font-bold">
            {formatCurrency(data.p50, displayCurrency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[11px] text-zinc-500">Pessimistic</span>
          <span className="text-[11px] text-rose-400 font-medium">
            {formatCurrency(data.p10, displayCurrency)}
          </span>
        </div>
      </div>
      {dayEvents.length > 0 && (
        <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1">
          {dayEvents.map((ev: any, i: number) => (
            <div
              key={i}
              className={`text-[10px] ${ev.type === "income" ? "text-emerald-400" : "text-rose-400"}`}
            >
              {ev.type === "income" ? "↑" : "↓"} {ev.name}:{" "}
              {formatCurrency(ev.amount, displayCurrency)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export function Forecast() {
  const {
    transactions,
    subscriptions,
    accounts,
    accountBalances,
    exchangeRates,
    globalCurrency,
  } = useFinance();

  const [days, setDays] = useState(30);
  const [includeIncome, setIncludeIncome] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const displayCurrency = globalCurrency === "MULTI" ? "USD" : globalCurrency;
  const LOOKBACK_DAYS = 90;

  // ─── Starting Balance (currency-corrected) ────────────────
  const currentTotalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const bal = accountBalances[acc.id] ?? acc.openingBalance;
      return (
        sum +
        convertAmount(bal, acc.currency || "USD", exchangeRates, globalCurrency)
      );
    }, 0);
  }, [accounts, accountBalances, exchangeRates, globalCurrency]);

  // ═══════════════════════════════════════════════════════════
  //  PREPROCESSING — Build daily cash-flow series (90 days)
  // ═══════════════════════════════════════════════════════════
  const dailySeries = useMemo(() => {
    const now = new Date();
    const lookbackStart = new Date(now);
    lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_DAYS);

    const nonTransferTxns = transactions.filter(
      (t) =>
        t.type !== "transfer" &&
        new Date(t.date) >= lookbackStart &&
        new Date(t.date) <= now,
    );

    // Initialise every day in the window
    const dayMap: Record<
      string,
      { income: number; expense: number; dow: number }
    > = {};
    for (let i = 0; i < LOOKBACK_DAYS; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dayMap[dateStr] = { income: 0, expense: 0, dow: d.getDay() };
    }

    // Populate with real transactions
    nonTransferTxns.forEach((t) => {
      const dateStr = t.date;
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = {
          income: 0,
          expense: 0,
          dow: new Date(dateStr + "T00:00:00").getDay(),
        };
      }
      const converted = Math.abs(
        convertAmount(
          t.amount,
          t.currency || "USD",
          exchangeRates,
          globalCurrency,
        ),
      );
      if (t.type === "income") dayMap[dateStr].income += converted;
      if (t.type === "expense") dayMap[dateStr].expense += converted;
    });

    return Object.entries(dayMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, exchangeRates, globalCurrency]);

  // ═══════════════════════════════════════════════════════════
  //  LAYER 5 — Anomaly Detection & Filtering
  //  Uses IQR fences to dampen one-off spikes.
  // ═══════════════════════════════════════════════════════════
  const { filteredSeries, anomalies } = useMemo(() => {
    const expenses = dailySeries.map((d) => d.expense);
    const sorted = [...expenses].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0;
    const iqr = q3 - q1;
    const upperFence = q3 + 2.5 * iqr;
    const median = sorted[Math.floor(sorted.length * 0.5)] || 0;

    const anomalyDays: {
      date: string;
      original: number;
      dampened: number;
    }[] = [];

    const filtered = dailySeries.map((d) => {
      if (d.expense > upperFence && d.expense > 0 && iqr > 0) {
        anomalyDays.push({
          date: d.date,
          original: d.expense,
          dampened: median,
        });
        return { ...d, expense: median };
      }
      return d;
    });

    return { filteredSeries: filtered, anomalies: anomalyDays };
  }, [dailySeries]);

  // ═══════════════════════════════════════════════════════════
  //  LAYER 2 — Recurring Income Detection
  //  Groups income by description, detects cadences, projects.
  // ═══════════════════════════════════════════════════════════
  const { recurringStreams, variableDailyIncome } = useMemo(() => {
    const incomeTxns = transactions.filter(
      (t) => t.type === "income" && t.categoryId !== "transfer",
    );

    // Group by normalised description
    const groups: Record<
      string,
      { amounts: number[]; dates: string[]; originalName: string }
    > = {};
    incomeTxns.forEach((t) => {
      const key = t.description.trim().toLowerCase();
      if (!groups[key])
        groups[key] = {
          amounts: [],
          dates: [],
          originalName: t.description,
        };
      groups[key].amounts.push(
        Math.abs(
          convertAmount(
            t.amount,
            t.currency || "USD",
            exchangeRates,
            globalCurrency,
          ),
        ),
      );
      groups[key].dates.push(t.date);
    });

    const streams: {
      name: string;
      amount: number;
      cadenceDays: number;
      cadenceLabel: string;
      nextDate: string;
    }[] = [];
    let capturedMonthly = 0;

    Object.values(groups).forEach(({ amounts, dates, originalName }) => {
      if (dates.length < 2) return;

      const sortedDates = [...dates].sort();
      const intervals: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        const diff =
          (new Date(sortedDates[i]).getTime() -
            new Date(sortedDates[i - 1]).getTime()) /
          86400000;
        intervals.push(diff);
      }
      const sortedIntervals = [...intervals].sort((a, b) => a - b);
      const medianInterval =
        sortedIntervals[Math.floor(sortedIntervals.length / 2)];

      // Match to known cadences
      let cadenceDays = 0;
      let cadenceLabel = "";
      if (medianInterval >= 5 && medianInterval <= 9) {
        cadenceDays = 7;
        cadenceLabel = "Weekly";
      } else if (medianInterval >= 12 && medianInterval <= 17) {
        cadenceDays = 14;
        cadenceLabel = "Biweekly";
      } else if (medianInterval >= 26 && medianInterval <= 35) {
        cadenceDays = 30;
        cadenceLabel = "Monthly";
      } else if (medianInterval >= 80 && medianInterval <= 100) {
        cadenceDays = 90;
        cadenceLabel = "Quarterly";
      } else if (medianInterval >= 350 && medianInterval <= 380) {
        cadenceDays = 365;
        cadenceLabel = "Annual";
      }
      if (cadenceDays === 0) return;

      const sortedAmts = [...amounts].sort((a, b) => a - b);
      const medianAmt = sortedAmts[Math.floor(sortedAmts.length / 2)];

      // Walk next date forward until it's in the future
      const now = new Date();
      const lastDate = new Date(
        sortedDates[sortedDates.length - 1] + "T00:00:00",
      );
      const next = new Date(lastDate);
      next.setDate(next.getDate() + cadenceDays);
      while (next <= now) next.setDate(next.getDate() + cadenceDays);

      streams.push({
        name: originalName,
        amount: medianAmt,
        cadenceDays,
        cadenceLabel,
        nextDate: next.toISOString().slice(0, 10),
      });
      capturedMonthly += medianAmt * (30 / cadenceDays);
    });

    // Variable income = whatever isn't captured by streams
    const totalDailyIncome =
      filteredSeries.reduce((s, d) => s + d.income, 0) /
      Math.max(filteredSeries.length, 1);
    const capturedDaily = capturedMonthly / 30;
    const variableDaily = Math.max(0, totalDailyIncome - capturedDaily);

    return { recurringStreams: streams, variableDailyIncome: variableDaily };
  }, [transactions, filteredSeries, exchangeRates, globalCurrency]);

  // ═══════════════════════════════════════════════════════════
  //  LAYER 3 — Day-of-Week Seasonal Factors + EWMA Trend
  // ═══════════════════════════════════════════════════════════
  const { dowFactors, ewmaLevel } = useMemo(() => {
    const dowSums = [0, 0, 0, 0, 0, 0, 0];
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];

    filteredSeries.forEach((d) => {
      dowSums[d.dow] += d.expense;
      dowCounts[d.dow]++;
    });

    const overallAvg =
      filteredSeries.reduce((s, d) => s + d.expense, 0) /
      Math.max(filteredSeries.length, 1);

    const factors = dowSums.map((sum, i) => {
      if (dowCounts[i] === 0 || overallAvg === 0) return 1.0;
      return sum / dowCounts[i] / overallAvg;
    });

    // Exponentially Weighted Moving Average (α = 0.15)
    const alpha = 0.15;
    let level =
      filteredSeries.length > 0 ? filteredSeries[0].expense : 0;
    filteredSeries.forEach((d) => {
      level = alpha * d.expense + (1 - alpha) * level;
    });

    return { dowFactors: factors, ewmaLevel: level };
  }, [filteredSeries]);

  // ═══════════════════════════════════════════════════════════
  //  LAYER 1 — Subscription Schedule Projection
  // ═══════════════════════════════════════════════════════════
  const { scheduledPayments, scheduledEvents } = useMemo(() => {
    const now = new Date();
    const payments: Record<string, number> = {};
    const events: Record<
      string,
      { name: string; amount: number; type: string }[]
    > = {};

    subscriptions
      .filter((s) => s.status === "active")
      .forEach((sub) => {
        const current = new Date(sub.nextDueDate + "T00:00:00");
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + days);

        const converted = Math.abs(
          convertAmount(
            sub.amount,
            sub.currency || "USD",
            exchangeRates,
            globalCurrency,
          ),
        );

        while (current <= endDate) {
          if (current >= now) {
            const ds = current.toISOString().slice(0, 10);
            payments[ds] = (payments[ds] || 0) + converted;
            if (!events[ds]) events[ds] = [];
            events[ds].push({
              name: sub.name,
              amount: converted,
              type: "expense",
            });
          }
          if (sub.frequency === "monthly")
            current.setMonth(current.getMonth() + 1);
          else if (sub.frequency === "weekly")
            current.setDate(current.getDate() + 7);
          else if (sub.frequency === "yearly")
            current.setFullYear(current.getFullYear() + 1);
          else
            current.setDate(
              current.getDate() + (sub.customIntervalDays || 30),
            );
        }
      });

    return { scheduledPayments: payments, scheduledEvents: events };
  }, [subscriptions, days, exchangeRates, globalCurrency]);

  // ─── Project recurring income into event map ──────────────
  const incomeEvents = useMemo(() => {
    const now = new Date();
    const events: Record<
      string,
      { name: string; amount: number; type: string }[]
    > = {};
    if (!includeIncome) return events;

    recurringStreams.forEach((stream) => {
      const next = new Date(stream.nextDate + "T00:00:00");
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + days);
      while (next <= endDate) {
        const ds = next.toISOString().slice(0, 10);
        if (!events[ds]) events[ds] = [];
        events[ds].push({
          name: stream.name,
          amount: stream.amount,
          type: "income",
        });
        next.setDate(next.getDate() + stream.cadenceDays);
      }
    });
    return events;
  }, [recurringStreams, includeIncome, days]);

  // Merge all events into one map (for tooltip)
  const allEvents = useMemo(() => {
    const merged: Record<string, any[]> = {};
    [scheduledEvents, incomeEvents].forEach((evMap) => {
      Object.entries(evMap).forEach(([date, evs]) => {
        if (!merged[date]) merged[date] = [];
        merged[date].push(...evs);
      });
    });
    return merged;
  }, [scheduledEvents, incomeEvents]);

  // ═══════════════════════════════════════════════════════════
  //  LAYER 4 — Monte Carlo Simulation  (200 paths)
  //  Combines all layers into P10 / P50 / P90 projections.
  // ═══════════════════════════════════════════════════════════
  const { forecastData, endStats } = useMemo(() => {
    const now = new Date();
    const NUM_SIMS = 200;

    // Daily net cash-flow variance from history
    const dailyNets = filteredSeries.map((d) => d.income - d.expense);
    const meanNet =
      dailyNets.reduce((s, v) => s + v, 0) / Math.max(dailyNets.length, 1);
    const variance =
      dailyNets.reduce((s, v) => s + (v - meanNet) ** 2, 0) /
      Math.max(dailyNets.length - 1, 1);
    const stddev = Math.sqrt(variance);

    // Build recurring-income schedule lookup
    const incomeSchedule: Record<string, number> = {};
    if (includeIncome) {
      recurringStreams.forEach((stream) => {
        const next = new Date(stream.nextDate + "T00:00:00");
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + days);
        while (next <= endDate) {
          const ds = next.toISOString().slice(0, 10);
          incomeSchedule[ds] = (incomeSchedule[ds] || 0) + stream.amount;
          next.setDate(next.getDate() + stream.cadenceDays);
        }
      });
    }

    // Pre-compute date strings & DOW for each forecast day
    const dayMeta: { dateStr: string; dow: number }[] = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      dayMeta.push({ dateStr: d.toISOString().slice(0, 10), dow: d.getDay() });
    }

    // Run simulations
    const allPaths: number[][] = [];
    const rng = mulberry32(Math.round(currentTotalBalance * 100) + days);

    for (let sim = 0; sim < NUM_SIMS; sim++) {
      const path: number[] = [];
      let balance = currentTotalBalance;

      for (let i = 0; i <= days; i++) {
        if (i === 0) {
          path.push(balance);
          continue;
        }
        const { dateStr, dow } = dayMeta[i];

        // Deterministic layers
        const recurringIncome = incomeSchedule[dateStr] || 0;
        const varIncome = includeIncome ? variableDailyIncome : 0;
        const subPayment = scheduledPayments[dateStr] || 0;
        const seasonalExpense = ewmaLevel * dowFactors[dow];
        const deterministicNet =
          recurringIncome + varIncome - subPayment - seasonalExpense;

        // Stochastic layer — noise dampened by 0.5 to avoid wild swings
        const noise = normalRandom(rng) * stddev * 0.5;

        balance += deterministicNet + noise;
        path.push(balance);
      }
      allPaths.push(path);
    }

    // Extract percentiles at each time-step
    const data: { date: string; p10: number; p50: number; p90: number }[] = [];
    for (let i = 0; i <= days; i++) {
      const values = allPaths.map((p) => p[i]).sort((a, b) => a - b);
      data.push({
        date: dayMeta[i].dateStr,
        p10: values[Math.floor(values.length * 0.1)],
        p50: values[Math.floor(values.length * 0.5)],
        p90: values[Math.floor(values.length * 0.9)],
      });
    }

    // End-of-horizon statistics
    const endVals = allPaths
      .map((p) => p[p.length - 1])
      .sort((a, b) => a - b);

    return {
      forecastData: data,
      endStats: {
        p10: endVals[Math.floor(endVals.length * 0.1)],
        p50: endVals[Math.floor(endVals.length * 0.5)],
        p90: endVals[Math.floor(endVals.length * 0.9)],
      },
    };
  }, [
    currentTotalBalance,
    filteredSeries,
    recurringStreams,
    variableDailyIncome,
    dowFactors,
    ewmaLevel,
    scheduledPayments,
    includeIncome,
    days,
  ]);

  // ─── Derived KPIs ─────────────────────────────────────────
  const monthlyBurnRate = ewmaLevel * 30;
  const totalLookbackIncome = filteredSeries.reduce(
    (s, d) => s + d.income,
    0,
  );
  const totalLookbackExpense = filteredSeries.reduce(
    (s, d) => s + d.expense,
    0,
  );
  const savingsRate =
    totalLookbackIncome > 0
      ? ((totalLookbackIncome - totalLookbackExpense) /
          totalLookbackIncome) *
        100
      : 0;
  const difference = endStats.p50 - currentTotalBalance;

  // ─── Payday reference lines for chart ─────────────────────
  const nextPaydays = useMemo(() => {
    const now = new Date();
    const paydays: string[] = [];
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

    recurringStreams.forEach((stream) => {
      const next = new Date(stream.nextDate + "T00:00:00");
      while (next <= endDate) {
        paydays.push(next.toISOString().slice(0, 10));
        next.setDate(next.getDate() + stream.cadenceDays);
      }
    });
    return [...new Set(paydays)].sort();
  }, [recurringStreams, days]);

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-20">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Cash Flow Forecast
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Multi-layer probabilistic projection with confidence bands.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Scenario Toggle */}
          <button
            onClick={() => setIncludeIncome(!includeIncome)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              includeIncome
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
            }`}
          >
            <div
              className={`w-6 h-3.5 rounded-full transition-colors relative ${includeIncome ? "bg-emerald-500" : "bg-zinc-700"}`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-all ${includeIncome ? "left-3" : "left-0.5"}`}
              />
            </div>
            Income {includeIncome ? "ON" : "OFF"}
          </button>

          {/* Horizon Selector */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  days === d
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Starting Balance */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Starting Balance
          </p>
          <h3 className="text-2xl font-semibold text-zinc-100">
            {formatCurrency(currentTotalBalance, displayCurrency)}
          </h3>
        </div>

        {/* Projected Balance */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Projected (Day {days})
          </p>
          <h3
            className={`text-2xl font-semibold ${endStats.p50 >= 0 ? "text-zinc-100" : "text-rose-400"}`}
          >
            {formatCurrency(endStats.p50, displayCurrency)}
          </h3>
          <div className="flex items-center gap-1 mt-1.5">
            {difference >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span
              className={`text-xs font-medium ${difference >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {formatCurrency(Math.abs(difference), displayCurrency)}
            </span>
          </div>
        </div>

        {/* Confidence Range */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              80% Confidence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-rose-400">
              {formatCurrency(endStats.p10, displayCurrency)}
            </span>
            <span className="text-zinc-600">→</span>
            <span className="text-sm font-medium text-emerald-400">
              {formatCurrency(endStats.p90, displayCurrency)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1.5">
            P10 – P90 range at day {days}
          </p>
        </div>

        {/* Monthly Burn Rate */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Monthly Burn
            </p>
          </div>
          <h3 className="text-2xl font-semibold text-rose-400">
            {formatCurrency(monthlyBurnRate, displayCurrency)}
          </h3>
          <p className="text-[10px] text-zinc-600 mt-1.5">
            Savings rate:{" "}
            <span
              className={
                savingsRate >= 0 ? "text-emerald-400" : "text-rose-400"
              }
            >
              {savingsRate.toFixed(1)}%
            </span>{" "}
            (90d)
          </p>
        </div>
      </div>

      {/* ─── Chart ──────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">
            Balance Projection
          </h2>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-indigo-500/20 border border-indigo-500/40" />
              <span className="text-zinc-500">80% Band</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-indigo-400 rounded" />
              <span className="text-zinc-500">Expected</span>
            </div>
            {includeIncome && nextPaydays.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-0 h-3 border-l border-dashed border-emerald-500/60" />
                <span className="text-zinc-500">Payday</span>
              </div>
            )}
          </div>
        </div>
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={forecastData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="bandGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#6366f1"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="#6366f1"
                    stopOpacity={0.03}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  new Date(val + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                minTickGap={40}
              />
              <YAxis
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  if (Math.abs(val) >= 1_000_000)
                    return `$${(val / 1_000_000).toFixed(1)}M`;
                  if (Math.abs(val) >= 1000)
                    return `$${(val / 1000).toFixed(0)}k`;
                  return `$${val.toFixed(0)}`;
                }}
              />
              <Tooltip
                content={
                  <ForecastTooltip
                    displayCurrency={displayCurrency}
                    events={allEvents}
                  />
                }
              />

              {/* Confidence band: P90 area, then P10 mask */}
              <Area
                type="monotone"
                dataKey="p90"
                stroke="none"
                fill="url(#bandGradient)"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="p10"
                stroke="none"
                fill="#18181b"
                fillOpacity={1}
                isAnimationActive={false}
              />

              {/* Expected (median) line */}
              <Line
                type="monotone"
                dataKey="p50"
                stroke="#818cf8"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />

              {/* Payday reference lines */}
              {includeIncome &&
                nextPaydays.slice(0, 8).map((date) => (
                  <ReferenceLine
                    key={date}
                    x={date}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeOpacity={0.35}
                  />
                ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Breakdown Panel ────────────────────────────── */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl backdrop-blur-sm overflow-hidden">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/20 transition-colors"
        >
          <h2 className="text-sm font-semibold text-zinc-300">
            Forecast Breakdown & Insights
          </h2>
          {showBreakdown ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {showBreakdown && (
          <div className="px-5 pb-5 space-y-6 border-t border-zinc-800/60 pt-4">
            {/* Detected Income Streams */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-medium text-zinc-200">
                  Detected Recurring Income
                </h3>
              </div>
              {recurringStreams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recurringStreams.map((stream, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {stream.name}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {stream.cadenceLabel} • Next:{" "}
                          {new Date(
                            stream.nextDate + "T00:00:00",
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-400">
                        {formatCurrency(stream.amount, displayCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600">
                  No recurring income patterns detected yet. Need ≥ 2
                  occurrences of the same income source to detect a cadence. All
                  income is treated as variable.
                </p>
              )}
            </div>

            {/* Day-of-Week Spending Factors */}
            <div>
              <h3 className="text-sm font-medium text-zinc-200 mb-3">
                Spending by Day of Week
              </h3>
              <div className="flex gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day, i) => {
                    const factor = dowFactors[i];
                    const barHeight = Math.min(factor * 40, 80);
                    const isHigh = factor > 1.2;
                    const isLow = factor < 0.8;
                    return (
                      <div
                        key={day}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className="w-full flex items-end justify-center h-16">
                          <div
                            className={`w-full max-w-[32px] rounded-t-md transition-all ${
                              isHigh
                                ? "bg-rose-500/40"
                                : isLow
                                  ? "bg-emerald-500/30"
                                  : "bg-indigo-500/30"
                            }`}
                            style={{ height: `${barHeight}px` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {day}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            isHigh
                              ? "text-rose-400"
                              : isLow
                                ? "text-emerald-400"
                                : "text-zinc-400"
                          }`}
                        >
                          {factor.toFixed(2)}x
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Filtered Anomalies */}
            {anomalies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-medium text-zinc-200">
                    Anomalies Filtered ({anomalies.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {anomalies.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs"
                    >
                      <span className="text-zinc-400">
                        {new Date(a.date + "T00:00:00").toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 line-through">
                          {formatCurrency(a.original, displayCurrency)}
                        </span>
                        <span className="text-zinc-300">
                          → {formatCurrency(a.dampened, displayCurrency)}{" "}
                          (dampened)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
