import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  MoreHorizontal, 
  Briefcase,
  User,
  Zap,
  Tag
} from "lucide-react";
import {
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Brush,
  ReferenceArea
} from "recharts";
import { Link } from "react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useFinance, type FinanceTransaction } from "../data/financeStore";
import { formatCurrency, convertCurrency } from "../utils";
import { TimeFilter } from "../components/TimeFilter";
import { TransactionDetailModal } from "../components/TransactionDetailModal";

const categoryIcons: Record<string, any> = {
  "personal-expenses": User,
  "freelance-income": Zap,
  "v20-studio": Briefcase,
};

export function Dashboard() {
  const { transactions, categories, accounts, accountBalances, upcomingPayments, paySubscription, settings, exchangeRates } = useFinance();
  const globalCurrency = settings.currency || "USD";
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) });
  const [breakdownType, setBreakdownType] = useState<"expense" | "income">("expense");
  const [selectedTxn, setSelectedTxn] = useState<FinanceTransaction | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end);
  }, [transactions, dateRange]);

  // Compute live totals
  const liveTotals = useMemo(() => {
    const nonTransfers = filteredTransactions.filter((t) => t.type !== "transfer");
    let income = 0;
    let expense = 0;
    
    nonTransfers.forEach(t => {
      const amountInTarget = globalCurrency === "MULTI" 
        ? convertCurrency(Math.abs(t.amount), t.currency || "USD", "USD", exchangeRates)
        : convertCurrency(Math.abs(t.amount), t.currency || "USD", globalCurrency, exchangeRates);
        
      if (t.type === "income") income += amountInTarget;
      if (t.type === "expense") expense += amountInTarget;
    });

    const balancesByCurrency: Record<string, number> = {};
    let totalBalanceConverted = 0;

    accounts.filter((a) => a.type !== "Credit Card").forEach(a => {
      const bal = accountBalances[a.id] ?? 0;
      const cur = a.currency || "USD";
      balancesByCurrency[cur] = (balancesByCurrency[cur] || 0) + bal;
      
      totalBalanceConverted += globalCurrency === "MULTI"
        ? convertCurrency(bal, cur, "USD", exchangeRates)
        : convertCurrency(bal, cur, globalCurrency, exchangeRates);
    });

    return { totalBalanceConverted, balancesByCurrency, income, expense, profit: income - expense };
  }, [filteredTransactions, accountBalances, accounts, globalCurrency, exchangeRates]);

  const multiBalanceStr = Object.entries(liveTotals.balancesByCurrency).map(([c, v]) => formatCurrency(v, c)).join(" | ");
  const displayCurrency = globalCurrency === "MULTI" ? "USD" : globalCurrency;

  const liveKpiData = [
    { label: "Total Balance", value: globalCurrency === "MULTI" ? multiBalanceStr : formatCurrency(liveTotals.totalBalanceConverted, globalCurrency), change: "+4.2%", trend: "up" },
    { label: "Period Income", value: formatCurrency(liveTotals.income, displayCurrency), change: "+12.5%", trend: "up" },
    { label: "Period Expenses", value: formatCurrency(liveTotals.expense, displayCurrency), change: "-2.4%", trend: "down" },
    { label: "Net Profit", value: formatCurrency(liveTotals.profit, displayCurrency), change: "+18.1%", trend: "up" },
    { label: "Savings Rate", value: liveTotals.income > 0 ? `${Math.max(0, Math.round((liveTotals.profit / liveTotals.income) * 100))}%` : "0%", change: "+5.2%", trend: "up" },
  ];

  // Cash flow chart data
  const chartData = useMemo(() => {
    const dailyData: Record<string, { name: string, income: number, expense: number }> = {};
    const displayCurrency = globalCurrency === "MULTI" ? "USD" : globalCurrency;
    
    [...filteredTransactions].reverse().forEach(t => {
      if (t.type === "transfer") return;
      if (!dailyData[t.date]) dailyData[t.date] = { name: new Date(t.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}), income: 0, expense: 0 };
      
      const convertedAmount = convertCurrency(Math.abs(t.amount), t.currency || "USD", displayCurrency, exchangeRates);
      if (t.type === "income") dailyData[t.date].income += convertedAmount;
      if (t.type === "expense") dailyData[t.date].expense += convertedAmount;
    });
    return Object.values(dailyData);
  }, [filteredTransactions, globalCurrency, exchangeRates]);

  // Breakdown chart
  const breakdownData = useMemo(() => {
    const displayCurrency = globalCurrency === "MULTI" ? "USD" : globalCurrency;
    const grouped = filteredTransactions.filter(t => t.type === breakdownType).reduce((acc, t) => {
      const convertedAmount = convertCurrency(Math.abs(t.amount), t.currency || "USD", displayCurrency, exchangeRates);
      acc[t.categoryId] = (acc[t.categoryId] || 0) + convertedAmount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([categoryId, value]) => {
      const cat = categories.find(c => c.id === categoryId);
      const colorStr = cat?.color || "";
      let hex = "#71717a"; // zinc-500
      if (colorStr.includes("emerald")) hex = "#10b981";
      else if (colorStr.includes("blue")) hex = "#3b82f6";
      else if (colorStr.includes("rose") || colorStr.includes("red")) hex = "#f43f5e";
      else if (colorStr.includes("amber") || colorStr.includes("yellow") || colorStr.includes("orange")) hex = "#f59e0b";
      else if (colorStr.includes("purple") || colorStr.includes("violet") || colorStr.includes("indigo")) hex = "#8b5cf6";
      else if (colorStr.includes("cyan") || colorStr.includes("sky") || colorStr.includes("teal")) hex = "#06b6d4";
      else if (colorStr.includes("pink") || colorStr.includes("fuchsia")) hex = "#ec4899";

      return { categoryId, name: cat?.name || "Other", value, color: hex };
    }).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredTransactions, breakdownType, categories]);

  // Category performance
  const categoryPerformance = useMemo(() => {
    const displayCurrency = globalCurrency === "MULTI" ? "USD" : globalCurrency;
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
  }, [filteredTransactions, categories, globalCurrency, exchangeRates]);

  // Chart interactivity state
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const activeTooltipIndexRef = useRef<number>(0);

  const currentLeft = left !== null ? left : 0;
  const currentRight = right !== null ? right : Math.max(0, chartData.length - 1);

  const zoomOut = () => {
    setLeft(null);
    setRight(null);
  };

  const chartContainerRef = useRef<HTMLDivElement>(null);

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

      let newLeft = currentLeft;
      let newRight = currentRight;

      if (zoomIn) {
        const leftRatio = range > 0 ? (focusIndex - currentLeft) / range : 0.5;
        newLeft = currentLeft + Math.round(zoomAmount * leftRatio);
        newRight = currentRight - Math.round(zoomAmount * (1 - leftRatio));
      } else {
        const leftRatio = range > 0 ? (focusIndex - currentLeft) / range : 0.5;
        newLeft = Math.max(0, currentLeft - Math.round(zoomAmount * leftRatio));
        newRight = Math.min(chartData.length - 1, currentRight + Math.round(zoomAmount * (1 - leftRatio)));
      }

      if (newRight - newLeft >= 2) {
        setLeft(newLeft);
        setRight(newRight);
      }
    };

    container.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheelNative);
    };
  }, [chartData.length, currentLeft, currentRight]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
        <TimeFilter onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {liveKpiData.map((kpi, i) => (
          <div key={i} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 hover:bg-zinc-900/60 transition-colors cursor-pointer group backdrop-blur-sm">
            <p className="text-zinc-400 text-sm font-medium mb-1">{kpi.label}</p>
            <h3 className="text-2xl font-semibold text-zinc-100 mb-3">{kpi.value}</h3>
            <div className="flex items-center gap-2">
              <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md ${
                kpi.trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              }`}>
                {kpi.trend === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Section 70% */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Cash Flow Chart */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm select-none">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">Interactive Cash Flow</h2>
              {(left !== null || right !== null) && (
                <button onClick={zoomOut} className="px-3 py-1.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors">
                  Reset Zoom
                </button>
              )}
            </div>
            <div className="h-72" ref={chartContainerRef}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={chartData.slice(currentLeft, currentRight + 1)} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onMouseMove={(e) => {
                    if (e && e.activeTooltipIndex !== undefined) {
                      activeTooltipIndexRef.current = e.activeTooltipIndex;
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} domain={[chartData[currentLeft]?.name || 'dataMin', chartData[currentRight]?.name || 'dataMax']} allowDataOverflow />
                  <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" animationDuration={300} />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" animationDuration={300} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-zinc-500 mt-2 text-center">Scroll to zoom in and out.</p>
          </div>

          {/* Category Performance */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">Top Categories</h2>
              <Link to="/categories" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View All</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categoryPerformance.map((cat, i) => (
                <Link to={`/categories/${cat.id}`} key={cat.id} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 hover:bg-zinc-800/50 transition-all block group cursor-pointer backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                      {cat.icon && <cat.icon className="w-5 h-5" />}
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-zinc-100 font-medium mb-4">{cat.name}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Income</span>
                      <span className="text-emerald-400">{formatCurrency(cat.income)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Expense</span>
                      <span className="text-rose-400">{formatCurrency(cat.expense)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">Recent Transactions</h2>
              <Link to="/transactions" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View All</Link>
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
                  {filteredTransactions.slice(0, 5).map((txn) => (
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
                            <p className="text-xs text-zinc-500">{txn.date}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-zinc-400">
                        <span className="px-2.5 py-1 bg-zinc-800/50 rounded-md text-xs">{txn.category}</span>
                      </td>
                      <td className="py-4 text-zinc-400">{txn.account}</td>
                      <td className={`py-4 text-right font-medium ${txn.type === 'income' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {txn.type === "income" ? "+" : "-"}{formatCurrency(Math.abs(txn.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Section 30% */}
        <div className="space-y-6">
          
          {/* Expense Breakdown */}
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
                  <Pie
                    data={breakdownData}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                    dataKey="value" stroke="none"
                  >
                    {breakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} formatter={(val: number) => formatCurrency(val)} />
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

          {/* Upcoming Payments (Subscriptions) */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Upcoming Subscriptions</h2>
              <Link to="/subscriptions" className="text-zinc-500 hover:text-zinc-300"><MoreHorizontal className="w-4 h-4" /></Link>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {(!upcomingPayments || upcomingPayments.length === 0) ? (
                <p className="text-zinc-500 text-sm text-center py-4">No upcoming payments.</p>
              ) : (upcomingPayments || []).slice(0, 5).map((payment) => (
              <div key={`${payment.id}-${payment.nextDate}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                    <span className="text-xs font-bold text-zinc-300">{payment.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{payment.name}</p>
                    <p className="text-xs text-zinc-500">{new Date(payment.nextDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => paySubscription(payment.id)}
                  className="text-xs font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Pay {formatCurrency(payment.amount)}
                </button>
              </div>
              ))}
            </div>
          </div>
          
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
