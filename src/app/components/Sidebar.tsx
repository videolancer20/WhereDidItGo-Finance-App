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
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop"
            alt="User avatar"
            className="w-10 h-10 rounded-full object-cover border border-zinc-700"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">Alex Jensen</p>
            <p className="text-xs text-zinc-500 truncate">Pro Plan</p>
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
