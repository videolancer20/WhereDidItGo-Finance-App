import { Search, Calendar, Bell, Plus, Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { AddTransactionModal } from "./AddTransactionModal";
import { CustomSelect } from "./ui/CustomSelect";
import { useFinance } from "../data/financeStore";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { search, settings, updateSettings } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [period, setPeriod] = useState("This Month");
  const [showNotifications, setShowNotifications] = useState(false);
  const results = search(query);
  const periods = ["This Month", "This Quarter", "This Year", "All Time"];

  return (
    <header className="h-16 sm:h-20 border-b border-zinc-800/80 bg-zinc-950/30 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 flex items-center justify-center text-zinc-400 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden md:block w-full max-w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text" 
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search transactions, accounts..." 
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
          />
          {isSearchOpen && query.trim() && (
            <div className="absolute left-0 right-0 top-12 z-50 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
              {results.length ? (
                results.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    to={result.path}
                    onClick={() => {
                      setQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="block px-4 py-3 hover:bg-zinc-800/60 border-b border-zinc-800/50 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-zinc-200">{result.title}</span>
                      <span className="text-[10px] uppercase tracking-wider text-indigo-400">{result.type}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{result.subtitle}</p>
                  </Link>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-zinc-500 text-center">No results found</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => setPeriod((current) => periods[(periods.indexOf(current) + 1) % periods.length])}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 text-sm text-zinc-300 transition-colors"
        >
          <Calendar className="w-4 h-4 text-zinc-500" />
          <span>{period}</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((current) => !current)}
            aria-label="View notifications"
            className="w-10 h-10 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 flex items-center justify-center text-zinc-400 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-12 w-72 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-sm font-medium text-zinc-200">Notifications</p>
              </div>
              {["Marketing budget is over limit", "AWS recurring payment due soon", "Backup schedule is active"].map((item) => (
                <div key={item} className="px-4 py-3 border-b border-zinc-800/50 last:border-b-0">
                  <p className="text-sm text-zinc-300">{item}</p>
                  <p className="text-xs text-zinc-500 mt-1">v0 local alert</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-28">
            <CustomSelect
              value={settings.currency || "USD"}
              onChange={(value) => updateSettings({ currency: value })}
              options={[
                { label: "USD", value: "USD" },
                { label: "EUR", value: "EUR" },
                { label: "GBP", value: "GBP" },
                { label: "BDT", value: "BDT" },
                { label: "Multi", value: "MULTI" },
              ]}
              className="!py-0"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Transaction</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  );
}
