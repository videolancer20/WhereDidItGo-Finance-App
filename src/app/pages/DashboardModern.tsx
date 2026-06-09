import { 
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, 
  MoreHorizontal, Briefcase, User, Zap, Tag, AlertCircle, PlusCircle, CheckCircle2, Target, X
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Link, useNavigate } from "react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useFinance, type FinanceTransaction } from "../data/financeStore";
import { formatCurrency, convertCurrency } from "../utils";
import { TimeFilter } from "../components/TimeFilter";
import { TransactionDetailModal } from "../components/TransactionDetailModal";
import { toast } from "sonner";

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

  // Quick Add State
  const [quickAddAmount, setQuickAddAmount] = useState("");
  const [quickAddDesc, setQuickAddDesc] = useState("");

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddAmount || !quickAddDesc) return;
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
    
    nonTransfers.forEach(t => {
      const amountInTarget = globalCurrency === "MULTI" ? convertCurrency(Math.abs(t.amount), t.currency || "USD", "USD", exchangeRates) : convertCurrency(Math.abs(t.amount), t.currency || "USD", globalCurrency, exchangeRates);
      if (t.type === "income") income += amountInTarget;
      if (t.type === "expense") expense += amountInTarget;
    });

    let totalBalanceConverted = 0;
    accounts.filter((a) => a.type !== "Credit Card").forEach(a => {
      const bal = accountBalances[a.id] ?? 0;
      const cur = a.currency || "USD";
      totalBalanceConverted += globalCurrency === "MULTI" ? convertCurrency(bal, cur, "USD", exchangeRates) : convertCurrency(bal, cur, globalCurrency, exchangeRates);
    });

    return { totalBalanceConverted, income, expense, profit: income - expense };
  }, [filteredTransactions, accountBalances, accounts, globalCurrency, exchangeRates]);

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
      const amt = globalCurrency === "MULTI" ? convertCurrency(Math.abs(t.amount), t.currency || "USD", "USD", exchangeRates) : convertCurrency(Math.abs(t.amount), t.currency || "USD", globalCurrency, exchangeRates);
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

  const displayCurrency = globalCurrency === "MULTI" ? "USD" : globalCurrency;

  // Chart data
  const chartData = useMemo(() => {
    const dailyData: Record<string, { name: string, income: number, expense: number }> = {};
    [...filteredTransactions].reverse().forEach(t => {
      if (t.type === "transfer") return;
      if (!dailyData[t.date]) dailyData[t.date] = { name: new Date(t.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}), income: 0, expense: 0 };
      const convertedAmount = convertCurrency(Math.abs(t.amount), t.currency || "USD", displayCurrency, exchangeRates);
      if (t.type === "income") dailyData[t.date].income += convertedAmount;
      if (t.type === "expense") dailyData[t.date].expense += convertedAmount;
    });
    return Object.values(dailyData);
  }, [filteredTransactions, displayCurrency, exchangeRates]);

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
      if (newRight - newLeft >= 2) { setLeft(newLeft); setRight(newRight); }
    };
    container.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => container.removeEventListener("wheel", handleWheelNative);
  }, [chartData.length, currentLeft, currentRight]);

  const breakdownData = useMemo(() => {
    const grouped = filteredTransactions.filter(t => t.type === breakdownType).reduce((acc, t) => {
      const convertedAmount = convertCurrency(Math.abs(t.amount), t.currency || "USD", displayCurrency, exchangeRates);
      acc[t.categoryId] = (acc[t.categoryId] || 0) + convertedAmount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped).map(([categoryId, value]) => {
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
      return { categoryId, name: cat?.name || "Other", value, color: hex };
    }).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredTransactions, breakdownType, categories, displayCurrency, exchangeRates]);

  const categoryPerformance = useMemo(() => {
    const stats: Record<string, { id: string, name: string, income: number, expense: number, profit: number, icon: any, color: string }> = {};
    filteredTransactions.forEach(t => {
      if (t.type === "transfer") return;
      if (!stats[t.categoryId]) {
        const cat = categories.find(c => c.id === t.categoryId);
        if (!cat) return;
        stats[t.categoryId] = { id: t.categoryId, name: cat.name, income: 0, expense: 0, profit: 0, icon: categoryIcons[t.categoryId] || Tag, color: cat.color };
      }
      const convertedAmount = convertCurrency(Math.abs(t.amount), t.currency || "USD", displayCurrency, exchangeRates);
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
    const firstTxn = new Date([...transactions].sort((a,b)=>a.date.localeCompare(b.date))[0].date);
    const monthsActive = Math.max(1, (now.getFullYear() - firstTxn.getFullYear()) * 12 + now.getMonth() - firstTxn.getMonth());
    const totalSpentEver = allExpenses.reduce((s,t) => s + Math.abs(t.amount), 0);
    const avgMonthlySpend = totalSpentEver / monthsActive;
    const thisMonthTxns = allExpenses.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
    const spentThisMonth = thisMonthTxns.reduce((s,t) => s + Math.abs(t.amount), 0);
    const spendProgress = avgMonthlySpend > 0 ? (spentThisMonth / avgMonthlySpend) * 100 : 0;
    return { timeProgress, spendProgress, spentThisMonth, averageSpend: avgMonthlySpend };
  }, [transactions]);



  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20 fade-in">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Command Center</h1>
          <p className="text-zinc-500 text-sm mt-1">Real-time overview and actionable insights.</p>
        </div>
        <TimeFilter onChange={setDateRange} compact />
      </div>

      {/* 1. TOP KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-sm group hover:bg-zinc-900/60 transition-colors">
          <p className="text-xs font-medium text-zinc-400 mb-1">Total Assets</p>
          <h3 className="text-2xl font-bold text-zinc-100 mb-2">{formatCurrency(liveTotals.totalBalanceConverted, displayCurrency)}</h3>
          <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md w-max ${trends.assets >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trends.assets >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trends.assets >= 0 ? "+" : ""}{trends.assets.toFixed(1)}%
          </span>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-sm group hover:bg-zinc-900/60 transition-colors">
          <p className="text-xs font-medium text-zinc-400 mb-1">Period Income</p>
          <h3 className="text-2xl font-bold text-emerald-400 mb-2">{formatCurrency(liveTotals.income, displayCurrency)}</h3>
          <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md w-max ${trends.income >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trends.income >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trends.income >= 0 ? "+" : ""}{trends.income.toFixed(1)}%
          </span>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-sm group hover:bg-zinc-900/60 transition-colors">
          <p className="text-xs font-medium text-zinc-400 mb-1">Period Expense</p>
          <h3 className="text-2xl font-bold text-rose-400 mb-2">{formatCurrency(liveTotals.expense, displayCurrency)}</h3>
          <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md w-max ${trends.expense <= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trends.expense <= 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
            {trends.expense > 0 ? "+" : ""}{trends.expense.toFixed(1)}%
          </span>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-sm group hover:bg-zinc-900/60 transition-colors">
          <p className="text-xs font-medium text-zinc-400 mb-1">Net Profit</p>
          <h3 className="text-2xl font-bold text-indigo-400 mb-2">{formatCurrency(liveTotals.profit, displayCurrency)}</h3>
          <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md w-max ${trends.profit >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trends.profit >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trends.profit >= 0 ? "+" : ""}{trends.profit.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 2. CASHFLOW AND BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm select-none">
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
              <AreaChart data={chartData.slice(currentLeft, currentRight + 1)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" animationDuration={300} />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" animationDuration={300} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-center">Scroll to zoom in and out.</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Breakdown</h2>
            <div className="flex bg-zinc-950 p-1 rounded-lg">
              <button onClick={() => setBreakdownType("expense")} className={`px-2 py-1 text-xs rounded-md ${breakdownType === "expense" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}>Exp</button>
              <button onClick={() => setBreakdownType("income")} className={`px-2 py-1 text-xs rounded-md ${breakdownType === "income" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}>Inc</button>
            </div>
          </div>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={breakdownData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {breakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} formatter={(val: number) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-zinc-100">{formatCurrency(breakdownData.reduce((s,i) => s + i.value, 0))}</span>
              <span className="text-[10px] text-zinc-500 uppercase">Total {breakdownType}</span>
            </div>
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
      </div>

      {/* 3. QUICK ADD & MONTHLY RUN-RATE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-center">
          <h2 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Quick Add Expense</h2>
          <form onSubmit={handleQuickAdd} className="flex gap-2">
            <input type="number" placeholder="$ 0.00" className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none" value={quickAddAmount} onChange={e => setQuickAddAmount(e.target.value)} />
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

      {/* 5. TOP CATEGORIES, SUBSCRIPTIONS, SAVINGS RATE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Categories */}
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

        {/* Subscriptions */}
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

        {/* Savings Rate */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
            <Target className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-zinc-100 font-medium mb-2">Savings Rate</h3>
          <div className="text-4xl font-bold text-zinc-100 mb-1">{liveTotals.income > 0 ? Math.max(0, Math.round((liveTotals.profit / liveTotals.income) * 100)) : 0}%</div>
          <p className="text-xs text-zinc-500">You saved {liveTotals.income > 0 ? Math.max(0, Math.round((liveTotals.profit / liveTotals.income) * 100)) : 0}% of your income in this period.</p>
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
              {filteredTransactions.slice(0, 50).map((txn) => {
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
  );
}
