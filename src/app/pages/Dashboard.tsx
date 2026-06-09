import { useState, useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import { DashboardModern } from "./DashboardModern";

export function Dashboard() {
  const [showGoals, setShowGoals] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Load user preference on mount
  useEffect(() => {
    const savedGoals = localStorage.getItem("flowledger-show-goals");
    if (savedGoals !== null) {
      setShowGoals(savedGoals === "true");
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleGoals = () => {
    const newVal = !showGoals;
    setShowGoals(newVal);
    localStorage.setItem("flowledger-show-goals", newVal.toString());
  };

  return (
    <div className="relative">
      <div className="absolute top-4 right-8 z-50 flex items-center gap-2">
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/60 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden py-1">
              <div className="px-3 py-2 border-b border-zinc-800/50">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dashboard Settings</span>
              </div>
              <button
                onClick={handleToggleGoals}
                className="w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-zinc-200">Show Active Goals</span>
                <div className={`w-8 h-4 rounded-full transition-colors relative ${showGoals ? 'bg-indigo-500' : 'bg-zinc-700'}`}>
                  <div className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200" style={{ transform: showGoals ? 'translateX(16px)' : 'translateX(0)' }}></div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <DashboardModern showGoals={showGoals} />
    </div>
  );
}
