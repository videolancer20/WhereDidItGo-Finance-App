import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Wallet,
  PiggyBank,
  FileText,
  PieChart,
  Target,
  Settings,
  X,
  Landmark,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { useFinance } from "../data/financeStore";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { name: "Categories", path: "/categories", icon: Tags },
  { name: "Accounts", path: "/accounts", icon: Wallet },
  { name: "Budgets", path: "/budgets", icon: PiggyBank },
  { name: "Reports", path: "/reports", icon: FileText },
  { name: "Analytics", path: "/analytics", icon: PieChart },
  { name: "Goals", path: "/goals", icon: Target },
  { name: "Loans", path: "/loans", icon: Landmark },
  { name: "Subscriptions", path: "/subscriptions", icon: RefreshCw },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function SidebarContent({ onNavigate, showClose }: { onNavigate?: () => void; showClose?: boolean }) {
  const location = useLocation();
  const { settings, accounts, transactions, accountBalances, exchangeRates } = useFinance();

  const liquidAssets = accounts
    .filter(a => a.type !== 'Credit Card' && !a.name.toLowerCase().includes('loan'))
    .reduce((sum, a) => {
      const bal = accountBalances[a.id] ?? 0;
      return sum + (bal > 0 ? bal / (exchangeRates[a.currency] || 1) : 0);
    }, 0);

  const monthlyData: Record<string, boolean> = {};
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(t => {
    const monthLabel = new Date(t.date).toLocaleDateString(undefined, {month: 'short', year: '2-digit'});
    monthlyData[monthLabel] = true;
    if (t.type === "income") totalIncome += Math.abs(t.amount);
    if (t.type === "expense") totalExpense += Math.abs(t.amount);
  });

  const months = Math.max(1, Object.keys(monthlyData).length);
  const avgBurn = totalExpense / months;
  const runwayMonths = avgBurn > 0 ? liquidAssets / avgBurn : 999;
  
  const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100;
  const totalAssets = liquidAssets; // Re-use liquidAssets for the "in debt" check

  let quote = "Doing okay, don't fuck it up.";
  if (totalAssets < 0) {
    quote = "Bro you're literally in debt, fix your shit!";
  } else if (runwayMonths < 6) {
    quote = "You're gonna die dipshit!";
  } else if (expenseRatio > 80) {
    quote = "You're losing money you dumb fuck!";
  } else if (expenseRatio < 20 && runwayMonths > 60) {
    quote = "You're a cheap fuck, but at least you're loaded.";
  } else if (runwayMonths > 120) {
    quote = "Fucking Scrooge McDuck over here!";
  } else if (expenseRatio < 40 && runwayMonths > 24) {
    quote = "Stacking paper, looking good!";
  } else if (expenseRatio >= 50 && expenseRatio <= 80) {
    quote = "Living paycheck to paycheck like a scrub.";
  }

  let runwayText = "∞";
  if (runwayMonths <= 900) {
    const y = Math.floor(runwayMonths / 12);
    const m = Math.floor(runwayMonths % 12);
    if (y > 0 && m > 0) runwayText = `${y} Year${y > 1 ? 's' : ''} ${m} Month${m > 1 ? 's' : ''}`;
    else if (y > 0) runwayText = `${y} Year${y > 1 ? 's' : ''}`;
    else runwayText = `${m} Month${m !== 1 ? 's' : ''}`;
  }

  const avatarUrl = settings.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop";

  return (
    <>
      <div className="px-6 mb-10 flex items-center gap-3 text-zinc-100 font-semibold text-lg">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <span className="flex-1">FlowLedger</span>
        {showClose && (
          <button
            type="button"
            onClick={onNavigate}
            className="w-9 h-9 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 flex items-center justify-center transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-3 flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Main
        </div>
        {navItems.map((item) => {
          const isActive =
            item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onNavigate}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                isActive
                  ? "bg-zinc-800/80 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
              )}
            >
              <item.icon className={clsx("w-4 h-4", isActive ? "text-indigo-400" : "")} />
              {item.name}
            </Link>
          );
        })}

        <div className="mt-8 px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Preferences
        </div>
        <Link
          to="/settings"
          onClick={onNavigate}
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            location.pathname === "/settings"
              ? "bg-zinc-800/80 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>

      <div className="mt-auto px-6 pt-6">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50 relative group">
          <img
            src={avatarUrl}
            alt="User avatar"
            className="w-10 h-10 rounded-full object-cover border border-zinc-700"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{settings.name || "User"}</p>
            <p className="text-xs text-zinc-500 line-clamp-2 leading-tight" title={quote}>{quote}</p>
          </div>
          
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-zinc-800 text-zinc-200 text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-zinc-700 z-50">
            <p className="font-semibold mb-1 text-zinc-100">Financial Vitals</p>
            <div className="flex justify-between mt-1"><span className="text-zinc-400">Expense Ratio:</span> <span className={expenseRatio > 80 ? "text-rose-400" : "text-emerald-400"}>{expenseRatio.toFixed(1)}%</span></div>
            <div className="flex justify-between mt-1"><span className="text-zinc-400">Runway:</span> <span className={runwayMonths < 6 ? "text-rose-400" : "text-emerald-400"}>{runwayText}</span></div>
            <p className="mt-2 italic text-zinc-400">"{quote}"</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex w-64 h-full border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-xl flex-col pt-6 pb-6 shrink-0">
        <SidebarContent />
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close navigation"
          />
          <aside className="relative z-10 flex w-[min(18rem,85vw)] h-full border-r border-zinc-800 bg-zinc-950 flex-col pt-6 pb-6 shadow-2xl">
            <SidebarContent onNavigate={onClose} showClose />
          </aside>
        </div>
      )}
    </>
  );
}
