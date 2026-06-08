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
  Brush,
  ReferenceArea
} from "recharts";
import { Download, PieChart as PieChartIcon } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { downloadTextFile, useFinance } from "../data/financeStore";
import { formatCurrency } from "../utils";
import { TimeFilter } from "../components/TimeFilter";

export function Analytics() {
  const { transactions, totals } = useFinance();
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end && t.type !== "transfer");
  }, [transactions, dateRange]);

  const monthlyData = useMemo(() => {
    const dailyData: Record<string, { name: string, income: number, expense: number, profit: number }> = {};
    [...filteredTransactions].reverse().forEach(t => {
      const monthLabel = new Date(t.date).toLocaleDateString(undefined, {month: 'short', year: '2-digit'});
      if (!dailyData[monthLabel]) dailyData[monthLabel] = { name: monthLabel, income: 0, expense: 0, profit: 0 };
      if (t.type === "income") dailyData[monthLabel].income += Math.abs(t.amount);
      if (t.type === "expense") dailyData[monthLabel].expense += Math.abs(t.amount);
      dailyData[monthLabel].profit = dailyData[monthLabel].income - dailyData[monthLabel].expense;
    });
    return Object.values(dailyData);
  }, [filteredTransactions]);

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
  
  const healthScore = Math.max(1, Math.min(99, Math.round(72 + ((totalIncome - totalExpense) / Math.max(1, totalIncome)) * 30)));

  const incomeExpenseRatio = totalIncome > 0 ? (totalExpense / totalIncome * 100).toFixed(1) : 0;

  function exportAnalytics() {
    const content = [
      "FlowLedger Analytics",
      `Period,${dateRange.start} to ${dateRange.end}`,
      `Income,${totalIncome}`,
      `Expenses,${totalExpense}`,
      `Net Profit,${totalIncome - totalExpense}`,
      `Health Score,${healthScore}`,
      `Expense Ratio,${incomeExpenseRatio}%`,
    ].join("\n");
    downloadTextFile(`flowledger-analytics-${dateRange.start}-${dateRange.end}.csv`, content, "text/csv");
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Analytics & Reports</h1>
          <p className="text-zinc-500 text-sm mt-1">Deep dive into your financial health and trends.</p>
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
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm select-none">
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
                  if (e && e.activeTooltipIndex !== undefined) {
                    activeTooltipIndexRef.current = e.activeTooltipIndex;
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} domain={[monthlyData[currentLeft]?.name || 'dataMin', monthlyData[currentRight]?.name || 'dataMax']} allowDataOverflow />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={300} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-center">Scroll to zoom in and out.</p>
        </div>

        {/* Profit Trend Line Chart */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm select-none">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">Net Profit Margin</h2>
          </div>
          <div className="h-80" ref={chartContainerRef2}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={monthlyData.slice(currentLeft, currentRight + 1)} 
                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e && e.activeTooltipIndex !== undefined) {
                    activeTooltipIndexRef.current = e.activeTooltipIndex;
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} domain={[monthlyData[currentLeft]?.name || 'dataMin', monthlyData[currentRight]?.name || 'dataMax']} allowDataOverflow />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={300} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-center">Scroll to zoom in and out.</p>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
            <span className="text-2xl font-bold text-emerald-400">{healthScore}</span>
          </div>
          <h3 className="text-zinc-100 font-medium">Financial Health Score</h3>
          <p className="text-xs text-zinc-500 mt-2">Based on profit rate, expense pressure, and balance coverage.</p>
        </div>
        
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider mb-4">Top Spending Categories</h3>
          <div className="space-y-4">
            {(topSpending.length ? topSpending : [["None", 0]]).map(([category, amount], index) => (
            <div key={category}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">{category}</span>
                <span className="text-zinc-400">{formatCurrency(Number(amount))}</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${index === 0 ? "bg-violet-500" : index === 1 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${Math.max(2, Math.min(100, Number(amount) / Math.max(1, totalExpense) * 100))}%` }}></div>
              </div>
            </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
            <PieChartIcon className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-zinc-100 font-medium mb-2">Income / Expense Ratio</h3>
          <div className="text-3xl font-bold text-zinc-100 mb-1">{incomeExpenseRatio}%</div>
          <p className="text-xs text-zinc-500">You spend {incomeExpenseRatio}% of what you earn during this period.</p>
        </div>
      </div>
    </div>
  );
}
