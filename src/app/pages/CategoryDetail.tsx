import { useParams, Link } from "react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Briefcase, 
  TrendingUp,
  Download,
  Users,
  Target,
  User,
  Zap,
  Landmark,
  PiggyBank,
  Receipt,
  ShoppingCart,
  Plane,
  Monitor,
  Tags
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Brush
} from "recharts";
import { formatCurrency } from "../utils";
import { downloadTextFile, useFinance } from "../data/financeStore";

const categoryIcons: Record<string, any> = {
  "personal-expenses": User,
  "freelance-income": Zap,
  "v20-studio": Briefcase,
  investments: TrendingUp,
  taxes: Landmark,
  savings: PiggyBank,
  "business-expenses": Receipt,
  groceries: ShoppingCart,
  travel: Plane,
  software: Monitor,
};

export function CategoryDetail() {
  const { id } = useParams();
  const { categories, transactions, settings } = useFinance();
  
  const category = categories.find(c => c.id === id) || { id: id || "unknown", name: id || "Unknown", type: "expense", color: "bg-zinc-500/20 text-zinc-400" };
  const Icon = categoryIcons[category.id] || Tags;

  // Filter transactions for this category
  const catTransactions = useMemo(() => {
    return transactions.filter(t => t.categoryId === id && t.type !== "transfer");
  }, [transactions, id]);

  const { revenue, expense } = useMemo(() => {
    return catTransactions.reduce((acc, t) => {
      if (t.type === "income") acc.revenue += Math.abs(t.amount);
      if (t.type === "expense") acc.expense += Math.abs(t.amount);
      return acc;
    }, { revenue: 0, expense: 0 });
  }, [catTransactions]);

  const netProfit = revenue - expense;
  const profitMargin = revenue > 0 ? `${((netProfit / revenue) * 100).toFixed(1)}%` : "0.0%";

  // Real Monthly Data
  const monthlyData = useMemo(() => {
    const data: Record<string, { name: string, dateObj: Date, revenue: number, expense: number }> = {};
    [...catTransactions].reverse().forEach(t => {
      const monthLabel = new Date(t.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      if (!data[monthLabel]) data[monthLabel] = { name: monthLabel, dateObj: new Date(t.date), revenue: 0, expense: 0 };
      if (t.type === "income") data[monthLabel].revenue += Math.abs(t.amount);
      if (t.type === "expense") data[monthLabel].expense += Math.abs(t.amount);
    });
    return Object.values(data).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [catTransactions]);

  // Real Drivers (Top accounts used for this category)
  const drivers = useMemo(() => {
    const accounts: Record<string, number> = {};
    catTransactions.forEach(t => {
      accounts[t.account] = (accounts[t.account] || 0) + Math.abs(t.amount);
    });
    return Object.entries(accounts)
      .map(([name, amount]) => ({ name, amount, detail: "Total Transacted" }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [catTransactions]);

  // Growth Trend (Month over Month)
  const growthTrend = useMemo(() => {
    if (monthlyData.length < 2) return [];
    const trend = [];
    for (let i = 1; i < monthlyData.length; i++) {
      const prev = monthlyData[i-1];
      const curr = monthlyData[i];
      const primaryMetric = category.type === "income" ? "revenue" : "expense";
      const growth = prev[primaryMetric] > 0 ? ((curr[primaryMetric] - prev[primaryMetric]) / prev[primaryMetric]) * 100 : 0;
      trend.push({ name: curr.name, growth, raw: curr[primaryMetric] });
    }
    return trend.slice(-6); // Last 6 months MoM growth
  }, [monthlyData, category.type]);

  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const activeTooltipIndexRef = useRef<number>(0);

  const currentLeft = left !== null ? left : 0;
  const currentRight = right !== null ? right : Math.max(0, monthlyData.length - 1);

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

    container.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheelNative);
    };
  }, [monthlyData.length, currentLeft, currentRight]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 w-full max-w-[2560px] mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/categories" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">{category.name}</h1>
            <p className="text-zinc-500 text-sm mt-1 capitalize">{category.type} Category</p>
          </div>
        </div>
        <button
          onClick={() => downloadTextFile(`${category.name}-category-report.csv`, `Metric,Value\nRevenue,${revenue}\nExpenses,${expense}\nNet,${netProfit}\nMargin,${profitMargin}`, "text/csv")}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <p className="text-zinc-400 text-sm font-medium mb-2">Total Income</p>
          <h3 className="text-3xl font-semibold text-zinc-100 mb-2">{formatCurrency(revenue)}</h3>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <p className="text-zinc-400 text-sm font-medium mb-2">Total Expenses</p>
          <h3 className="text-3xl font-semibold text-zinc-100 mb-2">{formatCurrency(expense)}</h3>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <p className="text-zinc-400 text-sm font-medium mb-2">Net Cash</p>
          <h3 className="text-3xl font-semibold text-purple-400 mb-2">{formatCurrency(netProfit)}</h3>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <p className="text-zinc-400 text-sm font-medium mb-2">Profit Margin</p>
          <h3 className="text-3xl font-semibold text-zinc-100 mb-2">{profitMargin}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm select-none">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">Historical Performance</h2>
            {(left !== null || right !== null) && (
              <button onClick={zoomOut} className="px-3 py-1.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors">
                Reset Zoom
              </button>
            )}
          </div>
          <div className="h-80" ref={chartContainerRef}>
            {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={monthlyData.slice(currentLeft, currentRight + 1)} 
                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e && e.activeTooltipIndex !== undefined) {
                    activeTooltipIndexRef.current = e.activeTooltipIndex;
                  }
                }}
              >
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} domain={[monthlyData[currentLeft]?.name || 'dataMin', monthlyData[currentRight]?.name || 'dataMax']} allowDataOverflow />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value, settings?.currency)} contentStyle={{ backgroundColor: 'var(--zinc-900)', borderColor: 'var(--zinc-800)', borderRadius: '8px', color: 'var(--zinc-200)' }} itemStyle={{ color: 'var(--zinc-200)' }} />
                <Area type="monotone" dataKey="revenue" name="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" animationDuration={300} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" animationDuration={300} />

              </AreaChart>
            </ResponsiveContainer>
            ) : <div className="w-full h-full flex items-center justify-center text-zinc-500">No data available</div>}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Top Accounts Used</h2>
              <Users className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="space-y-4">
              {drivers.length > 0 ? drivers.map((driver, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                  <div>
                    <p className="text-sm font-medium text-zinc-200 truncate max-w-[140px]">{driver.name}</p>
                    <p className="text-xs text-zinc-500">{driver.detail}</p>
                  </div>
                  <span className="font-semibold text-zinc-100">{formatCurrency(driver.amount)}</span>
                </div>
              )) : <p className="text-sm text-zinc-500 text-center py-4">No accounts used.</p>}
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Growth Trend (MoM)</h2>
              <Target className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="h-40">
              {growthTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthTrend}>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--zinc-900)', borderColor: 'var(--zinc-800)', borderRadius: '8px', color: 'var(--zinc-200)' }}
                    itemStyle={{ color: 'var(--zinc-200)' }}
                    cursor={{ fill: 'var(--zinc-800)', opacity: 0.4 }}
                    formatter={(val: number) => [`${val.toFixed(1)}%`, 'MoM Growth']}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <Bar dataKey="growth" radius={[4, 4, 0, 0]}>
                    {growthTrend.map((entry, index) => (
                      <cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-500 text-center py-8">Not enough data points.</p>}
            </div>
            <p className="text-xs text-zinc-500 mt-4 text-center">Visualizes the month-over-month growth of your primary metric ({category.type === "income" ? "revenue" : "expense"}).</p>
          </div>

        </div>
      </div>
    </div>
  );
}
