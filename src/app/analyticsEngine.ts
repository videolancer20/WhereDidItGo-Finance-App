// ════════════════════════════════════════════════════════════════
//  FlowLedger Analytics Engine
//  Pure mathematical utilities shared across all pages.
//  No React dependencies — fully testable standalone.
// ════════════════════════════════════════════════════════════════

// ─── EWMA — Exponentially Weighted Moving Average ───────────

/** Returns the final EWMA level of a numeric series. */
export function ewma(data: number[], alpha: number = 0.15): number {
  if (data.length === 0) return 0;
  let level = data[0];
  for (let i = 1; i < data.length; i++) {
    level = alpha * data[i] + (1 - alpha) * level;
  }
  return level;
}

/** Returns the full EWMA series (same length as input). */
export function ewmaSeries(data: number[], alpha: number = 0.15): number[] {
  if (data.length === 0) return [];
  const result: number[] = [data[0]];
  let level = data[0];
  for (let i = 1; i < data.length; i++) {
    level = alpha * data[i] + (1 - alpha) * level;
    result.push(level);
  }
  return result;
}

// ─── Linear Regression ──────────────────────────────────────

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
}

/** Ordinary Least Squares linear regression. */
export function linearRegression(
  points: { x: number; y: number }[],
): RegressionResult {
  const n = points.length;
  if (n < 2) {
    const y0 = points[0]?.y || 0;
    return { slope: 0, intercept: y0, r2: 0, predict: () => y0 };
  }

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;

  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const ssRes = points.reduce(
    (s, p) => s + (p.y - (slope * p.x + intercept)) ** 2,
    0,
  );
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, r2, predict: (x: number) => slope * x + intercept };
}

// ─── Rolling Average ────────────────────────────────────────

export function rollingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((s, v) => s + v, 0) / slice.length);
  }
  return result;
}

// ─── Z-Score Outlier Detection ──────────────────────────────

/** Returns indices of data points exceeding the z-score threshold. */
export function zScoreOutliers(
  data: number[],
  threshold: number = 2.5,
): number[] {
  if (data.length < 3) return [];
  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  const stddev = Math.sqrt(
    data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length,
  );
  if (stddev === 0) return [];
  return data
    .map((v, i) => (Math.abs((v - mean) / stddev) > threshold ? i : -1))
    .filter((i) => i >= 0);
}

// ─── CAGR — Compound Annual Growth Rate ─────────────────────

export function cagr(
  startValue: number,
  endValue: number,
  years: number,
): number {
  if (startValue <= 0 || years <= 0 || endValue <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

// ─── Multi-Factor Health Score ──────────────────────────────

export interface HealthScoreFactors {
  /** 0-100+ — what % of income is saved (can exceed 100 if extreme) */
  savingsRate: number;
  /** Expense EWMA slope — negative = decreasing expenses (good) */
  expenseTrendPct: number;
  /** 0-100 — % of budgets that are within their limit */
  budgetAdherence: number;
  /** Number of months of survival without income */
  runwayMonths: number;
  /** 0-1 — total debt / total assets (0 = no debt) */
  debtRatio: number;
}

/**
 * Computes a 1-99 health score from five normalised factors.
 *
 * | Factor              | Weight | 100-point anchor                |
 * |---------------------|--------|---------------------------------|
 * | Savings rate        | 25 %   | 40 % savings = perfect          |
 * | Expense trend       | 20 %   | -10 % month-over-month = perfect|
 * | Budget adherence    | 20 %   | 100 % budgets within limit      |
 * | Runway              | 20 %   | 12+ months = perfect            |
 * | Debt ratio          | 15 %   | 0 debt = perfect                |
 */
export function computeHealthScore(f: HealthScoreFactors): number {
  const savingsScore = Math.max(0, Math.min(100, f.savingsRate * 2.5));
  const expenseScore = Math.max(0, Math.min(100, 50 - f.expenseTrendPct * 5));
  const budgetScore = Math.max(0, Math.min(100, f.budgetAdherence));
  const runwayScore = Math.max(0, Math.min(100, f.runwayMonths * 8.33));
  const debtScore = Math.max(0, Math.min(100, (1 - f.debtRatio) * 100));

  const raw =
    savingsScore * 0.25 +
    expenseScore * 0.2 +
    budgetScore * 0.2 +
    runwayScore * 0.2 +
    debtScore * 0.15;

  return Math.max(1, Math.min(99, Math.round(raw)));
}

/** Returns a human-readable label + color class for a health score. */
export function healthLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 80) return { label: "Excellent", color: "text-emerald-400" };
  if (score >= 60) return { label: "Good", color: "text-blue-400" };
  if (score >= 40) return { label: "Fair", color: "text-amber-400" };
  if (score >= 20) return { label: "Needs Work", color: "text-orange-400" };
  return { label: "Critical", color: "text-rose-400" };
}

// ─── Goal Projection ────────────────────────────────────────

export interface GoalProjection {
  requiredMonthlyRate: number;
  actualMonthlyRate: number;
  projectedCompletionDate: string | null;
  status: "on-track" | "behind" | "ahead" | "achieved";
  monthsBehind: number;
  percentComplete: number;
}

export function projectGoalCompletion(
  current: number,
  target: number,
  contributions: { date: string; amount: number }[],
  dueDate: string,
): GoalProjection {
  const percentComplete = target > 0 ? (current / target) * 100 : 0;

  if (current >= target) {
    return {
      requiredMonthlyRate: 0,
      actualMonthlyRate: 0,
      projectedCompletionDate: null,
      status: "achieved",
      monthsBehind: 0,
      percentComplete,
    };
  }

  const now = new Date();
  // Parse due dates like "Dec 2026" or "2026-12-31"
  const due = dueDate.includes("-")
    ? new Date(dueDate)
    : new Date(Date.parse(dueDate + " 1"));
  const msPerMonth = 30.44 * 86400000;
  const monthsRemaining = Math.max(0.5, (due.getTime() - now.getTime()) / msPerMonth);
  const remaining = target - current;
  const requiredMonthlyRate = remaining / monthsRemaining;

  let actualMonthlyRate = 0;
  if (contributions.length >= 1) {
    const sorted = [...contributions].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const firstDate = new Date(sorted[0].date);
    const monthsOfData = Math.max(
      0.5,
      (now.getTime() - firstDate.getTime()) / msPerMonth,
    );
    const total = contributions.reduce((s, c) => s + c.amount, 0);
    actualMonthlyRate = total / monthsOfData;
  }

  let projectedCompletionDate: string | null = null;
  if (actualMonthlyRate > 0) {
    const monthsToComplete = remaining / actualMonthlyRate;
    const projected = new Date(now);
    projected.setMonth(projected.getMonth() + Math.ceil(monthsToComplete));
    projectedCompletionDate = projected.toISOString().slice(0, 7); // "YYYY-MM"
  }

  const ratio = requiredMonthlyRate > 0 ? actualMonthlyRate / requiredMonthlyRate : 0;
  const status: GoalProjection["status"] =
    ratio >= 1.1 ? "ahead" : ratio >= 0.85 ? "on-track" : "behind";

  const monthsBehind =
    actualMonthlyRate > 0
      ? Math.max(0, remaining / actualMonthlyRate - monthsRemaining)
      : monthsRemaining;

  return {
    requiredMonthlyRate,
    actualMonthlyRate,
    projectedCompletionDate,
    status,
    monthsBehind,
    percentComplete,
  };
}

// ─── Budget Pacing ──────────────────────────────────────────

export interface BudgetPacing {
  projectedMonthEnd: number;
  dailyRate: number;
  allowedDailyRate: number;
  status: "under-pace" | "on-pace" | "over-pace";
  projectedOverBy: number;
}

export function budgetPacing(
  spent: number,
  limit: number,
  daysElapsed: number,
  daysInMonth: number,
): BudgetPacing {
  const dailyRate = daysElapsed > 0 ? spent / daysElapsed : 0;
  const allowedDailyRate = daysInMonth > 0 ? limit / daysInMonth : 0;
  const projectedMonthEnd = dailyRate * daysInMonth;
  const projectedOverBy = Math.max(0, projectedMonthEnd - limit);

  const ratio = allowedDailyRate > 0 ? dailyRate / allowedDailyRate : 0;
  const status: BudgetPacing["status"] =
    ratio <= 0.9 ? "under-pace" : ratio <= 1.1 ? "on-pace" : "over-pace";

  return {
    projectedMonthEnd,
    dailyRate,
    allowedDailyRate,
    status,
    projectedOverBy,
  };
}

// ─── Deterministic PRNG (Mulberry32) ────────────────────────

export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalRandom(rng: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── Runway Monte Carlo ─────────────────────────────────────

export interface RunwayBands {
  p10: number;
  p50: number;
  p90: number;
}

/**
 * Simulates how many months of runway remain given recent burn data.
 * Returns P10 (pessimistic), P50 (expected), P90 (optimistic) months.
 */
export function runwayMonteCarlo(
  liquidAssets: number,
  recentMonthlyBurns: number[],
  numSims: number = 200,
): RunwayBands {
  if (recentMonthlyBurns.length === 0 || liquidAssets <= 0) {
    return { p10: 0, p50: 0, p90: 0 };
  }

  const mean =
    recentMonthlyBurns.reduce((s, v) => s + v, 0) /
    recentMonthlyBurns.length;
  const stddev = Math.sqrt(
    recentMonthlyBurns.reduce((s, v) => s + (v - mean) ** 2, 0) /
      Math.max(1, recentMonthlyBurns.length - 1),
  );

  const rng = mulberry32(Math.round(liquidAssets * 100));
  const results: number[] = [];

  for (let sim = 0; sim < numSims; sim++) {
    let remaining = liquidAssets;
    let months = 0;
    while (remaining > 0 && months < 120) {
      const burn = mean + normalRandom(rng) * stddev * 0.5;
      remaining -= Math.max(0, burn);
      months++;
    }
    results.push(months);
  }

  results.sort((a, b) => a - b);
  return {
    p10: results[Math.floor(results.length * 0.1)],
    p50: results[Math.floor(results.length * 0.5)],
    p90: results[Math.floor(results.length * 0.9)],
  };
}

// ─── Loan Payoff Projection ─────────────────────────────────

export interface LoanPayoffProjection {
  monthlyRepaymentRate: number;
  estimatedPayoffDate: string | null;
  monthsToPayoff: number;
  isStale: boolean;
  staleDays: number;
}

export function projectLoanPayoff(
  outstandingBalance: number,
  repayments: { date: string; amount: number }[],
  staleDaysThreshold: number = 60,
): LoanPayoffProjection {
  if (outstandingBalance <= 0 || repayments.length === 0) {
    return {
      monthlyRepaymentRate: 0,
      estimatedPayoffDate: null,
      monthsToPayoff: 0,
      isStale: repayments.length === 0,
      staleDays: 0,
    };
  }

  const now = new Date();
  const sorted = [...repayments].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const staleDays = Math.floor(
    (now.getTime() - lastDate.getTime()) / 86400000,
  );
  const isStale = staleDays > staleDaysThreshold;

  const firstDate = new Date(sorted[0].date);
  const monthsOfData = Math.max(
    0.5,
    (now.getTime() - firstDate.getTime()) / (30.44 * 86400000),
  );
  const totalRepaid = repayments.reduce((s, r) => s + r.amount, 0);
  const monthlyRate = totalRepaid / monthsOfData;

  let estimatedPayoffDate: string | null = null;
  let monthsToPayoff = 0;
  if (monthlyRate > 0) {
    monthsToPayoff = Math.ceil(outstandingBalance / monthlyRate);
    const payoff = new Date(now);
    payoff.setMonth(payoff.getMonth() + monthsToPayoff);
    estimatedPayoffDate = payoff.toISOString().slice(0, 7);
  }

  return {
    monthlyRepaymentRate: monthlyRate,
    estimatedPayoffDate,
    monthsToPayoff,
    isStale,
    staleDays,
  };
}
