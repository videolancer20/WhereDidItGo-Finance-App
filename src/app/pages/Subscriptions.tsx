import { useState, useMemo } from "react";
import { Plus, Play, Pause, Trash2, Calendar, Edit3, X, SkipForward, SkipBack, ExternalLink } from "lucide-react";
import { useFinance, type Subscription } from "../data/financeStore";
import { formatCurrency, STANDARD_COLORS } from "../utils";
import { createPortal } from "react-dom";
import { CustomSelect } from '../components/ui/CustomSelect';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { ColorSelect } from '../components/ui/ColorSelect';

export function Subscriptions() {
  const { subscriptions, accounts, categories, addSubscription, updateSubscription, deleteSubscription, pauseSubscription, resumeSubscription, paySubscription, skipSubscription, rewindSubscription, exchangeRates, settings } = useFinance();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const activeSubscriptions = useMemo(() => subscriptions.filter(s => s.status === "active"), [subscriptions]);
  const pausedSubscriptions = useMemo(() => subscriptions.filter(s => s.status === "paused"), [subscriptions]);

  const globalCurrency = settings?.currency || "USD";

  const { monthlyTotal, multiMonthlyTotal } = useMemo(() => {
    let monthlyTotal = 0;
    const multiMonthlyTotal: Record<string, number> = {};

    activeSubscriptions.forEach((sub) => {
      let monthly = sub.amount;
      if (sub.frequency === "weekly") monthly *= 4.33;
      if (sub.frequency === "yearly") monthly /= 12;

      const subCur = sub.currency || "USD";
      const rateToUse = exchangeRates[subCur] || 1;
      const amountInUSD = monthly / rateToUse;
      const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
      
      monthlyTotal += amountInUSD * targetRate;

      const targetCur = globalCurrency === "MULTI" ? subCur : globalCurrency;
      multiMonthlyTotal[targetCur] = (multiMonthlyTotal[targetCur] || 0) + (globalCurrency === "MULTI" ? monthly : amountInUSD * targetRate);
    });

    return { monthlyTotal, multiMonthlyTotal };
  }, [activeSubscriptions, exchangeRates, globalCurrency]);

  const annualProjection = monthlyTotal * 12;
  const dailyCost = monthlyTotal / 30.44;

  const categoryConcentration = useMemo(() => {
    const byCat: Record<string, number> = {};
    activeSubscriptions.forEach(sub => {
      const catId = sub.categoryId || 'uncategorized';
      let monthly = sub.amount;
      if (sub.frequency === 'weekly') monthly *= 4.33;
      else if (sub.frequency === 'yearly') monthly /= 12;
      byCat[catId] = (byCat[catId] || 0) + monthly;
    });

    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0 || monthlyTotal === 0) return { topCategory: '', percentage: 0 };

    const topCatId = entries[0][0];
    const topCat = categories.find(c => c.id === topCatId);
    return { topCategory: topCat?.name || topCatId, percentage: (entries[0][1] / monthlyTotal) * 100 };
  }, [activeSubscriptions, monthlyTotal, categories]);

  const renderKPIValue = (singleValue: number, multiValues: Record<string, number>, colorClass: string = "text-zinc-100") => {
    if (globalCurrency === "MULTI") {
      const entries = Object.entries(multiValues);
      if (entries.length === 0) return <p className={`text-3xl font-semibold ${colorClass}`}>{formatCurrency(0, "USD")}</p>;
      return (
        <div className="space-y-1">
          {entries.map(([cur, val]) => (
            <p key={cur} className={`text-2xl font-bold ${colorClass}`}>{formatCurrency(val, cur)}</p>
          ))}
        </div>
      );
    }
    return <p className={`text-3xl font-semibold ${colorClass}`}>{formatCurrency(singleValue, globalCurrency)}</p>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 w-full max-w-[2560px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Subscriptions</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage recurring payments and retainers.</p>
        </div>
        <button onClick={() => { setEditingSub(null); setModalOpen(true); }} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-colors">
          <Plus className="w-4 h-4" />
          Add Subscription
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm font-medium text-zinc-400 mb-1">Monthly Cost</p>
          {renderKPIValue(monthlyTotal, multiMonthlyTotal, "text-rose-400")}
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm font-medium text-zinc-400 mb-1">Annual Cost</p>
          <p className="text-3xl font-semibold text-violet-400">{formatCurrency(annualProjection, globalCurrency === "MULTI" ? "USD" : globalCurrency)}</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm font-medium text-zinc-400 mb-1">Cost Per Day</p>
          <p className="text-3xl font-semibold text-amber-400">{formatCurrency(dailyCost, globalCurrency === "MULTI" ? "USD" : globalCurrency)}</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm font-medium text-zinc-400 mb-1">Top Category</p>
          {categoryConcentration.topCategory ? (
            <>
              <p className="text-2xl font-semibold text-zinc-100 truncate">{categoryConcentration.topCategory}</p>
              <p className="text-xs text-zinc-500 mt-1">{categoryConcentration.percentage.toFixed(0)}% concentration</p>
            </>
          ) : (
            <p className="text-2xl font-semibold text-zinc-500">—</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-100">Active</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 xl:gap-6">
          {activeSubscriptions.map(sub => (
            <SubscriptionCard 
              key={sub.id} 
              sub={sub} 
              onEdit={() => { setEditingSub(sub); setModalOpen(true); }}
              onPause={() => pauseSubscription(sub.id)}
              onDelete={() => { if(window.confirm("Delete subscription?")) deleteSubscription(sub.id); }}
              onPay={() => { if(window.confirm(`Mark ${sub.name} as paid and record transaction?`)) paySubscription(sub.id); }}
              onSkip={() => {
                if (window.confirm("Skip this period? Next due date will advance.")) {
                  skipSubscription(sub.id);
                }
              }}
              onRewind={() => {
                if (window.confirm("Undo last period? Next due date will go back.")) {
                  rewindSubscription(sub.id);
                }
              }}
            />
          ))}
          {activeSubscriptions.length === 0 && <p className="text-zinc-500 col-span-2">No active subscriptions.</p>}
        </div>
      </div>

      {pausedSubscriptions.length > 0 && (
        <div className="space-y-4 mt-8">
          <h2 className="text-lg font-medium text-zinc-100 opacity-70">Paused</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 xl:gap-6">
            {pausedSubscriptions.map(sub => (
              <SubscriptionCard 
                key={sub.id} 
                sub={sub} 
                onEdit={() => { setEditingSub(sub); setModalOpen(true); }}
                onPause={() => resumeSubscription(sub.id)}
                onDelete={() => { if(window.confirm("Delete subscription?")) deleteSubscription(sub.id); }}
                onPay={() => {}}
                onSkip={() => {}}
                isPaused
              />
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <SubscriptionModal 
          onClose={() => setModalOpen(false)} 
          initialData={editingSub} 
          accounts={accounts} 
          categories={categories} 
          onSubmit={(data) => {
            if (editingSub) updateSubscription(editingSub.id, data);
            else addSubscription({ ...data, status: "active" });
            setModalOpen(false);
          }} 
        />
      )}
    </div>
  );
}

function SubscriptionCard({ sub, onEdit, onPause, onDelete, onPay, onSkip, onRewind, isPaused }: any) {
  const { accounts, categories } = useFinance();
  const account = accounts.find(a => a.id === sub.accountId);
  const category = categories.find(c => c.id === sub.categoryId);

  return (
    <div className={`p-5 rounded-2xl border ${isPaused ? 'bg-zinc-950 border-zinc-800/50 opacity-75' : 'bg-zinc-900 border-zinc-800'} flex flex-col gap-4 transition-all hover:border-zinc-700`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sub.color || 'bg-indigo-500'}`}>
            <span className="text-white font-bold">{sub.name.charAt(0)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-100">{sub.name}</h3>
              {sub.websiteUrl && (
                <a href={sub.websiteUrl.startsWith('http') ? sub.websiteUrl : `https://${sub.websiteUrl}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-indigo-400 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-xs text-zinc-500">{category?.name} • {sub.frequency}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-zinc-100">{formatCurrency(sub.amount)}</p>
          <p className="text-xs text-zinc-500 capitalize">{account?.name}</p>
        </div>
      </div>
      
      {!isPaused && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="text-xs font-medium text-zinc-400">Next Due</p>
              <p className="text-sm text-zinc-200">{new Date(sub.nextDueDate).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRewind} className="px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1" title="Undo last period">
              <SkipBack className="w-3.5 h-3.5" /> Rewind
            </button>
            <button onClick={onSkip} className="px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1" title="Skip this period">
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
            <button onClick={onPay} className="px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors">
              Mark Paid
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"><Edit3 className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
        <button onClick={onPause} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
          {isPaused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
        </button>
      </div>
    </div>
  );
}

function SubscriptionModal({ onClose, initialData, accounts, categories, onSubmit }: any) {
  const { currencies } = useFinance();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    amount: initialData?.amount?.toString() || "",
    frequency: initialData?.frequency || "monthly",
    customIntervalDays: initialData?.customIntervalDays || 30,
    categoryId: initialData?.categoryId || categories[0]?.id || "",
    accountId: initialData?.accountId || accounts[0]?.id || "",
    startDate: initialData?.startDate || new Date().toISOString().slice(0, 10),
    notes: initialData?.notes || "",
    color: initialData?.color || "bg-indigo-500",
    websiteUrl: initialData?.websiteUrl || "",
    currency: initialData?.currency || "USD",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, amount: Number(formData.amount) });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-100">{initialData ? 'Edit Subscription' : 'Add Subscription'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          <form id="sub-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Amount</label>
                <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Frequency</label>
                <CustomSelect 
                  value={formData.frequency} 
                  onChange={val => setFormData({...formData, frequency: val})} 
                  options={[
                    {label: "Weekly", value: "weekly"},
                    {label: "Monthly", value: "monthly"},
                    {label: "Yearly", value: "yearly"},
                    {label: "Custom Days", value: "custom"}
                  ]} 
                />
              </div>
            </div>
            {formData.frequency === "custom" && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Interval (Days)</label>
                <input type="number" min="1" value={formData.customIntervalDays} onChange={e => setFormData({...formData, customIntervalDays: parseInt(e.target.value)})} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Start Date</label>
              <CustomDatePicker value={formData.startDate} onChange={val => setFormData({...formData, startDate: val})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                <CustomSelect 
                  value={formData.categoryId} 
                  onChange={val => setFormData({...formData, categoryId: val})} 
                  options={categories.map((c: any) => ({ label: c.name, value: c.id }))} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Default Account</label>
                <CustomSelect 
                  value={formData.accountId} 
                  onChange={val => setFormData({...formData, accountId: val})} 
                  options={accounts.map((a: any) => ({ label: a.name, value: a.id }))} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Currency</label>
                <CustomSelect 
                  value={formData.currency} 
                  onChange={val => setFormData({...formData, currency: val})} 
                  options={currencies.map(c => ({ label: c, value: c }))} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Website Link (Optional)</label>
                <input type="url" value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} placeholder="https://..." className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Color Label</label>
              <ColorSelect value={formData.color} onChange={val => setFormData({...formData, color: val})} />
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm">Cancel</button>
          <button type="submit" form="sub-form" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm shadow-lg shadow-indigo-500/20">Save Subscription</button>
        </div>
      </div>
    </div>, document.body
  );
}
