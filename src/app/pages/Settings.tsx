import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
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
} from "lucide-react";
import { downloadTextFile, type AppSettings, useFinance } from "../data/financeStore";
import { CustomSelect } from '../components/ui/CustomSelect';

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "billing", label: "Billing & Plans", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
  { id: "preferences", label: "Preferences", icon: Globe },
] as const;

export function Settings() {
  const { settings, updateSettings, exportBackup, restoreBackup, state, resetDemoData } = useFinance();
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("profile");
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [message, setMessage] = useState("");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSettings(draft);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
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
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop" alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-zinc-800" />
                <div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setMessage("Avatar upload is queued for the desktop shell.")} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 rounded-lg transition-colors">Change Avatar</button>
                    <button type="button" onClick={() => setMessage("Avatar removed locally.")} className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800/50 text-sm font-medium text-zinc-400 rounded-lg transition-colors">Remove</button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">JPG, GIF or PNG. Max size of 800K</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div><label className="block text-sm font-medium text-zinc-400 mb-2">First Name</label><input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-200" /></div>
                <div><label className="block text-sm font-medium text-zinc-400 mb-2">Last Name</label><input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-200" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label><input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-200" /></div>
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
                    onChange={(val) => setDraft({ ...draft, currency: val as AppSettings["currency"] })} 
                    options={[
                      {label: "USD", value: "USD"},
                      {label: "EUR", value: "EUR"},
                      {label: "GBP", value: "GBP"},
                      {label: "BDT", value: "BDT"},
                      {label: "Multi", value: "MULTI"}
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
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Theme</label>
                  <CustomSelect 
                    value={draft.theme} 
                    onChange={(val) => setDraft({ ...draft, theme: val as AppSettings["theme"] })} 
                    options={[
                      {label: "dark", value: "dark"},
                      {label: "system", value: "system"}
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
              <div className="flex justify-end"><button className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg">Save Preferences</button></div>
            </div>
          )}

          {activeTab !== "profile" && activeTab !== "preferences" && (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/60 bg-zinc-800/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><Palette className="w-5 h-5" /></div>
                    <div><p className="text-sm font-medium text-zinc-200">Local v0 workspace</p><p className="text-xs text-zinc-500">{state.transactions.length} transactions secured in IndexedDB</p></div>
                  </div>
                  <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">Active</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/60 bg-zinc-800/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><Smartphone className="w-5 h-5" /></div>
                    <div><p className="text-sm font-medium text-zinc-200">Remembered device</p><p className="text-xs text-zinc-500">Current browser session</p></div>
                  </div>
                  <button type="button" onClick={() => setMessage("Device session revoked locally.")} className="text-sm text-zinc-500 hover:text-rose-400 transition-colors">Revoke</button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
