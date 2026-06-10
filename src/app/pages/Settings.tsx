import { type ChangeEvent, type FormEvent, useRef, useState, useEffect } from "react";
import {
  User,
  Bell,
  Lock,
  CreditCard,
  Globe,
  Palette,
  Smartphone,
  Download,
  Upload,
  ChevronRight,
  LayoutDashboard,
  Coins,
} from "lucide-react";
import { downloadTextFile, type AppSettings, useFinance } from "../data/financeStore";
import { CustomSelect } from '../components/ui/CustomSelect';
import { toast } from "sonner";
import { VaultSetupWizard } from "../components/VaultSetupWizard";

const THEMES = [
  { id: "theme-light", name: "Light", bg: "#ffffff", accent: "#6366f1" },
  { id: "theme-dark", name: "Dark", bg: "#09090b", accent: "#6366f1" },
  { id: "theme-midnight", name: "Midnight", bg: "#020617", accent: "#06b6d4" },
  { id: "theme-forest", name: "Forest", bg: "#052e16", accent: "#10b981" },
  { id: "theme-sunset", name: "Sunset", bg: "#2c1a1d", accent: "#f43f5e" },
  { id: "theme-dracula", name: "Dracula", bg: "#282a36", accent: "#bd93f9" },
  { id: "theme-nord", name: "Nord", bg: "#2e3440", accent: "#5e81ac" },
  { id: "theme-cyberpunk", name: "Cyberpunk", bg: "#000000", accent: "#ff003c" },
  { id: "theme-monochrome", name: "Monochrome", bg: "#000000", accent: "#ffffff" },
  { id: "theme-synthwave", name: "Synthwave", bg: "#1a0b2e", accent: "#d600cc" },
  { id: "theme-neon", name: "Neon", bg: "#0a0a0a", accent: "#e1ff00" },
];

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "workspaces", label: "Workspaces", icon: Smartphone },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: Globe },
] as const;

export function Settings() {
  const { settings, updateSettings, exportBackup, restoreBackup, state, resetDemoData, workspaces, activeWorkspaceId, createWorkspace, switchWorkspace, renameWorkspace, deleteWorkspace, updateCustomExchangeRates } = useFinance();
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    (sessionStorage.getItem("settingsTab") as any) || "profile"
  );
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [message, setMessage] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newCurrency, setNewCurrency] = useState("");
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("settingsTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalDraft = { ...draft, name: `${draft.firstName} ${draft.lastName}`.trim() };
    updateSettings(finalDraft);
    setMessage("Settings saved.");
  }

  function backup() {
    const content = exportBackup();
    downloadTextFile(`flowledger-backup-${new Date().toISOString().slice(0, 10)}.json`, content, "application/json");
    setMessage("Backup downloaded.");
  }

  function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = restoreBackup(String(reader.result ?? ""));
      setMessage(ok ? "Backup restored." : "Backup could not be restored.");
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage profile, preferences, backups, and local data.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-zinc-800/80 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"}`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={save} className="flex-1 space-y-6">
          {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>}

          {activeTab === "profile" && (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-zinc-100 mb-6">Profile Information</h2>
              <div className="flex items-center gap-6 mb-8">
                <img src={draft.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop"} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-zinc-800" />
                <div>
                  <div className="flex gap-3">
                    <label className="cursor-pointer px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 rounded-lg transition-colors">
                      Change Avatar
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 800000) {
                              setMessage("Avatar size must be less than 800KB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => setDraft({ ...draft, avatarUrl: String(reader.result) });
                            reader.readAsDataURL(file);
                          }
                        }} 
                      />
                    </label>
                    <button type="button" onClick={() => setDraft({ ...draft, avatarUrl: "" })} className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800/50 text-sm font-medium text-zinc-400 rounded-lg transition-colors">Remove</button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">JPG, GIF or PNG. Max size of 800K</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div><label className="block text-sm font-medium text-zinc-400 mb-2">First Name</label><input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-200" /></div>
                <div><label className="block text-sm font-medium text-zinc-400 mb-2">Last Name</label><input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-200" /></div>
              </div>
              <div className="flex justify-end"><button className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all">Save Changes</button></div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <h2 className="text-lg font-semibold text-zinc-100">Preferences & Backups</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Currency</label>
                  <CustomSelect 
                    value={draft.currency} 
                    onChange={(val) => setDraft({ ...draft, currency: val })} 
                    options={[
                      ...(draft.customCurrencies || ["USD", "EUR", "GBP", "BDT", "ETH"]).map(c => ({ label: c, value: c })),
                      {label: "Multi-Currency View (USD Base)", value: "MULTI"}
                    ]} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Date Format</label>
                  <CustomSelect 
                    value={draft.dateFormat} 
                    onChange={(val) => setDraft({ ...draft, dateFormat: val as AppSettings["dateFormat"] })} 
                    options={[
                      {label: "MMM d, yyyy", value: "MMM d, yyyy"},
                      {label: "yyyy-MM-dd", value: "yyyy-MM-dd"},
                      {label: "MM/dd/yyyy", value: "MM/dd/yyyy"}
                    ]} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Backup Schedule</label>
                  <CustomSelect 
                    value={draft.backupSchedule} 
                    onChange={(val) => setDraft({ ...draft, backupSchedule: val as AppSettings["backupSchedule"] })} 
                    options={[
                      {label: "Off", value: "Off"},
                      {label: "Daily", value: "Daily"},
                      {label: "Weekly", value: "Weekly"},
                      {label: "Monthly", value: "Monthly"}
                    ]} 
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <input ref={restoreInputRef} type="file" accept="application/json,.json" className="hidden" onChange={restore} />
                <button type="button" onClick={backup} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 rounded-lg"><Download className="w-4 h-4" />Manual Backup</button>
                <button type="button" onClick={() => restoreInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-zinc-800 hover:bg-zinc-800/50 text-sm font-medium text-zinc-400 rounded-lg"><Upload className="w-4 h-4" />Restore Backup</button>
                <button type="button" onClick={() => {
                  if (window.confirm("Reset demo data? This replaces current local data.")) resetDemoData();
                }} className="px-4 py-2 border border-rose-500/30 text-sm font-medium text-rose-400 rounded-lg hover:bg-rose-500/10">Reset Demo Data</button>
              </div>

              <div className="border-t border-zinc-850 pt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300">Custom Currencies</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Add any fiat code (CAD, INR) or token. ETH and standard rates are live updated.</p>
                </div>
                <div className="flex gap-2 max-w-sm">
                  <input 
                    type="text" 
                    placeholder="e.g. CAD, INR, JPY" 
                    value={newCurrency} 
                    onChange={e => setNewCurrency(e.target.value.toUpperCase())} 
                    maxLength={4}
                    className="bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-200 uppercase w-36 focus:border-indigo-500 focus:outline-none" 
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      const code = newCurrency.trim().toUpperCase();
                      if (code.length >= 3 && code.length <= 4) {
                        const currentList = draft.customCurrencies || ["USD", "EUR", "GBP", "BDT", "ETH"];
                        if (!currentList.includes(code)) {
                          setDraft({
                            ...draft,
                            customCurrencies: [...currentList, code]
                          });
                        }
                        setNewCurrency("");
                      }
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 rounded-lg transition-colors border border-zinc-700/50"
                  >
                    Add Currency
                  </button>
                </div>
                {draft.customCurrencies && draft.customCurrencies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {draft.customCurrencies.map(c => (
                      <div key={c} className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800/40 border border-zinc-800/80 rounded-xl text-xs text-zinc-300">
                        <span>{c}</span>
                        {!["USD", "EUR", "GBP", "BDT", "ETH"].includes(c) && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setDraft({
                                ...draft,
                                customCurrencies: draft.customCurrencies?.filter(item => item !== c)
                              });
                            }}
                            className="text-zinc-500 hover:text-rose-400 transition-colors ml-1 font-bold text-sm"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-zinc-850 pt-4"><button className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg">Save Preferences</button></div>
            </div>
          )}

          {activeTab === "workspaces" && (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Vaults</h2>
                <p className="text-sm text-zinc-500 mt-1">Manage isolated databases. Creating a new vault starts a completely clean financial environment.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                <input 
                  type="text" 
                  value={newWorkspaceName} 
                  onChange={e => setNewWorkspaceName(e.target.value)} 
                  placeholder="New vault name..." 
                  className="flex-1 w-full bg-transparent border-none focus:outline-none text-sm text-zinc-200 px-2"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    type="button" 
                    onClick={() => {
                      if (newWorkspaceName.trim()) {
                        setShowSetupWizard(true);
                      }
                    }} 
                    disabled={!newWorkspaceName.trim()}
                    className="flex-1 sm:flex-none px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showSetupWizard && (
                <VaultSetupWizard
                  vaultName={newWorkspaceName.trim()}
                  onClose={() => setShowSetupWizard(false)}
                  onConfirm={(templateId, withDemoData) => {
                    createWorkspace(newWorkspaceName.trim(), templateId, withDemoData);
                    setShowSetupWizard(false);
                    setNewWorkspaceName("");
                  }}
                />
              )}

              <div className="space-y-3 mt-4">
                {workspaces.map(ws => (
                  <div key={ws.id} className={`flex items-center justify-between p-4 rounded-xl border ${activeWorkspaceId === ws.id ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-zinc-800/60 bg-zinc-800/20'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeWorkspaceId === ws.id ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Palette className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{ws.name}</p>
                        <p className="text-xs text-zinc-500">{activeWorkspaceId === ws.id ? `${state.transactions.length} active transactions` : "Inactive database"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {activeWorkspaceId === ws.id ? (
                        <span className="text-xs font-medium text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-full">Active</span>
                      ) : (
                        <button type="button" onClick={() => switchWorkspace(ws.id)} className="text-sm font-medium text-zinc-300 hover:text-white px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                          Switch
                        </button>
                      )}
                      <button 
                        type="button" 
                        onClick={() => {
                          const newName = window.prompt("Rename workspace:", ws.name);
                          if (newName && newName.trim()) renameWorkspace(ws.id, newName.trim());
                        }} 
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        Rename
                      </button>
                      {workspaces.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => {
                            if (window.confirm(`Delete workspace "${ws.name}" permanently? All data inside will be destroyed.`)) {
                              deleteWorkspace(ws.id);
                            }
                          }} 
                          className="text-xs text-rose-500 hover:text-rose-400 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "themes" && (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Color Themes</h2>
                <p className="text-sm text-zinc-500 mt-1">Select a color theme to apply across the app.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setDraft({ ...draft, theme: t.id });
                      document.documentElement.className = t.id;
                      if (t.id !== "theme-light") {
                        document.documentElement.classList.add("dark");
                      }
                    }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all group focus:outline-none ${draft.theme === t.id ? 'border-indigo-500 shadow-md shadow-indigo-500/20' : 'border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <div className="aspect-[4/3] w-full flex flex-col items-center justify-center gap-2" style={{ backgroundColor: t.bg }}>
                      <div className="w-10 h-10 rounded-full shadow-lg" style={{ backgroundColor: t.accent }}></div>
                      <p className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/30 text-white/90 backdrop-blur-sm">{t.name}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-4"><button className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all">Save Changes</button></div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Notifications</h2>
                <p className="text-sm text-zinc-500 mt-1">Manage what alerts and updates you receive.</p>
              </div>
              
              <div className="space-y-4">
                {[
                  { title: "Budget Alerts", desc: "Get notified when you exceed 80% of a budget limit.", key: "budgetAlerts" },
                  { title: "Weekly Report", desc: "Receive a summary of your weekly cash flow.", key: "weeklyReport" },
                  { title: "Bill Reminders", desc: "Alerts for upcoming subscription payments.", key: "billReminders" },
                  { title: "Unusual Activity", desc: "Warnings for abnormally large transactions.", key: "unusualActivity" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/60 bg-zinc-800/20">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings[item.key as keyof AppSettings] as boolean ?? false} 
                        onChange={(e) => updateSettings({ [item.key]: e.target.checked })} 
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
