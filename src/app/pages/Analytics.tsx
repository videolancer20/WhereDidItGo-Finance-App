import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Download, PieChart as PieChartIcon, ArrowRight, TrendingDown, Target, Zap } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { type GoalRecord, type BudgetRecord, useFinance } from "../data/financeStore";
import { formatCurrency } from "../utils";
import { generateAnalyticsExport } from "../utils/pdfExport";
import { TimeFilter } from "../components/TimeFilter";
import clsx from "clsx";
import { computeHealthScore, healthLabel, runwayMonteCarlo, linearRegression, ewma } from "../analyticsEngine";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#14b8a6'];

export function Analytics() {
  const { transactions, totals, budgets, accounts, accountBalances, subscriptions, exchangeRates, settings, loanTransactions } = useFinance();
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end && t.type !== "transfer");
  }, [transactions, dateRange]);

  const monthlyData = useMemo(() => {
    const dailyData: Record<string, { 
      name: string, 
      income: number, 
      expense: number, 
      profit: number,
      multiIncome: Record<string, number>,
      multiExpense: Record<string, number>,
      multiProfit: Record<string, number>,
    }> = {};
    const globalCurrency = settings?.currency || "USD";

    [...filteredTransactions].reverse().forEach(t => {
      const monthLabel = new Date(t.date).toLocaleDateString(undefined, {month: 'short', year: '2-digit'});
      if (!dailyData[monthLabel]) dailyData[monthLabel] = { name: monthLabel, income: 0, expense: 0, profit: 0, multiIncome: {}, multiExpense: {}, multiProfit: {} };
      
      const rateToUse = t.exchangeRate || exchangeRates[t.currency || "USD"] || 1;
      const amountInUSD = Math.abs(t.amount) / rateToUse;
      const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
      const amountInTarget = amountInUSD * targetRate;
      
      const cur = globalCurrency === "MULTI" ? (t.currency || "USD") : globalCurrency;

      if (t.type === "income") {
        dailyData[monthLabel].income += amountInTarget;
        dailyData[monthLabel].multiIncome[cur] = (dailyData[monthLabel].multiIncome[cur] || 0) + Math.abs(t.amount);
      }
      if (t.type === "expense") {
        dailyData[monthLabel].expense += amountInTarget;
        dailyData[monthLabel].multiExpense[cur] = (dailyData[monthLabel].multiExpense[cur] || 0) + Math.abs(t.amount);
      }
    });

    Object.values(dailyData).forEach(month => {
       month.profit = month.income - month.expense;
       Object.keys(month.multiIncome).forEach(cur => {
         month.multiProfit[cur] = (month.multiIncome[cur] || 0) - (month.multiExpense[cur] || 0);
       });
       Object.keys(month.multiExpense).forEach(cur => {
         if (month.multiProfit[cur] === undefined) month.multiProfit[cur] = -(month.multiExpense[cur] || 0);
       });
    });

    return Object.values(dailyData);
  }, [filteredTransactions, settings?.currency, exchangeRates]);

  const { totalIncome, totalExpense } = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === "income") acc.totalIncome += Math.abs(t.amount);
      if (t.type === "expense") acc.totalExpense += Math.abs(t.amount);
      return acc;
    }, { totalIncome: 0, totalExpense: 0 });
  }, [filteredTransactions]);

  const topSpending = useMemo(() => {
    const totalsByCategory = new Map<string, number>();
    for (const transaction of filteredTransactions.filter((item) => item.type === "expense")) {
      totalsByCategory.set(transaction.category, (totalsByCategory.get(transaction.category) ?? 0) + Math.abs(transaction.amount));
    }
    return [...totalsByCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [filteredTransactions]);

  // Runway & Burn Rate (computed early — needed by healthScore)
  const { burnRate, liquidAssets } = useMemo(() => {
    const liquid = accounts
      .filter(a => a.type !== 'Credit Card' && !a.name.toLowerCase().includes('loan'))
      .reduce((sum, a) => {
        const bal = accountBalances[a.id] ?? 0;
        return sum + (bal > 0 ? bal / (exchangeRates[a.currency] || 1) : 0);
      }, 0);
    
    const months = Math.max(1, monthlyData.length);
    const avgBurn = totalExpense / months;
    
    return { burnRate: avgBurn, liquidAssets: liquid };
  }, [accounts, accountBalances, exchangeRates, totalExpense, monthlyData.length]);

  const healthScore = useMemo(() => {
    // Savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    
    // Expense trend — compute month-over-month EWMA slope
    const monthlyExpenses = monthlyData.map(m => m.expense);
    const ewmaExpenses = monthlyExpenses.length >= 2 ? ewma(monthlyExpenses, 0.3) : 0;
    const prevEwma = monthlyExpenses.length >= 2 ? ewma(monthlyExpenses.slice(0, -1), 0.3) : ewmaExpenses;
    const expenseTrendPct = prevEwma > 0 ? ((ewmaExpenses - prevEwma) / prevEwma) * 100 : 0;
    
    // Budget adherence
    const budgetsWithinLimit = budgets.length > 0 
      ? (budgets.filter(b => {
          const spent = transactions.filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(b.month)).reduce((s, t) => s + Math.abs(t.amount), 0);
          return spent <= b.limit;
        }).length / budgets.length) * 100
      : 100;
    
    // Runway
    const runwayMonths = burnRate > 0 ? liquidAssets / burnRate : 24;
    
    // Debt ratio
    const totalBorrowed = loanTransactions.filter(lt => lt.type === 'borrowed' && !lt.settled).reduce((s, lt) => s + lt.amount, 0);
    const totalAssets = Math.max(1, accounts.reduce((s, a) => s + Math.max(0, accountBalances[a.id] ?? a.openingBalance), 0));
    const debtRatio = Math.min(1, totalBorrowed / totalAssets);
    
    return computeHealthScore({ savingsRate, expenseTrendPct, budgetAdherence: budgetsWithinLimit, runwayMonths, debtRatio });
  }, [totalIncome, totalExpense, monthlyData, budgets, transactions, burnRate, liquidAssets, loanTransactions, accounts, accountBalances]);

  const hLabel = healthLabel(healthScore);
  const incomeExpenseRatio = totalIncome > 0 ? (totalExpense / totalIncome * 100).toFixed(1) : "0.0";

  // New: Area Data (Net Worth)
  const areaData = useMemo(() => {
    const globalCurrency = settings?.currency || "USD";
    
    let currentNetWorth = 0;
    const multiNW: Record<string, number> = {};
    
    accounts.forEach(a => {
       const bal = accountBalances[a.id] ?? 0;
       const cur = a.currency || "USD";
       
       const balUSD = bal / (exchangeRates[cur] || 1);
       const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
       currentNetWorth += balUSD * targetRate;
       
       const targetCur = globalCurrency === "MULTI" ? cur : globalCurrency;
       multiNW[targetCur] = (multiNW[targetCur] || 0) + (globalCurrency === "MULTI" ? bal : balUSD * targetRate);
    });

    const monthlyNW = [];
    let rollingNW = currentNetWorth;
    const rollingMultiNW = { ...multiNW };

    const reversedMonths = [...monthlyData].reverse();
    for (const month of reversedMonths) {
       monthlyNW.push({ name: month.name, netWorth: rollingNW, multiNetWorth: { ...rollingMultiNW } });
       
       rollingNW -= month.profit;
       Object.keys(month.multiProfit).forEach(cur => {
          rollingMultiNW[cur] = (rollingMultiNW[cur] || 0) - month.multiProfit[cur];
       });
    }
    
    return monthlyNW.reverse();
  }, [monthlyData, accounts, accountBalances, settings?.currency, exchangeRates]);

  const netWorthProjection = useMemo(() => {
    if (areaData.length < 2) return [];
    const points = areaData.map((d, i) => ({ x: i, y: d.netWorth }));
    const reg = linearRegression(points);
    // Project 6 months forward
    const projections: Array<{ name: string; netWorth: number; projected: boolean; multiNetWorth: Record<string, number> }> = [];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const lastEntry = areaData[areaData.length - 1];
    for (let i = 1; i <= 6; i++) {
      const projected = reg.predict(points.length - 1 + i);
      const lastMonthMatch = lastEntry.name.match(/([A-Z][a-z]+)\s*'?(\d+)/);
      if (lastMonthMatch) {
        const lastMonthIdx = months.indexOf(lastMonthMatch[1]);
        const lastYear = parseInt(lastMonthMatch[2]) + 2000;
        const futureMonth = (lastMonthIdx + i) % 12;
        const futureYear = lastYear + Math.floor((lastMonthIdx + i) / 12);
        projections.push({ name: `${months[futureMonth]} '${String(futureYear).slice(-2)}`, netWorth: projected, projected: true, multiNetWorth: {} });
      }
    }
    return projections;
  }, [areaData]);

  const combinedAreaData = useMemo(() => [
    ...areaData.map(d => ({ ...d, projected: false })),
    ...netWorthProjection,
  ], [areaData, netWorthProjection]);

  // New: Radar Data (Budget vs Actual)
  const radarData = useMemo(() => {
    return budgets.map(b => {
      const actual = filteredTransactions
        .filter((t) => {
          if (t.type !== "expense") return false;
          if (b.targetType === "account") return t.accountId === b.categoryId;
          return t.categoryId === b.categoryId;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return { 
        subject: b.category, 
        budget: b.limit, 
        actual, 
        fullMark: Math.max(b.limit, actual) * 1.2 
      };
    });
  }, [budgets, filteredTransactions]);

  // New: Currency Exposure Pie
  const currencyData = useMemo(() => {
    const groups = new Map<string, number>();
    accounts.forEach(a => {
       const bal = accountBalances[a.id] ?? 0;
       if (bal !== 0) {
          const curr = a.currency || "USD";
          const rate = exchangeRates[curr] || 1;
          const baseValue = Math.abs(bal) / rate; // Standardize relative scale
          groups.set(curr, (groups.get(curr) ?? 0) + baseValue);
       }
    });
    return Array.from(groups.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [accounts, accountBalances, exchangeRates]);

  // New: Spending by Tags Pie
  const tagsData = useMemo(() => {
    const tagTotals = new Map<string, number>();
    filteredTransactions.filter(t => t.type === "expense" && t.tags && t.tags.length > 0).forEach(t => {
      const amountPerTag = Math.abs(t.amount) / t.tags.length; // distribute evenly if multiple tags
      t.tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase().trim();
        tagTotals.set(normalizedTag, (tagTotals.get(normalizedTag) ?? 0) + amountPerTag);
      });
    });
    return Array.from(tagTotals.entries()).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredTransactions]);

  // New: Income by Tags Pie
  const incomeTagsData = useMemo(() => {
    const tagTotals = new Map<string, number>();
    filteredTransactions.filter(t => t.type === "income" && t.tags && t.tags.length > 0).forEach(t => {
      const amountPerTag = Math.abs(t.amount) / t.tags.length;
      t.tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase().trim();
        tagTotals.set(normalizedTag, (tagTotals.get(normalizedTag) ?? 0) + amountPerTag);
      });
    });
    return Array.from(tagTotals.entries()).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredTransactions]);


  const runwayBands = useMemo(() => {
    // Build monthly burn array from monthlyData
    const monthlyBurns = monthlyData.map(m => m.expense);
    return runwayMonteCarlo(liquidAssets, monthlyBurns.slice(-6));
  }, [liquidAssets, monthlyData]);

  // New: Subscription Heatmap/Timeline
  const upcomingSubscriptions = useMemo(() => {
    return subscriptions
      .filter(s => s.status === 'active')
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
      .slice(0, 4);
  }, [subscriptions]);

  function exportAnalytics() {
    generateAnalyticsExport({
      title: "Analytics Insights Export",
      transactions: filteredTransactions,
      budgets: budgets,
      dateRange: `${dateRange.start} to ${dateRange.end}`,
    });
  }

  // Interactive Chart State
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const activeTooltipIndexRef = useRef<number>(0);

  const currentLeft = left !== null ? left : 0;
  const currentRight = right !== null ? right : Math.max(0, monthlyData.length - 1);

  const zoomOut = () => {
    setLeft(null);
    setRight(null);
  };

  const chartContainerRef1 = useRef<HTMLDivElement>(null);
  const chartContainerRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      if (monthlyData.length === 0) return;
      const zoomIn = e.deltaY < 0;
      const focusIndex = activeTooltipIndexRef.current;
      
      const range = currentRight - currentLeft;
      
      if (zoomIn && range <= 2) return;
      if (!zoomIn && currentLeft === 0 && currentRight === monthlyData.length - 1) return;

      const zoomAmount = Math.max(1, Math.floor(range * 0.1));

      let newLeft = currentLeft;
      let newRight = currentRight;

      if (zoomIn) {
        const leftRatio = range > 0 ? (focusIndex - currentLeft) / range : 0.5;
        newLeft = currentLeft + Math.round(zoomAmount * leftRatio);
        newRight = currentRight - Math.round(zoomAmount * (1 - leftRatio));
      } else {
        const leftRatio = range > 0 ? (focusIndex - currentLeft) / range : 0.5;
        newLeft = Math.max(0, currentLeft - Math.round(zoomAmount * leftRatio));
        newRight = Math.min(monthlyData.length - 1, currentRight + Math.round(zoomAmount * (1 - leftRatio)));
      }

      if (newRight - newLeft >= 2) {
        setLeft(newLeft);
        setRight(newRight);
      }
    };

    const container1 = chartContainerRef1.current;
    const container2 = chartContainerRef2.current;

    if (container1) container1.addEventListener("wheel", handleWheelNative, { passive: false });
    if (container2) container2.addEventListener("wheel", handleWheelNative, { passive: false });

    return () => {
      if (container1) container1.removeEventListener("wheel", handleWheelNative);
      if (container2) container2.removeEventListener("wheel", handleWheelNative);
    };
  }, [monthlyData.length, currentLeft, currentRight]);

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const globalCurrency = settings?.currency || "USD";
      if (globalCurrency === "MULTI") {
        return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
            <p className="text-zinc-400 text-xs mb-2">{label}</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-emerald-400 font-semibold mb-1">Income</p>
                {Object.keys(data.multiIncome).length > 0 ? Object.entries(data.multiIncome).map(([cur, val]) => (
                  <p key={cur} className="text-sm text-zinc-200">{formatCurrency(val as number, cur)}</p>
                )) : <p className="text-sm text-zinc-500">{formatCurrency(0, "USD")}</p>}
              </div>
              <div>
                <p className="text-xs text-rose-400 font-semibold mb-1">Expense</p>
                {Object.keys(data.multiExpense).length > 0 ? Object.entries(data.multiExpense).map(([cur, val]) => (
                  <p key={cur} className="text-sm text-zinc-200">{formatCurrency(val as number, cur)}</p>
                )) : <p className="text-sm text-zinc-500">{formatCurrency(0, "USD")}</p>}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-400 text-xs mb-2">{label}</p>
          <p className="text-sm text-emerald-400">Income: {formatCurrency(data.income, globalCurrency)}</p>
          <p className="text-sm text-rose-400">Expense: {formatCurrency(data.expense, globalCurrency)}</p>
        </div>
      );
    }
    return null;
  };

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const globalCurrency = settings?.currency || "USD";
      if (globalCurrency === "MULTI") {
        return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
            <p className="text-zinc-400 text-xs mb-2">{label} Net Worth</p>
            <div className="space-y-1">
              {Object.keys(data.multiNetWorth).length > 0 ? Object.entries(data.multiNetWorth).map(([cur, val]) => (
                <p key={cur} className="text-sm font-semibold text-indigo-400">{formatCurrency(val as number, cur)}</p>
              )) : <p className="text-sm text-zinc-500">{formatCurrency(0, "USD")}</p>}
            </div>
          </div>
        );
      }
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-400 text-xs mb-1">{label}</p>
          <p className="text-sm font-semibold text-indigo-400">Net Worth: {formatCurrency(data.netWorth, globalCurrency)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Analytics & Insights</h1>
          <p className="text-zinc-500 text-sm mt-1">Deep dive into your financial health, forecasts, and multi-currency exposure.</p>
        </div>
        <div className="flex items-center gap-3">
          <TimeFilter onChange={setDateRange} compact />
          <button onClick={exportAnalytics} className="flex items-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm transition-colors shadow-lg shadow-indigo-500/20">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Income vs Expense Bar Chart */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">Income vs Expense</h2>
            {(left !== null || right !== null) && (
              <button onClick={zoomOut} className="px-3 py-1.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors">
                Reset Zoom
              </button>
            )}
          </div>
          <div className="h-80" ref={chartContainerRef1}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyData.slice(currentLeft, currentRight + 1)} 
                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e && e.activeTooltipIndex !== undefined) activeTooltipIndexRef.current = e.activeTooltipIndex;
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--zinc-800)', opacity: 0.4 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Net Worth Area Chart + Projection */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">Historical Net Worth</h2>
            {netWorthProjection.length > 0 && (
              <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                <span className="inline-block w-4 border-t-2 border-dashed border-indigo-400"></span>
                Projected
              </span>
            )}
          </div>
          <div className="h-80" ref={chartContainerRef2}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={combinedAreaData} 
                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e && e.activeTooltipIndex !== undefined) activeTooltipIndexRef.current = e.activeTooltipIndex;
                }}
              >
                <defs>
                  <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNwProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorNw)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs Actual Radar Chart */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Budget Utilization (Radar)</h2>
          <div className="h-80 w-full flex items-center justify-center">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" fontSize={12} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                  <Radar name="Budget Limit" dataKey="budget" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Actual Spent" dataKey="actual" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.6} />
                  <Tooltip formatter={(value: number) => formatCurrency(value, settings?.currency)} contentStyle={{ backgroundColor: 'var(--zinc-900)', borderColor: 'var(--zinc-800)', borderRadius: '8px', color: 'var(--zinc-200)' }} itemStyle={{ color: 'var(--zinc-200)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-zinc-500 text-sm">No active budgets set for this period.</p>
            )}
          </div>
        </div>

        {/* Currency Exposure & Burn Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">Currency Exposure</h2>
            <p className="text-xs text-zinc-500 mb-4">Distribution of your liquid assets</p>
            <div className="h-48 flex-1">
              {currencyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={currencyData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                      {currencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${(value / currencyData.reduce((a,b)=>a+b.value,0)*100).toFixed(1)}%`, name]} contentStyle={{ backgroundColor: 'var(--zinc-900)', borderColor: 'var(--zinc-800)', borderRadius: '8px', color: 'var(--zinc-200)' }} itemStyle={{ color: 'var(--zinc-200)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">No positive account balances</div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-24 h-24 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">Financial Runway</h2>
            <p className="text-xs text-zinc-500 mb-6">Monte Carlo simulation (200 runs)</p>
            
            <div className="space-y-4 relative z-10">
              <div>
                <div className="text-3xl font-bold text-amber-400">
                  {runwayBands.p50 === 0 && liquidAssets <= 0 ? "0" : runwayBands.p50 >= 120 ? "∞" : runwayBands.p50} <span className="text-lg font-medium text-zinc-400">months</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {runwayBands.p10}–{runwayBands.p90} months <span className="text-zinc-500">(80% confidence)</span>
                </p>
              </div>
              
              <div className="pt-4 border-t border-zinc-800/60">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-zinc-400">Monthly Burn Rate</span>
                  <span className="text-sm font-medium text-rose-400">{formatCurrency(burnRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Liquid Assets</span>
                  <span className="text-sm font-medium text-emerald-400">{formatCurrency(liquidAssets)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Insight Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="col-span-1 md:col-span-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
            <span className="text-2xl font-bold text-emerald-400">{healthScore}</span>
          </div>
          <h3 className="text-zinc-100 font-medium">Health Score</h3>
          <p className={`text-xs font-medium ${hLabel.color}`}>{hLabel.label}</p>
          <p className="text-xs text-zinc-500 mt-1">Multi-factor financial health</p>
        </div>
        
        <div className="col-span-1 md:col-span-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
            <PieChartIcon className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-zinc-100 font-medium mb-2">Expense Ratio</h3>
          <div className="text-2xl font-bold text-zinc-100">{incomeExpenseRatio}%</div>
          <p className="text-xs text-zinc-500 mt-1">of income spent</p>
        </div>

        <div className="col-span-1 md:col-span-2 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider mb-4">Upcoming Liabilities Map</h3>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {upcomingSubscriptions.length > 0 ? (
              upcomingSubscriptions.map(sub => {
                const subAccount = accounts.find(a => a.id === sub.accountId);
                return (
                  <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className={clsx("w-2 h-2 rounded-full", sub.color || "bg-indigo-500")}></div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{sub.name}</p>
                        <p className="text-xs text-zinc-500">{new Date(sub.nextDueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-rose-400">{formatCurrency(sub.amount, subAccount?.currency)}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">No active subscriptions detected.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tag Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Spending by Tag</h2>
          <p className="text-xs text-zinc-500 mb-4">Expense breakdown by custom tags</p>
          <div className="h-64 flex-1">
            {tagsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tagsData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {tagsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, settings?.currency)} contentStyle={{ backgroundColor: 'var(--zinc-900)', borderColor: 'var(--zinc-800)', borderRadius: '8px', color: 'var(--zinc-200)' }} itemStyle={{ color: 'var(--zinc-200)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm flex-col">
                <p>No tag data available.</p>
                <p className="text-xs mt-1">Add #tags to your expenses.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Income by Tag</h2>
          <p className="text-xs text-zinc-500 mb-4">Income sources by custom tags</p>
          <div className="h-64 flex-1">
            {incomeTagsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={incomeTagsData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {incomeTagsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, settings?.currency)} contentStyle={{ backgroundColor: 'var(--zinc-900)', borderColor: 'var(--zinc-800)', borderRadius: '8px', color: 'var(--zinc-200)' }} itemStyle={{ color: 'var(--zinc-200)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm flex-col">
                <p>No tag data available.</p>
                <p className="text-xs mt-1">Add #tags to your income.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Top Spending Tags</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {tagsData.length > 0 ? tagsData.map((t, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-sm font-medium text-zinc-200">{t.name}</span>
                </div>
                <span className="text-sm text-zinc-400">{formatCurrency(t.value)}</span>
              </div>
            )) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                Start using tags to see them listed here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
