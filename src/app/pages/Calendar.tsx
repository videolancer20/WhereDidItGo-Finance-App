import { useState, useMemo, useEffect } from "react";
import { useFinance } from "../data/financeStore";
import { ChevronLeft, ChevronRight, RefreshCw, ArrowRightLeft, Target, Calendar as CalendarIcon, Grid, List, Layers, HelpCircle } from "lucide-react";
import { formatCurrency } from "../utils";
import { createPortal } from "react-dom";

type ViewMode = "decade" | "year" | "month" | "week";

export function Calendar() {
  const { transactions, subscriptions, goals, exchangeRates, settings } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [hoverTooltip, setHoverTooltip] = useState<{ visible: boolean, x: number, y: number, content: React.ReactNode } | null>(null);

  const handleMouseMove = (e: React.MouseEvent, content: React.ReactNode) => {
    setHoverTooltip({ visible: true, x: e.clientX, y: e.clientY, content });
  };
  const handleMouseLeave = () => setHoverTooltip(null);

  const globalCurrency = settings?.currency || "USD";
  const displayCurrency = globalCurrency === "MULTI" ? "USD" : globalCurrency;

  // Navigation handlers
  const navigatePrev = () => {
    setSelectedDate(null);
    const newDate = new Date(currentDate);
    if (viewMode === "decade") newDate.setFullYear(newDate.getFullYear() - 10);
    else if (viewMode === "year") newDate.setFullYear(newDate.getFullYear() - 1);
    else if (viewMode === "month") newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    setSelectedDate(null);
    const newDate = new Date(currentDate);
    if (viewMode === "decade") newDate.setFullYear(newDate.getFullYear() + 10);
    else if (viewMode === "year") newDate.setFullYear(newDate.getFullYear() + 1);
    else if (viewMode === "month") newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const getNavTitle = () => {
    if (viewMode === "decade") {
      const startYear = Math.floor(currentDate.getFullYear() / 10) * 10;
      return `${startYear} - ${startYear + 9}`;
    }
    if (viewMode === "year") return `${currentDate.getFullYear()}`;
    if (viewMode === "month") return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (viewMode === "week") {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return "";
  };

  type TotalsObj = {
    income: number;
    expense: number;
    profit: number;
    multiIncome: Record<string, number>;
    multiExpense: Record<string, number>;
    multiProfit: Record<string, number>;
  };

  // Helper to calculate total income/expense in display currency
  const calculateTotals = (txns: any[]): TotalsObj => {
    let income = 0;
    let expense = 0;
    const multiIncome: Record<string, number> = {};
    const multiExpense: Record<string, number> = {};

    txns.forEach(t => {
      if (t.type === "transfer") return;
      
      const tCur = t.currency || "USD";
      const amt = Math.abs(t.amount);

      if (t.type === "income") multiIncome[tCur] = (multiIncome[tCur] || 0) + amt;
      if (t.type === "expense") multiExpense[tCur] = (multiExpense[tCur] || 0) + amt;

      const rateToUse = t.exchangeRate || exchangeRates[tCur] || 1;
      const amountInUSD = amt / rateToUse;
      const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
      const convertedAmount = amountInUSD * targetRate;
      
      if (t.type === "income") income += convertedAmount;
      if (t.type === "expense") expense += convertedAmount;
    });

    const multiProfit: Record<string, number> = {};
    new Set([...Object.keys(multiIncome), ...Object.keys(multiExpense)]).forEach(cur => {
      multiProfit[cur] = (multiIncome[cur] || 0) - (multiExpense[cur] || 0);
    });

    return { income, expense, profit: income - expense, multiIncome, multiExpense, multiProfit };
  };

  const renderMultiList = (values: Record<string, number>, colorClass: string) => {
    const entries = Object.entries(values);
    if (entries.length === 0) return <span className="text-zinc-600">-</span>;
    return (
      <div className="flex flex-col items-end">
        {entries.map(([cur, val]) => (
          <span key={cur} className={colorClass}>{formatCurrency(val, cur)}</span>
        ))}
      </div>
    );
  };

  const renderTotals = (totals: TotalsObj, variant: "compact" | "normal" | "large" = "normal") => {
    if (totals.income === 0 && totals.expense === 0) return <div className={`text-zinc-500 py-1 ${variant === "compact" ? 'text-[10px]' : variant === "large" ? "text-sm" : 'text-xs'}`}>No activity</div>;
    
    const textSize = variant === "compact" ? "text-[10px]" : variant === "large" ? "text-sm" : "text-xs";
    const netSize = variant === "compact" ? "text-[10px] font-bold" : variant === "large" ? "text-base font-bold" : "text-sm font-bold";

    if (globalCurrency === "MULTI") {
      return (
        <div className={`flex flex-col gap-1 w-full ${textSize}`}>
          <div className="flex items-start justify-between gap-4">
            <span className="text-zinc-400 mt-0.5">Income</span>
            {renderMultiList(totals.multiIncome, "text-emerald-400 font-medium")}
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-zinc-400 mt-0.5">Expense</span>
            {renderMultiList(totals.multiExpense, "text-rose-400 font-medium")}
          </div>
          <div className="h-px bg-zinc-800/80 my-0.5" />
          <div className="flex items-start justify-between gap-4">
            <span className="text-zinc-300 font-medium mt-0.5">Net</span>
            <div className="flex flex-col items-end">
              {Object.entries(totals.multiProfit).map(([cur, val]) => (
                <span key={cur} className={`${netSize} ${val >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(val, cur)}</span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col gap-1 w-full ${textSize}`}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Income</span>
          <span className="text-emerald-400 font-medium">+{formatCurrency(totals.income, displayCurrency)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Expense</span>
          <span className="text-rose-400 font-medium">-{formatCurrency(totals.expense, displayCurrency)}</span>
        </div>
        <div className="h-px bg-zinc-800/80 my-0.5" />
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-300 font-medium">Net</span>
          <span className={`${netSize} ${totals.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(totals.profit, displayCurrency)}</span>
        </div>
      </div>
    );
  };

  const getSavingsRateContent = (totals: TotalsObj, title: string) => {
    const savingsRate = totals.income > 0 ? (totals.profit / totals.income) * 100 : 0;
    const isLoss = totals.profit < 0;
    const lossRate = totals.expense > 0 ? (Math.abs(totals.profit) / totals.expense) * 100 : 0;

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl w-48 z-50">
        <p className="text-zinc-400 text-xs mb-2">{title} Performance</p>
        <div className="space-y-1">
          {totals.income > 0 || totals.expense > 0 ? (
            isLoss ? (
              <p className="text-sm font-semibold text-rose-400">Loss: {lossRate.toFixed(1)}% of expenses</p>
            ) : (
              <p className="text-sm font-semibold text-emerald-400">Saved: {savingsRate.toFixed(1)}% of income</p>
            )
          ) : (
            <p className="text-sm text-zinc-500">No data</p>
          )}
          <div className="h-px bg-zinc-800 my-1" />
          <p className="text-[10px] text-zinc-500">Income: {formatCurrency(totals.income, displayCurrency)}</p>
          <p className="text-[10px] text-zinc-500">Expense: {formatCurrency(totals.expense, displayCurrency)}</p>
        </div>
      </div>
    );
  };

  // Pre-calculate all data to be rendered
  const calendarData = useMemo(() => {
    const data: any = { decades: {}, years: {}, days: {} };
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "decade") {
      const startYear = Math.floor(year / 10) * 10;
      for (let i = 0; i < 10; i++) {
        const currentYear = startYear + i;
        const yearTxns = transactions.filter(t => t.date.startsWith(`${currentYear}-`));
        data.decades[currentYear] = {
          txns: yearTxns,
          totals: calculateTotals(yearTxns)
        };
      }
    } else if (viewMode === "year") {
      for (let m = 0; m < 12; m++) {
        const monthPrefix = `${year}-${String(m + 1).padStart(2, '0')}`;
        const monthTxns = transactions.filter(t => t.date.startsWith(monthPrefix));
        data.years[m] = {
          txns: monthTxns,
          totals: calculateTotals(monthTxns)
        };
      }
    } else {
      // Month or Week view
      let visibleDates: Date[] = [];
      if (viewMode === "month") {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          visibleDates.push(new Date(year, month, i));
        }
      } else if (viewMode === "week") {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          visibleDates.push(d);
        }
      }

      visibleDates.forEach(d => {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayTxns = transactions.filter(t => t.date === dateStr);
        const items: any[] = dayTxns.map(t => ({ type: 'transaction', item: t }));

        // Subscriptions
        subscriptions.filter(s => s.status === 'active').forEach(sub => {
          let current = new Date(sub.startDate);
          // Only check up to this date
          while (current <= d) {
            if (current.getFullYear() === d.getFullYear() && current.getMonth() === d.getMonth() && current.getDate() === d.getDate()) {
               items.push({ type: 'subscription', item: sub });
               break;
            }
            if (sub.frequency === "monthly") current.setMonth(current.getMonth() + 1);
            else if (sub.frequency === "weekly") current.setDate(current.getDate() + 7);
            else if (sub.frequency === "yearly") current.setFullYear(current.getFullYear() + 1);
            else current.setDate(current.getDate() + (sub.customIntervalDays || 30));
          }
        });

        // Goals
        goals.forEach(goal => {
          if (goal.due === dateStr) {
            items.push({ type: 'goal', item: goal });
          }
        });

        data.days[dateStr] = {
          items,
          totals: calculateTotals(dayTxns),
          dateObj: d
        };
      });
    }
    return data;
  }, [currentDate, viewMode, transactions, subscriptions, goals, exchangeRates, displayCurrency]);

  const renderDecadeView = () => {
    const startYear = Math.floor(currentDate.getFullYear() / 10) * 10;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 flex-1">
        {Array.from({ length: 10 }).map((_, i) => {
          const currentYear = startYear + i;
          const { totals, txns } = calendarData.decades[currentYear] || { totals: { income: 0, expense: 0, profit: 0 }, txns: [] };
          return (
            <div 
              key={currentYear} 
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setFullYear(currentYear);
                setCurrentDate(newDate);
                setViewMode("year");
              }}
              onMouseMove={(e) => handleMouseMove(e, getSavingsRateContent(totals, `Year ${currentYear}`))}
              onMouseLeave={handleMouseLeave}
              className="bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 rounded-xl p-6 cursor-pointer transition-all hover:bg-zinc-800 flex flex-col justify-between h-48"
            >
              <div>
                <h3 className="text-3xl font-bold text-zinc-100 mb-1">{currentYear}</h3>
                <p className="text-sm text-zinc-500 mb-4">{txns.length} Transactions</p>
              </div>
              <div className="mt-auto">
                {renderTotals(totals, "large")}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderYearView = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-1">
        {months.map((mName, mIndex) => {
          const { totals, txns } = calendarData.years[mIndex] || { totals: { income: 0, expense: 0, profit: 0 }, txns: [] };
          return (
            <div 
              key={mIndex} 
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(mIndex);
                setCurrentDate(newDate);
                setViewMode("month");
              }}
              onMouseMove={(e) => handleMouseMove(e, getSavingsRateContent(totals, `${mName} ${currentDate.getFullYear()}`))}
              onMouseLeave={handleMouseLeave}
              className="bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all hover:bg-zinc-800 flex flex-col justify-between h-48"
            >
              <div>
                <h3 className="text-2xl font-bold text-zinc-100 mb-1">{mName}</h3>
                <p className="text-sm text-zinc-500 mb-4">{txns.length} Transactions</p>
              </div>
              <div className="mt-auto">
                {renderTotals(totals, "large")}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    return (
      <div className="flex-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-28 rounded-xl bg-zinc-900/20 border border-transparent" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const { items, totals } = calendarData.days[dateStr] || { items: [], totals: { income: 0, expense: 0, profit: 0 } };
            const isSelected = selectedDate === dateStr;
            
            return (
              <div 
                key={day} 
                onClick={() => setSelectedDate(dateStr)}
                onMouseMove={(e) => {
                  handleMouseMove(e, (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl z-50">
                      <p className="text-zinc-400 text-xs mb-2">Day Totals</p>
                      {renderTotals(totals, "normal")}
                    </div>
                  ));
                }}
                onMouseLeave={handleMouseLeave}
                className={`group relative h-28 rounded-xl border p-2 cursor-pointer transition-all overflow-hidden flex flex-col ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'}`}
              >
                <div className={`text-sm font-medium mb-1 ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`}>{day}</div>
                <div className="space-y-1 overflow-hidden flex-1">
                  {items.slice(0, 3).map((obj: any, idx: number) => {
                    if (obj.type === 'subscription') return <div key={idx} className={`text-[10px] truncate px-1.5 py-0.5 rounded ${obj.item.color?.replace('bg-', 'bg-').replace('-500', '-500/20').replace('text-white', '')} text-${obj.item.color?.split('-')[1]}-400 border border-${obj.item.color?.split('-')[1]}-500/20`}><RefreshCw className="w-2.5 h-2.5 inline mr-1"/>{obj.item.name}</div>
                    if (obj.type === 'transaction') {
                      const isIncome = obj.item.type === 'income';
                      return <div key={idx} className={`text-[10px] truncate px-1.5 py-0.5 rounded ${isIncome ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800/80 text-zinc-300 border-zinc-700'} border`}><ArrowRightLeft className="w-2.5 h-2.5 inline mr-1"/>{obj.item.description}</div>
                    }
                    if (obj.type === 'goal') return <div key={idx} className="text-[10px] truncate px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"><Target className="w-2.5 h-2.5 inline mr-1"/>{obj.item.name}</div>
                    return null;
                  })}
                  {items.length > 3 && <div className="text-[10px] text-zinc-500 pl-1">+{items.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    // 7 days horizontally, but stretched vertically.
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ dateObj: d, dateStr });
    }

    return (
      <div className="flex-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm min-h-[600px] flex flex-col">
        <div className="grid grid-cols-7 gap-4 mb-4">
          {days.map((d, i) => (
            <div key={i} className="text-center">
              <div className="text-xs font-medium text-zinc-500">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</div>
              <div className="text-lg font-bold text-zinc-100">{d.dateObj.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-4 flex-1">
          {days.map((d, i) => {
            const { items, totals } = calendarData.days[d.dateStr] || { items: [], totals: { income: 0, expense: 0, profit: 0 } };
            const isSelected = selectedDate === d.dateStr;
            
            return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(d.dateStr)}
                className={`group relative rounded-xl border p-3 cursor-pointer transition-all overflow-y-auto flex flex-col gap-2 ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'}`}
              >
                {/* Always visible totals at top in week view */}
                <div className="mb-2 pb-2 border-b border-zinc-800/50 flex flex-col gap-1">
                  {renderTotals(totals, "large")}
                </div>

                <div className="space-y-2">
                  {items.map((obj: any, idx: number) => {
                    if (obj.type === 'subscription') return <div key={idx} className={`text-[10px] px-2 py-1.5 rounded ${obj.item.color?.replace('bg-', 'bg-').replace('-500', '-500/20').replace('text-white', '')} text-${obj.item.color?.split('-')[1]}-400 border border-${obj.item.color?.split('-')[1]}-500/20`}><RefreshCw className="w-3 h-3 inline mr-1 mb-0.5"/>{obj.item.name}</div>
                    if (obj.type === 'transaction') {
                      const isIncome = obj.item.type === 'income';
                      return (
                        <div key={idx} className={`text-[10px] px-2 py-1.5 rounded ${isIncome ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800/80 text-zinc-300 border-zinc-700'} border`}>
                          <ArrowRightLeft className="w-3 h-3 inline mr-1 mb-0.5"/>
                          <span className="font-medium">{obj.item.description}</span>
                          <span className="block mt-1 opacity-70">{formatCurrency(Math.abs(obj.item.amount), obj.item.currency || displayCurrency)}</span>
                        </div>
                      )
                    }
                    if (obj.type === 'goal') return <div key={idx} className="text-[10px] px-2 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"><Target className="w-3 h-3 inline mr-1 mb-0.5"/>{obj.item.name}</div>
                    return null;
                  })}
                  {items.length === 0 && <div className="text-[10px] text-zinc-600 text-center mt-4">No activity</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Calendar</h1>
          <p className="text-zinc-500 text-sm mt-1">Track transactions, bills, and goals over time.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button onClick={() => { setViewMode("week"); setSelectedDate(null); }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "week" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Week</button>
            <button onClick={() => { setViewMode("month"); setSelectedDate(null); }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "month" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Month</button>
            <button onClick={() => { setViewMode("year"); setSelectedDate(null); }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "year" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Year</button>
            <button onClick={() => { setViewMode("decade"); setSelectedDate(null); }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "decade" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Decade</button>
          </div>

          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button onClick={navigatePrev} className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm font-medium text-zinc-200 min-w-[140px] text-center">{getNavTitle()}</span>
            <button onClick={navigateNext} className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {viewMode === "decade" && renderDecadeView()}
        {viewMode === "year" && renderYearView()}
        {viewMode === "month" && renderMonthView()}
        {viewMode === "week" && renderWeekView()}

        {selectedDate !== null && (viewMode === "month" || viewMode === "week") && (
          <div className="w-full lg:w-80 shrink-0 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm self-start sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-zinc-100">{new Date(selectedDate + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
              <button onClick={() => setSelectedDate(null)} className="text-zinc-500 hover:text-zinc-300 text-sm">Close</button>
            </div>
            
            {/* Detailed Totals at top of Side Panel */}
            <div className="mb-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Daily Summary</h4>
              {renderTotals(calendarData.days[selectedDate]?.totals || { income: 0, expense: 0, profit: 0, multiIncome: {}, multiExpense: {}, multiProfit: {} }, "large")}
            </div>

            <div className="space-y-6">
              {calendarData.days[selectedDate]?.items.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">No activity on this date.</p>
              ) : (
                <>
                  {calendarData.days[selectedDate]?.items.filter((o: any) => o.type === 'subscription').length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Subscriptions Due</h4>
                      <div className="space-y-2">
                        {calendarData.days[selectedDate].items.filter((o: any) => o.type === 'subscription').map((obj: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${obj.item.color || 'bg-indigo-500'}`}><RefreshCw className="w-4 h-4 text-white" /></div>
                              <span className="text-sm font-medium text-zinc-200">{obj.item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-rose-400">{formatCurrency(obj.item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {calendarData.days[selectedDate]?.items.filter((o: any) => o.type === 'goal').length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Goal Deadlines</h4>
                      <div className="space-y-2">
                        {calendarData.days[selectedDate].items.filter((o: any) => o.type === 'goal').map((obj: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${obj.item.color || 'bg-amber-500'}`}><Target className="w-4 h-4 text-white" /></div>
                              <div>
                                <span className="block text-sm font-medium text-zinc-200">{obj.item.name}</span>
                                <span className="text-xs text-zinc-500">{formatCurrency(obj.item.current)} / {formatCurrency(obj.item.target)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {calendarData.days[selectedDate]?.items.filter((o: any) => o.type === 'transaction').length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Transactions</h4>
                      <div className="space-y-2">
                        {calendarData.days[selectedDate].items.filter((o: any) => o.type === 'transaction').map((obj: any, i: number) => {
                          const isIncome = obj.item.type === 'income';
                          return (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                              <div>
                                <span className="block text-sm font-medium text-zinc-200">{obj.item.description}</span>
                                <span className="text-xs text-zinc-500">{obj.item.category}</span>
                              </div>
                              <span className={`text-sm font-semibold ${isIncome ? 'text-emerald-400' : 'text-zinc-300'}`}>{isIncome ? "+" : "-"}{formatCurrency(Math.abs(obj.item.amount), obj.item.currency || displayCurrency)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {hoverTooltip?.visible && hoverTooltip.content && createPortal(
        <div 
          className="fixed pointer-events-none z-[100] transition-transform duration-75 ease-out"
          style={{ left: hoverTooltip.x + 15, top: hoverTooltip.y + 15 }}
        >
          {hoverTooltip.content}
        </div>,
        document.body
      )}
    </div>
  );
}
