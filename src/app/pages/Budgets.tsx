import { type FormEvent, useMemo, useState } from "react";
import {
  PiggyBank,
  Plus,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  X,
  Trash2,
} from "lucide-react";
import { type BudgetRecord, useFinance } from "../data/financeStore";
import { formatCurrency, STANDARD_COLORS } from "../utils";
import { budgetPacing } from "../analyticsEngine";
import { CustomSelect } from '../components/ui/CustomSelect';
import { ColorSelect } from '../components/ui/ColorSelect';

function BudgetModal({ budget, onClose }: { budget?: BudgetRecord; onClose: () => void }) {
  const { categories, accounts, addBudget, updateBudget, currencies } = useFinance();
  const [targetType, setTargetType] = useState<"category" | "account">(budget?.targetType ?? "category");
  const [categoryId, setCategoryId] = useState(budget?.targetType === "account" ? categories[0]?.id ?? "" : budget?.categoryId ?? categories[0]?.id ?? "");
  const [accountId, setAccountId] = useState(budget?.targetType === "account" ? budget?.categoryId ?? accounts[0]?.id ?? "" : accounts[0]?.id ?? "");
  const [limit, setLimit] = useState(String(budget?.limit ?? 500));
  const [color, setColor] = useState(budget?.color ?? "bg-indigo-500");
  const [currency, setCurrency] = useState((budget as any)?.currency ?? "USD");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetId = targetType === "category" ? categoryId : accountId;
    if (budget) updateBudget(budget.id, { limit: Number(limit), categoryId: targetId, color, currency, targetType });
    else addBudget(targetId, Number(limit), color, currency, targetType);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} aria-label="Close budget modal" />
      <form onSubmit={save} className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-visible">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">{budget ? "Edit Budget" : "Create Budget"}</h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="flex bg-zinc-950/50 p-1 rounded-lg border border-zinc-800/50 mb-4">
              <button
                type="button"
                onClick={() => setTargetType("category")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  targetType === "category" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Category Budget
              </button>
              <button
                type="button"
                onClick={() => setTargetType("account")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  targetType === "account" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Account Budget
              </button>
            </div>
            
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              {targetType === "category" ? "Category" : "Account"}
            </label>
            {targetType === "category" ? (
              <CustomSelect 
                value={categoryId} 
                onChange={(val) => setCategoryId(val)} 
                options={categories.filter((category) => category.type !== "income").map((category) => ({ label: category.name, value: category.id }))} 
              />
            ) : (
              <CustomSelect 
                value={accountId} 
                onChange={(val) => setAccountId(val)} 
                options={accounts.map((account) => ({ label: account.name, value: account.id }))} 
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Monthly Limit</label>
            <input value={limit} onChange={(event) => setLimit(event.target.value)} type="number" min="1" className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Currency</label>
            <CustomSelect 
              value={currency} 
              onChange={(val) => setCurrency(val)} 
              options={currencies.map(c => ({ label: c, value: c }))} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Color Label</label>
            <ColorSelect value={color} onChange={(val) => setColor(val)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-between gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
          <button type="submit" className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg">Save</button>
        </div>
      </form>
    </div>
  );
}

export function Budgets() {
  const { budgets, transactions, deleteBudget, exchangeRates, globalCurrency } = useFinance();
  const [editing, setEditing] = useState<BudgetRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const enrichedBudgets = useMemo(() => {
    return budgets.map((budget) => {
      const bCur = (budget as any).currency || "USD";
      const spent = transactions
        .filter((transaction) => {
          if (transaction.type !== "expense") return false;
          if (!transaction.date.startsWith(budget.month)) return false;
          if (budget.targetType === "account") return transaction.accountId === budget.categoryId;
          return transaction.categoryId === budget.categoryId;
        })
        .reduce((sum, transaction) => {
          const tCur = transaction.currency || "USD";
          const rateToUse = transaction.exchangeRate || exchangeRates[tCur] || 1;
          const amountInUSD = Math.abs(transaction.amount) / rateToUse;
          const targetRate = exchangeRates[bCur] || 1;
          return sum + (amountInUSD * targetRate);
        }, 0);
      return { ...budget, spent };
    });
  }, [budgets, transactions, exchangeRates]);

  const totalBudget = enrichedBudgets.reduce((sum, budget) => {
    const bCur = (budget as any).currency || "USD";
    const amountInUSD = budget.limit / (exchangeRates[bCur] || 1);
    const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
    return sum + (amountInUSD * targetRate);
  }, 0);

  const totalSpent = enrichedBudgets.reduce((sum, budget) => {
    const bCur = (budget as any).currency || "USD";
    const amountInUSD = budget.spent / (exchangeRates[bCur] || 1);
    const targetRate = globalCurrency === "MULTI" ? 1 : (exchangeRates[globalCurrency] || 1);
    return sum + (amountInUSD * targetRate);
  }, 0);

  const overBudget = enrichedBudgets.filter((budget) => budget.spent > budget.limit).length;
  const displayCur = globalCurrency === "MULTI" ? "USD" : globalCurrency;

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 w-full max-w-[2560px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Budgets</h1>
          <p className="text-zinc-500 text-sm mt-1">Track category budgets, overspending alerts, and forecast pressure.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
          <Plus className="w-4 h-4" />
          Create Budget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400"><PiggyBank className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-zinc-400">Total Budget</p><h3 className="text-2xl font-semibold text-zinc-100">{formatCurrency(totalBudget, displayCur)}</h3></div>
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><CheckCircle2 className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-zinc-400">Total Spent</p><h3 className="text-2xl font-semibold text-zinc-100">{formatCurrency(totalSpent, displayCur)}</h3></div>
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400"><AlertTriangle className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-zinc-400">Over Budget</p><h3 className="text-2xl font-semibold text-rose-400">{overBudget} Category</h3></div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-zinc-100 mb-6">Monthly Budgets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 xl:gap-8">
          {enrichedBudgets.map((budget) => {
            const percentage = budget.limit ? (budget.spent / budget.limit) * 100 : 0;
            const isOver = percentage > 100;
            const isNear = percentage >= 85 && percentage <= 100;
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysElapsed = now.getDate();
            const pacing = budgetPacing(budget.spent, budget.limit, daysElapsed, daysInMonth);
            const bCur = (budget as any).currency || "USD";
            const pacingConfig = {
              "under-pace": { label: "Under pace", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
              "on-pace": { label: "On pace", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
              "over-pace": { label: "Over pace", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
            };
            const pacingBadge = pacingConfig[pacing.status];

            return (
              <div key={budget.id} className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-zinc-200">{budget.category}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(budget)} className="text-zinc-500 hover:text-zinc-300" aria-label={`Edit ${budget.category} budget`}>
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                      if (window.confirm("Delete this budget?")) deleteBudget(budget.id);
                    }} className="text-zinc-500 hover:text-rose-400" aria-label={`Delete ${budget.category} budget`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className={`text-2xl font-semibold ${isOver ? "text-rose-400" : "text-zinc-100"}`}>{formatCurrency(budget.spent, bCur)}</span>
                  <span className="text-sm text-zinc-500 mb-1">of {formatCurrency(budget.limit, bCur)}</span>
                </div>
                <div className="h-2.5 w-full bg-zinc-800/80 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${isOver ? "bg-rose-500 shadow-rose-500/50" : budget.color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={isOver ? "text-rose-400 font-medium" : isNear ? "text-amber-400 font-medium" : "text-zinc-400"}>{isOver ? "Over budget!" : isNear ? "Nearing limit" : "On track"}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border whitespace-nowrap ${pacingBadge.color}`}>{pacingBadge.label}</span>
                    </div>
                    <span className="text-zinc-400 font-medium">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-zinc-500 bg-zinc-950/50 px-3 py-2 rounded-lg border border-zinc-800/50">
                    <span>Projected: <strong className="text-zinc-300 font-medium ml-1">{formatCurrency(pacing.projectedMonthEnd, bCur)}</strong></span>
                    {pacing.status === "over-pace" && pacing.projectedOverBy > 0 && (
                      <span className="text-rose-400 font-medium whitespace-nowrap">+{formatCurrency(pacing.projectedOverBy, bCur)} over</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isCreating && <BudgetModal onClose={() => setIsCreating(false)} />}
      {editing && <BudgetModal budget={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
