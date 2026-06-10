import { Search, Calendar, Bell, Plus, Menu, X, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { AddTransactionModal } from "./AddTransactionModal";
import { CustomSelect } from "./ui/CustomSelect";
import { useFinance } from "../data/financeStore";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { search, settings, updateSettings, smartAlerts, dismissAlert } = useFinance();
  const [activeTab, setActiveTab] = useState<"notifications" | "attention">("notifications");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const results = search(query);
  
  const notifications = [
    ...(settings.budgetAlerts ? ["Budget monitoring is active. You will be alerted when approaching limits."] : []),
    ...(settings.weeklyReport ? ["Your next weekly report will be generated on Sunday."] : []),
    ...(settings.billReminders ? ["Bill reminders are active. Check upcoming payments."] : []),
    ...(settings.unusualActivity ? ["Unusual activity monitoring is running."] : []),
    "System backup is configured to " + (settings.backupSchedule || "Off")
  ];

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
        <div className="hidden sm:block">
          {/* Unused Period Filter Removed */}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((current) => !current)}
            aria-label="View notifications"
            className="w-10 h-10 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 flex items-center justify-center text-zinc-400 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {(smartAlerts.length > 0 || notifications.length > 0) && (
              <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${smartAlerts.length > 0 ? "bg-rose-500" : "bg-indigo-500"}`}></span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl flex flex-col max-h-[80vh]">
              <div className="flex border-b border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("notifications")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === "notifications" ? "text-zinc-200 border-b-2 border-indigo-500" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Notifications
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attention")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === "attention" ? "text-zinc-200 border-b-2 border-indigo-500" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Warnings
                  {smartAlerts.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[10px] text-white font-bold">
                      {smartAlerts.length}
                    </span>
                  )}
                </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar flex-1">
                {activeTab === "notifications" ? (
                  <>
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-zinc-500">No notifications</div>
                    ) : (
                      notifications.map((item, idx) => (
                        <div key={idx} className="px-4 py-3 border-b border-zinc-800/50 last:border-b-0">
                          <p className="text-sm text-zinc-300">{item}</p>
                          <p className="text-xs text-zinc-500 mt-1">System status</p>
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <>
                    {smartAlerts.length === 0 ? (
                      <div className="p-6 text-center text-sm text-zinc-500">
                        You're all caught up!
                      </div>
                    ) : (
                      smartAlerts.map(alert => (
                        <div key={alert.id} className="relative px-4 py-3 border-b border-zinc-800/50 last:border-b-0 group">
                          <div className="flex items-start gap-3">
                            <alert.icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                              alert.type === 'danger' ? 'text-rose-400' : 
                              alert.type === 'warning' ? 'text-amber-400' : 
                              alert.type === 'info' ? 'text-blue-400' : 'text-emerald-400'
                            }`} />
                            <div className="flex-1 min-w-0 pr-6">
                              <p className="text-sm text-zinc-300">{alert.message}</p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => dismissAlert(alert.id)}
                            className="absolute right-4 top-3 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 rounded"
                            aria-label="Dismiss alert"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

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

      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  );
}
