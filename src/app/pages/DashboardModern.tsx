import { 
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, 
  MoreHorizontal, Briefcase, User, Zap, Tag, AlertCircle, PlusCircle, CheckCircle2, Target, X, Settings
} from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ComposedChart, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Link, useNavigate } from "react-router";
import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import { useFinance, type FinanceTransaction } from "../data/financeStore";
import { formatCurrency, convertCurrency } from "../utils";
import { TimeFilter } from "../components/TimeFilter";
import { TransactionDetailModal } from "../components/TransactionDetailModal";
import { toast } from "sonner";
import { ewma, linearRegression, rollingAverage } from "../analyticsEngine";

const categoryIcons: Record<string, any> = {
  "personal-expenses": User,
  "freelance-income": Zap,
  "v20-studio": Briefcase,
};

export function DashboardModern({ showGoals }: { showGoals: boolean }) {
  const { transactions, categories, accounts, accountBalances, subscriptions, upcomingPayments, paySubscription, budgets, goals, settings, exchangeRates, addTransaction, smartAlerts, dismissAlert } = useFinance();
  const globalCurrency = settings.currency || "USD";
  const navigate = useNavigate();
  
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) });
  const [selectedTxn, setSelectedTxn] = useState<FinanceTransaction | null>(null);
  const [breakdownType, setBreakdownType] = useState<"expense" | "income">("expense");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Quick Add State
  const [quickAddAmount, setQuickAddAmount] = useState("");
  const [quickAddDesc, setQuickAddDesc] = useState("");

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddAmount || !quickAddDesc) return;
    if (categories.length === 0 || accounts.length === 0) {
      toast.error("Please create at least one account and category first.");
      return;
    }
    addTransaction({
      type: "expense",
      amount: Number(quickAddAmount),
      description: quickAddDesc,
      date: new Date().toISOString().slice(0, 10),
      categoryId: categories[0]?.id || "personal-expenses",
      accountId: accounts[0]?.id || "cash",
      notes: "Quick added from dashboard",
      tags: [],
      attachments: [],
      currency: accounts[0]?.currency || "USD",
      exchangeRate: exchangeRates[accounts[0]?.currency || "USD"] || 1
    });
    setQuickAddAmount("");
    setQuickAddDesc("");
    toast.success("Expense quickly logged!");
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end);
  }, [transactions, dateRange]);

  // LIVE TOTALS (from classic dashboard)
  const liveTotals = useMemo(() => {
    const nonTransfers = filteredTransactions.filter((t) => t.type !== "transfer");
    let income = 0; let expense = 0;
    
    const multi = {
      assets: {} as Record<string, number>,
      income: {} as Record<string, number>,
      expense: {} as Record<string, number>,
      profit: {} as Record<string, number>,
    };

    nonTransfers.forEach(t => {
      // Use t.exchangeRate if available for historical accuracy
      const rateToUse = t.exchangeRate || exchangeRates[t.currency || "USD"] || 1;
      const amountInUSD = Math.abs(t.amount) / rateToUse;
      const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
      const amountInTarget = amountInUSD * targetRate;
      
      const cur = globalCurrency === "MULTI" ? (t.currency || "USD") : globalCurrency;
      
      if (t.type === "income") {
        income += amountInTarget;
        multi.income[cur] = (multi.income[cur] || 0) + Math.abs(t.amount);
      }
      if (t.type === "expense") {
        expense += amountInTarget;
        multi.expense[cur] = (multi.expense[cur] || 0) + Math.abs(t.amount);
      }
    });

    let totalBalanceConverted = 0;
    accounts.filter((a) => a.type !== "Credit Card").forEach(a => {
      const bal = accountBalances[a.id] ?? 0;
      const cur = a.currency || "USD";
      // Account balances use live exchange rates
      totalBalanceConverted += globalCurrency === "MULTI" ? convertCurrency(bal, cur, "USD", exchangeRates) : convertCurrency(bal, cur, globalCurrency, exchangeRates);
      
      const targetCur = globalCurrency === "MULTI" ? cur : globalCurrency;
      multi.assets[targetCur] = (multi.assets[targetCur] || 0) + (globalCurrency === "MULTI" ? bal : convertCurrency(bal, cur, globalCurrency, exchangeRates));
    });

    Object.keys(multi.income).forEach(cur => {
      multi.profit[cur] = (multi.income[cur] || 0) - (multi.expense[cur] || 0);
    });
    Object.keys(multi.expense).forEach(cur => {
      if (multi.profit[cur] === undefined) multi.profit[cur] = -(multi.expense[cur] || 0);
    });

    return { totalBalanceConverted, income, expense, profit: income - expense, multi    };
  }, [filteredTransactions, accounts, accountBalances, categories, dateRange, budgets, globalCurrency, exchangeRates]);

  const CustomDashboardAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
          <p className="text-sm text-emerald-400">Income: {formatCurrency(data.income, displayCurrency)}</p>
          <p className="text-sm text-rose-400">Expense: {formatCurrency(data.expense, displayCurrency)}</p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (globalCurrency === "MULTI") {
        return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
            <p className="text-zinc-400 text-xs mb-2" style={{ color: data.color }}>{data.name}</p>
            <div className="space-y-1">
              {Object.keys(data.multiValue).length > 0 ? Object.entries(data.multiValue).map(([cur, val]) => (
                <p key={cur} className="text-sm text-zinc-200">{formatCurrency(val as number, cur)}</p>
              )) : <p className="text-sm text-zinc-500">{formatCurrency(0, "USD")}</p>}
            </div>
          </div>
        );
      }
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-400 text-xs mb-2" style={{ color: data.color }}>{data.name}</p>
          <p className="text-sm text-zinc-200">{formatCurrency(data.value, displayCurrency)}</p>
        </div>
      );
    }
    return null;
  };

  const trends = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const durationMs = end.getTime() - start.getTime();
    
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - durationMs);
    
    const prevFiltered = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= prevStart && d <= prevEnd;
    });
    
    let prevIncome = 0; let prevExpense = 0;
    prevFiltered.filter(t => t.type !== "transfer").forEach(t => {
      const rateToUse = t.exchangeRate || exchangeRates[t.currency || "USD"] || 1;
      const amountInUSD = Math.abs(t.amount) / rateToUse;
      const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
      const amt = amountInUSD * targetRate;
      
      if (t.type === "income") prevIncome += amt;
      if (t.type === "expense") prevExpense += amt;
    });
    const prevProfit = prevIncome - prevExpense;
    const prevBalance = liveTotals.totalBalanceConverted - liveTotals.profit;
    
    const calcChange = (curr: number, prev: number) => {
      if (prev === 0 && curr === 0) return 0;
      if (prev === 0) return 100;
      return ((curr - prev) / Math.abs(prev)) * 100;
    };

    return {
      assets: calcChange(liveTotals.totalBalanceConverted, prevBalance),
      income: calcChange(liveTotals.income, prevIncome),
      expense: calcChange(liveTotals.expense, prevExpense),
      profit: calcChange(liveTotals.profit, prevProfit),
    };
  }, [transactions, dateRange, liveTotals, globalCurrency, exchangeRates]);

  const trendInsights = useMemo(() => {
    // Build monthly totals from all transactions (not just filtered period)
    const monthlyMap: Record<string, { income: number; expense: number }> = {};
    transactions.filter(t => t.type !== 'transfer').forEach(t => {
      const month = t.date.slice(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
      const val = Math.abs(t.amount);
      if (t.type === 'income') monthlyMap[month].income += val;
      if (t.type === 'expense') monthlyMap[month].expense += val;
    });
    
    const months = Object.keys(monthlyMap).sort();
    const incomes = months.map(m => monthlyMap[m].income);
    const expenses = months.map(m => monthlyMap[m].expense);
    
    // EWMA of expenses (is spending accelerating?)
    const expenseEwma = incomes.length >= 2 ? ewma(expenses, 0.3) : 0;
    const prevExpenseEwma = expenses.length >= 2 ? ewma(expenses.slice(0, -1), 0.3) : expenseEwma;
    const expenseTrend = prevExpenseEwma > 0 ? ((expenseEwma - prevExpenseEwma) / prevExpenseEwma) * 100 : 0;
    
    // Rolling 3-month income average
    const incomeRolling = rollingAverage(incomes, 3);
    const lastRollingIncome = incomeRolling[incomeRolling.length - 1] || 0;
    
    // Savings rate (rolling 6-month)
    const recentMonths = Math.min(6, months.length);
    const recentIncome = incomes.slice(-recentMonths).reduce((s, v) => s + v, 0);
    const recentExpense = expenses.slice(-recentMonths).reduce((s, v) => s + v, 0);
    const savingsRate = recentIncome > 0 ? ((recentIncome - recentExpense) / recentIncome) * 100 : 0;
    
    return {
      expenseTrend: expenseTrend.toFixed(1),
      expenseTrendDirection: expenseTrend > 2 ? 'up' as const : expenseTrend < -2 ? 'down' as const : 'flat' as const,
      rollingMonthlyIncome: lastRollingIncome,
      savingsRate: savingsRate.toFixed(1),
      savingsRatePositive: savingsRate >= 0,
    };
  }, [transactions]);

  const displayCurrency = globalCurrency === "MULTI" ? "USD" : globalCurrency;

  const renderKPIValue = (singleValue: number, multiValues: Record<string, number>, colorClass: string = "text-zinc-100") => {
    if (globalCurrency === "MULTI") {
      const entries = Object.entries(multiValues);
      if (entries.length === 0) return <h3 className={`text-xl font-bold ${colorClass} mb-2`}>{formatCurrency(0, "USD")}</h3>;
      return (
        <div className="space-y-1 mb-2">
          {entries.map(([cur, val]) => (
            <h3 key={cur} className={`text-xl font-bold ${colorClass}`}>{formatCurrency(val, cur)}</h3>
          ))}
        </div>
      );
    }
    return <h3 className={`text-2xl font-bold ${colorClass} mb-2`}>{formatCurrency(singleValue, displayCurrency)}</h3>;
  };

  // Chart data
  const chartData = useMemo(() => {
    const dailyData: Record<string, { 
      name: string, 
      income: number, 
      expense: number,
      multiIncome: Record<string, number>,
      multiExpense: Record<string, number>
    }> = {};
    [...filteredTransactions].reverse().forEach(t => {
      if (t.type === "transfer") return;
      if (!dailyData[t.date]) dailyData[t.date] = { 
        name: new Date(t.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}), 
        income: 0, 
        expense: 0,
        multiIncome: {},
        multiExpense: {}
      };
      
      const rateToUse = t.exchangeRate || exchangeRates[t.currency || "USD"] || 1;
      const amountInUSD = Math.abs(t.amount) / rateToUse;
      const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
      const convertedAmount = amountInUSD * targetRate;
      
      const cur = globalCurrency === "MULTI" ? (t.currency || "USD") : globalCurrency;

      if (t.type === "income") {
        dailyData[t.date].income += convertedAmount;
        dailyData[t.date].multiIncome[cur] = (dailyData[t.date].multiIncome[cur] || 0) + Math.abs(t.amount);
      }
      if (t.type === "expense") {
        dailyData[t.date].expense += convertedAmount;
        dailyData[t.date].multiExpense[cur] = (dailyData[t.date].multiExpense[cur] || 0) + Math.abs(t.amount);
      }
    });
    return Object.values(dailyData);
  }, [filteredTransactions, globalCurrency, exchangeRates]);

  const chartDataWithTrend = useMemo(() => {
    const expenses = chartData.map(d => d.expense);
    const rolling = rollingAverage(expenses, 7);
    return chartData.map((d, i) => ({ ...d, expenseTrend: rolling[i] || 0 }));
  }, [chartData]);

  // Chart interact
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const activeTooltipIndexRef = useRef<number>(0);
  const currentLeft = left !== null ? left : 0;
  const currentRight = right !== null ? right : Math.max(0, chartData.length - 1);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Wallet Scroll Refs
  const walletScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingWallet = useRef(false);
  const startWalletX = useRef(0);
  const scrollWalletLeft = useRef(0);
  
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      if (chartData.length === 0) return;
      const zoomIn = e.deltaY < 0;
      const focusIndex = activeTooltipIndexRef.current;
      const range = currentRight - currentLeft;
      if (zoomIn && range <= 2) return;
      if (!zoomIn && currentLeft === 0 && currentRight === chartData.length - 1) return;
      const zoomAmount = Math.max(1, Math.floor(range * 0.1));
      let newLeft = currentLeft, newRight = currentRight;
      if (zoomIn) {
        const leftRatio = range > 0 ? (focusIndex - currentLeft) / range : 0.5;
        newLeft = currentLeft + Math.round(zoomAmount * leftRatio);
        newRight = currentRight - Math.round(zoomAmount * (1 - leftRatio));
      } else {
        const leftRatio = range > 0 ? (focusIndex - currentLeft) / range : 0.5;
        newLeft = Math.max(0, currentLeft - Math.round(zoomAmount * leftRatio));
        newRight = Math.min(chartData.length - 1, currentRight + Math.round(zoomAmount * (1 - leftRatio)));
      }
      if (newRight - newLeft >= 1) { setLeft(newLeft); setRight(newRight); }
    };
    container.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => container.removeEventListener("wheel", handleWheelNative);
  }, [chartData.length, currentLeft, currentRight]);

  const breakdownData = useMemo(() => {
    const grouped = filteredTransactions.filter(t => t.type === breakdownType).reduce((acc, t) => {
      const rateToUse = t.exchangeRate || exchangeRates[t.currency || "USD"] || 1;
      const amountInUSD = Math.abs(t.amount) / rateToUse;
      const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
      const convertedAmount = amountInUSD * targetRate;
      
      const cur = globalCurrency === "MULTI" ? (t.currency || "USD") : globalCurrency;

      if (!acc[t.categoryId]) acc[t.categoryId] = { value: 0, multiValue: {} };
      acc[t.categoryId].value += convertedAmount;
      acc[t.categoryId].multiValue[cur] = (acc[t.categoryId].multiValue[cur] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, { value: number, multiValue: Record<string, number> }>);
    return Object.entries(grouped).map(([categoryId, { value, multiValue }]) => {
      const cat = categories.find(c => c.id === categoryId);
      const colorStr = cat?.color || "";
      let hex = "#71717a";
      if (colorStr.includes("emerald")) hex = "#10b981";
      else if (colorStr.includes("blue")) hex = "#3b82f6";
      else if (colorStr.includes("rose") || colorStr.includes("red")) hex = "#f43f5e";
      else if (colorStr.includes("amber") || colorStr.includes("yellow") || colorStr.includes("orange")) hex = "#f59e0b";
      else if (colorStr.includes("purple") || colorStr.includes("violet") || colorStr.includes("indigo")) hex = "#8b5cf6";
      else if (colorStr.includes("cyan") || colorStr.includes("sky") || colorStr.includes("teal")) hex = "#06b6d4";
      else if (colorStr.includes("pink") || colorStr.includes("fuchsia")) hex = "#ec4899";
      return { categoryId, name: cat?.name || "Other", value, multiValue, color: hex };
    }).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredTransactions, breakdownType, categories, globalCurrency, exchangeRates]);

  const categoryPerformance = useMemo(() => {
    const stats: Record<string, { id: string, name: string, income: number, expense: number, profit: number, icon: any, color: string }> = {};
    filteredTransactions.forEach(t => {
      if (t.type === "transfer") return;
      if (!stats[t.categoryId]) {
        const cat = categories.find(c => c.id === t.categoryId);
        if (!cat) return;
        stats[t.categoryId] = { id: t.categoryId, name: cat.name, income: 0, expense: 0, profit: 0, icon: categoryIcons[t.categoryId] || Tag, color: cat.color };
      }
      const rateToUse = t.exchangeRate || exchangeRates[t.currency || "USD"] || 1;
      const amountInUSD = Math.abs(t.amount) / rateToUse;
      const targetRate = displayCurrency === "USD" ? 1 : (exchangeRates[displayCurrency] || 1);
      const convertedAmount = amountInUSD * targetRate;
      
      if (t.type === "income") stats[t.categoryId].income += convertedAmount;
      if (t.type === "expense") stats[t.categoryId].expense += convertedAmount;
      stats[t.categoryId].profit = stats[t.categoryId].income - stats[t.categoryId].expense;
    });
    return Object.values(stats).sort((a, b) => b.income + b.expense - (a.income + a.expense)).slice(0, 3);
  }, [filteredTransactions, categories, displayCurrency, exchangeRates]);

  const pacing = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const timeProgress = (currentDay / daysInMonth) * 100;
    const allExpenses = transactions.filter(t => t.type === 'expense' && t.categoryId !== 'transfer');
    if (allExpenses.length === 0) return { timeProgress, spendProgress: 0, spentThisMonth: 0, averageSpend: 0 };
    // Replace the simple average with EWMA
    const monthlyExpenseMap: Record<string, number> = {};
    allExpenses.forEach(t => {
      const month = t.date.slice(0, 7);
      monthlyExpenseMap[month] = (monthlyExpenseMap[month] || 0) + Math.abs(t.amount);
    });
    const monthlyExpenseValues = Object.keys(monthlyExpenseMap).sort().map(k => monthlyExpenseMap[k]);
    const averageSpend = monthlyExpenseValues.length >= 2 ? ewma(monthlyExpenseValues, 0.3) : (monthlyExpenseValues[0] || 0);
    const thisMonthTxns = allExpenses.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
    const spentThisMonth = thisMonthTxns.reduce((s,t) => s + Math.abs(t.amount), 0);
    const spendProgress = averageSpend > 0 ? (spentThisMonth / averageSpend) * 100 : 0;
    return { timeProgress, spendProgress, spentThisMonth, averageSpend };
  }, [transactions]);

  const recentGroupedTransactions = useMemo(() => {
    const groups: Record<string, typeof filteredTransactions> = {};
    filteredTransactions.slice(0, 50).forEach(txn => {
      const dateKey = new Date(txn.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(txn);
    });
    
    // Convert to array and preserve order (we assume filteredTransactions is sorted by date descending)
    return Object.entries(groups).map(([date, txns]) => ({ date, transactions: txns }));
  }, [filteredTransactions]);



  return (
    <>
      <button 
        onClick={() => setIsSettingsOpen(true)} 
        className="fixed top-[80px] right-4 sm:top-[104px] sm:right-6 lg:right-8 p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors border border-zinc-800/60 bg-zinc-900/40 z-20 hidden xl:block"
        aria-label="Dashboard Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20 fade-in relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Command Center</h1>
            <p className="text-zinc-500 text-sm mt-1">Real-time overview and actionable insights.</p>
          </div>
          <div className="flex items-center gap-3">
            <TimeFilter onChange={setDateRange} compact />
            <button 
              onClick={() => setIsSettingsOpen(true)} 
              className="xl:hidden p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors border border-zinc-800/60 bg-zinc-900/40"
              aria-label="Dashboard Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

      {/* Render the new animated settings dropdown directly here */}
      <DashboardSettingsDropdown isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* 1. TOP KPIs */}
      {!settings.dashboardConfig?.hideWallet && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-sm group hover:bg-zinc-900/60 transition-colors">
          <p className="text-xs font-medium text-zinc-400 mb-1">Total Assets</p>
          {renderKPIValue(liveTotals.totalBalanceConverted, liveTotals.multi.assets, "text-zinc-100")}
          <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md w-max ${trends.assets >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trends.assets >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trends.assets >= 0 ? "+" : ""}{trends.assets.toFixed(1)}%
          </span>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-sm group hover:bg-zinc-900/60 transition-colors">
          <p className="text-xs font-medium text-zinc-400 mb-1">Period Income</p>
          {renderKPIValue(liveTotals.income, liveTotals.multi.income, "text-emerald-400")}
          <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md w-max ${trends.income >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trends.income >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trends.income >= 0 ? "+" : ""}{trends.income.toFixed(1)}%
          </span>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-sm group hover:bg-zinc-900/60 transition-colors">
          <p className="text-xs font-medium text-zinc-400 mb-1">Period Expense</p>
          {renderKPIValue(liveTotals.expense, liveTotals.multi.expense, "text-rose-400")}
          <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md w-max ${trends.expense <= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trends.expense <= 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
            {trends.expense > 0 ? "+" : ""}{trends.expense.toFixed(1)}%
          </span>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-sm group hover:bg-zinc-900/60 transition-colors">
          <p className="text-xs font-medium text-zinc-400 mb-1">Net Profit</p>
          {renderKPIValue(liveTotals.profit, liveTotals.multi.profit, "text-indigo-400")}
          <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md w-max ${trends.profit >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trends.profit >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trends.profit >= 0 ? "+" : ""}{trends.profit.toFixed(1)}%
          </span>
        </div>
      </div>
      )}

      {/* 2. CASHFLOW AND BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">Interactive Cash Flow</h2>
            {(left !== null || right !== null) && (
              <button onClick={() => { setLeft(null); setRight(null); }} className="px-3 py-1.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors">
                Reset Zoom
              </button>
            )}
          </div>
          <div className="h-72" ref={chartContainerRef}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartDataWithTrend.slice(currentLeft, currentRight + 1)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onMouseMove={(e) => { if (e && e.activeTooltipIndex !== undefined) activeTooltipIndexRef.current = e.activeTooltipIndex; }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin', 'dataMax']} allowDataOverflow />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <RechartsTooltip content={<CustomDashboardAreaTooltip />} cursor={{ fill: 'var(--zinc-800)', opacity: 0.4 }} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" animationDuration={300} />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" animationDuration={300} />
                <Line type="monotone" dataKey="expenseTrend" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" dot={false} name="7d Avg" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-center">Scroll to zoom in and out.</p>
        </div>

        {!settings.dashboardConfig?.hideTopCategories && (
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Breakdown</h2>
              <div className="flex bg-zinc-950 p-1 rounded-lg">
                <button onClick={() => setBreakdownType("expense")} className={`px-2 py-1 text-xs rounded-md ${breakdownType === "expense" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}>Exp</button>
                <button onClick={() => setBreakdownType("income")} className={`px-2 py-1 text-xs rounded-md ${breakdownType === "income" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}>Inc</button>
              </div>
            </div>
            <div className="h-48 relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                <span className="text-xl font-bold text-zinc-100">{formatCurrency(breakdownData.reduce((s,i) => s + i.value, 0))}</span>
                <span className="text-[10px] text-zinc-500 uppercase">Total {breakdownType}</span>
              </div>
              <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <PieChart>
                  <Pie data={breakdownData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {breakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip wrapperStyle={{ zIndex: 100 }} content={<CustomPieTooltip />} cursor={{ fill: 'var(--zinc-800)', opacity: 0.4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {breakdownData.map((item, i) => (
                <Link to={`/categories/${item.categoryId}`} key={i} className="flex items-center gap-2 text-xs truncate hover:bg-zinc-800/50 p-1 -ml-1 rounded-md transition-colors cursor-pointer group">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                  <span className="text-zinc-400 group-hover:text-zinc-300 truncate transition-colors">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. QUICK ADD & MONTHLY RUN-RATE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-center">
          <h2 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Quick Add Expense</h2>
          <form onSubmit={handleQuickAdd} className="flex gap-2">
            <input type="number" placeholder="0.00" className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none" value={quickAddAmount} onChange={e => setQuickAddAmount(e.target.value)} />
            <input type="text" placeholder="Coffee, Uber..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none" value={quickAddDesc} onChange={e => setQuickAddDesc(e.target.value)} />
            <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-lg transition-colors">
              <PlusCircle className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm">
           <h2 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-400" /> Monthly Run-Rate</h2>
           <div className="space-y-4">
             <div>
               <div className="flex justify-between text-xs mb-1">
                 <span className="text-zinc-400">Month Elapsed: {Math.round(pacing.timeProgress)}%</span>
                 <span className="text-zinc-400">Day {new Date().getDate()}</span>
               </div>
               <div className="w-full bg-zinc-800 rounded-full h-1.5"><div className="bg-zinc-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, pacing.timeProgress)}%` }}></div></div>
             </div>
             <div>
               <div className="flex justify-between text-xs mb-1">
                 <span className="text-zinc-400">Avg Spend Reached: {Math.round(pacing.spendProgress)}%</span>
                 <span className="text-zinc-400">{formatCurrency(pacing.spentThisMonth)} / {formatCurrency(pacing.averageSpend)}</span>
               </div>
               <div className="w-full bg-zinc-800 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${pacing.spendProgress > pacing.timeProgress ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pacing.spendProgress)}%` }}></div></div>
             </div>
           </div>
        </div>
      </div>

      {/* 4. WALLET OVERVIEW */}
      {!settings.dashboardConfig?.hideWalletOverview && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 mb-3 ml-1">Wallet Overview</h2>
          <div 
            ref={walletScrollRef}
            className="flex overflow-x-auto gap-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              isDraggingWallet.current = true;
              if (walletScrollRef.current) {
                startWalletX.current = e.pageX - walletScrollRef.current.offsetLeft;
                scrollWalletLeft.current = walletScrollRef.current.scrollLeft;
              }
            }}
            onMouseLeave={() => { isDraggingWallet.current = false; }}
            onMouseUp={() => { isDraggingWallet.current = false; }}
            onMouseMove={(e) => {
              if (!isDraggingWallet.current || !walletScrollRef.current) return;
              e.preventDefault();
              const x = e.pageX - walletScrollRef.current.offsetLeft;
              const walk = (x - startWalletX.current) * 1.5;
              walletScrollRef.current.scrollLeft = scrollWalletLeft.current - walk;
            }}
          >
            {accounts.map(acc => {
              const bal = accountBalances[acc.id] ?? 0;
              return (
                <div key={acc.id} className="min-w-[200px] shrink-0 bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-300">{acc.name}</p>
                      <p className="text-[10px] text-zinc-500">{acc.type}</p>
                    </div>
                  </div>
                  <h3 className={`text-lg font-semibold ${bal < 0 ? 'text-red-400' : 'text-zinc-100'}`}>{formatCurrency(bal, acc.currency)}</h3>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. TOP CATEGORIES, SUBSCRIPTIONS, SAVINGS RATE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Categories */}
        {!settings.dashboardConfig?.hideCategoryPerformance && (
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Top Categories</h2>
              <Link to="/categories" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View All</Link>
            </div>
            <div className="space-y-3">
              {categoryPerformance.map(cat => (
                <Link to={`/categories/${cat.id}`} key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color}`}>
                      {cat.icon && <cat.icon className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-zinc-200">{cat.name}</h3>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-zinc-100">{formatCurrency(cat.expense + cat.income)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Subscriptions */}
        {!settings.dashboardConfig?.hideUpcomingSubs && (
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Upcoming Subs</h2>
              <Link to="/subscriptions" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View All</Link>
            </div>
            <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
              {(!upcomingPayments || upcomingPayments.length === 0) ? (
                <p className="text-zinc-500 text-sm text-center py-4">No upcoming payments.</p>
              ) : (upcomingPayments || []).slice(0, 4).map((payment) => (
                <div key={`${payment.id}-${payment.nextDate}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                      <span className="text-xs font-bold text-zinc-300">{payment.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{payment.name}</p>
                      <p className="text-[10px] text-zinc-500">{new Date(payment.nextDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => paySubscription(payment.id)} className="text-[10px] font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-2 py-1 rounded transition-colors">
                    Pay {formatCurrency(payment.amount)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Savings Rate */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
            <Target className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-zinc-100 font-medium mb-2">Savings Rate</h3>
          <div className={`text-4xl font-bold mb-1 ${trendInsights.savingsRatePositive ? 'text-zinc-100' : 'text-red-400'}`}>{trendInsights.savingsRate}%</div>
          <p className="text-xs text-zinc-500">Rolling 6-month savings rate.</p>
          <p className="text-[10px] text-zinc-600 mt-1">(6mo rolling)</p>
        </div>

      </div>

      {/* 6. OPTIONAL ACTIVE GOALS */}
      {showGoals && goals.length > 0 && (
        <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-zinc-100 ml-1">Active Goals Progress</h2>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {goals.map(goal => {
                const progress = Math.min(100, (goal.current / goal.target) * 100);
                const radius = 28;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (progress / 100) * circumference;
                return (
                  <div key={goal.id} className="min-w-[160px] shrink-0 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="relative w-20 h-20 mb-3">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-zinc-800" />
                        <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${goal.color ? goal.color.replace('bg-', 'text-') : 'text-indigo-500'} transition-all duration-1000`} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-zinc-200">{Math.round(progress) || 0}%</span>
                      </div>
                    </div>
                    <h4 className="text-sm font-medium text-zinc-200 truncate w-full">{goal.name}</h4>
                    <p className="text-xs text-zinc-500">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</p>
                  </div>
                );
              })}
            </div>
        </div>
      )}

      {/* 7. WARNINGS (Above Transactions, dismissible) */}
      {smartAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100 ml-1">Warnings</h2>
          {smartAlerts.map(alert => (
            <div key={alert.id} className={`relative rounded-xl p-4 flex items-start gap-3 border ${
              alert.type === 'danger' ? 'bg-red-500/10 border-red-500/20' : 
              alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 
              alert.type === 'info' ? 'bg-blue-500/10 border-blue-500/20' :
              'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              <alert.icon className={`w-5 h-5 mt-0.5 ${
                 alert.type === 'danger' ? 'text-red-400' : 
                 alert.type === 'warning' ? 'text-amber-400' : 
                 alert.type === 'info' ? 'text-blue-400' :
                 'text-emerald-400'
              }`} />
              <p className={`text-sm pr-6 ${
                 alert.type === 'danger' ? 'text-red-200' : 
                 alert.type === 'warning' ? 'text-amber-200' : 
                 alert.type === 'info' ? 'text-blue-200' :
                 'text-emerald-200'
              }`}>{alert.message}</p>
              <button 
                onClick={() => dismissAlert(alert.id)}
                className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 8. RECENT TRANSACTIONS (Max 50) */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">Recent Transactions</h2>
          <button onClick={() => navigate('/transactions')} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
              <tr>
                <th className="pb-3 font-medium">Transaction</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Account</th>
                <th className="pb-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {recentGroupedTransactions.map((group, groupIdx) => (
                <Fragment key={group.date}>
                  <tr className="bg-zinc-800/60 shadow-sm">
                    <td colSpan={4} className="py-4 px-4 border-y border-zinc-700/50 text-sm font-bold text-zinc-100 tracking-wide backdrop-blur-sm">
                      {group.date}
                    </td>
                  </tr>
                  {group.transactions.map((txn) => {
                    const cat = categories.find(c => c.id === txn.categoryId);
                    const acc = accounts.find(a => a.id === txn.accountId);
                    return (
                      <tr key={txn.id} onClick={() => setSelectedTxn(txn)} className="group hover:bg-zinc-800/20 transition-colors cursor-pointer">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              txn.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {txn.type === 'income' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-zinc-200">{txn.description}</p>
                              <p className="text-xs text-zinc-500">{new Date(txn.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-zinc-400">
                          <span className="px-2.5 py-1 bg-zinc-800/50 rounded-md text-xs">{cat ? cat.name : txn.category}</span>
                        </td>
                        <td className="py-4 text-zinc-400">{acc ? acc.name : txn.account}</td>
                        <td className={`py-4 text-right font-medium ${txn.type === 'income' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                          {txn.type === "income" ? "+" : "-"}{formatCurrency(Math.abs(txn.amount), txn.currency || 'USD')}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-6 text-zinc-500 text-sm">No transactions found for this period.</div>
          )}
        </div>
      </div>

      {selectedTxn && (
        <TransactionDetailModal 
          transaction={selectedTxn} 
          onClose={() => setSelectedTxn(null)} 
        />
      )}
    </div>
    </>
  );
}

function DashboardSettingsDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useFinance();
  
  const toggleLayout = (key: keyof typeof settings.dashboardConfig) => {
    updateSettings({
      dashboardConfig: {
        ...settings.dashboardConfig,
        [key]: !settings.dashboardConfig?.[key]
      }
    });
  };

  const layoutItems = [
    { title: "Wallet Overview", key: "hideWallet" },
    { title: "Top Categories", key: "hideTopCategories" },
    { title: "Upcoming Subscriptions", key: "hideUpcomingSubs" },
    { title: "Savings Rate", key: "hideSavingsRate" },
    { title: "Active Goals", key: "hideGoals" },
    { title: "Smart Warnings", key: "hideWarnings" },
    { title: "Recent Transactions", key: "hideRecentTransactions" }
  ] as const;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0" onClick={onClose} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-16 right-4 sm:top-20 sm:right-6 lg:top-24 lg:right-8 w-72 bg-zinc-900/60 backdrop-blur-2xl border border-zinc-700/50 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-700/30 shrink-0 bg-zinc-800/20">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Dashboard Layout</h2>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-700/30 hover:bg-zinc-700/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-[60vh] space-y-1 custom-scrollbar">
              {layoutItems.map((item, i) => {
                const isHidden = settings.dashboardConfig?.[item.key] ?? false;
                return (
                  <button
                    key={i}
                    onClick={() => toggleLayout(item.key)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-800/40 transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-zinc-200">{item.title}</span>
                    <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-1 ${!isHidden ? 'bg-indigo-500' : 'bg-zinc-700'}`}>
                      <motion.div 
                        layout
                        initial={false}
                        animate={{ x: !isHidden ? 16 : 0 }}
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>, document.body
  );
}
