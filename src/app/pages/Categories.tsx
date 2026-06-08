import { type FormEvent, useMemo, useState } from "react";
import {
  Plus,
  MoreVertical,
  User,
  Zap,
  Briefcase,
  TrendingUp,
  Landmark,
  PiggyBank,
  Receipt,
  ShoppingCart,
  Plane,
  Monitor,
  Tags,
  X,
} from "lucide-react";
import { Link } from "react-router";
import { type CategoryRecord, useFinance } from "../data/financeStore";
import { formatCurrency, STANDARD_COLORS } from "../utils";
import { CustomSelect } from '../components/ui/CustomSelect';
import { ColorSelect } from '../components/ui/ColorSelect';

const iconMap = {
  User,
  Zap,
  Briefcase,
  TrendingUp,
  Landmark,
  PiggyBank,
  Receipt,
  ShoppingCart,
  Plane,
  Monitor,
  Tags,
};

function CategoryModal({ category, onClose }: { category?: CategoryRecord; onClose: () => void }) {
  const { categories, addCategory, updateCategory, archiveCategory, mergeCategories } = useFinance();
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<CategoryRecord["type"]>(category?.type ?? "expense");
  const [color, setColor] = useState(category?.color ?? "bg-emerald-500/20 text-emerald-400");
  const [mergeTarget, setMergeTarget] = useState(categories.find((item) => item.id !== category?.id)?.id ?? "");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    if (category) updateCategory(category.id, { name, type, color });
    else addCategory(name, type, color);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} aria-label="Close category modal" />
      <form onSubmit={save} className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-visible">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">{category ? "Edit Category" : "New Category"}</h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type</label>
            <CustomSelect 
              value={type} 
              onChange={(val) => setType(val as CategoryRecord["type"])} 
              options={[
                {label: "Expense", value: "expense"},
                {label: "Income", value: "income"},
                {label: "Both", value: "both"}
              ]} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Color</label>
            <ColorSelect value={color} onChange={(val) => setColor(val)} />
          </div>
          {category && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
              <p className="text-sm font-medium text-zinc-300">Merge category</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomSelect 
                    value={mergeTarget} 
                    onChange={(val) => setMergeTarget(val)} 
                    options={categories.filter((item) => item.id !== category.id).map((item) => ({ label: item.name, value: item.id }))} 
                  />
                </div>
                <button type="button" onClick={() => {
                  mergeCategories(category.id, mergeTarget);
                  onClose();
                }} className="px-3 py-2 rounded-lg border border-zinc-800 text-sm text-zinc-300 hover:bg-zinc-800/60">Merge</button>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-between gap-3 rounded-b-2xl">
          {category ? (
            <button type="button" onClick={() => {
              if (window.confirm("Archive this category? Existing transactions remain visible.")) {
                archiveCategory(category.id);
                onClose();
              }
            }} className="px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg">Archive</button>
          ) : <span />}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg">Save</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function Categories() {
  const { categories, transactions } = useFinance();
  const [editing, setEditing] = useState<CategoryRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const stats = useMemo(() => {
    return Object.fromEntries(categories.map((category) => {
      const matching = transactions.filter((transaction) => transaction.categoryId === category.id);
      const income = matching.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
      const expense = matching.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
      return [category.id, { income, expense, profit: income - expense }];
    }));
  }, [categories, transactions]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Categories</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage, merge, and monitor income and expense categories.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon as keyof typeof iconMap] ?? Tags;
          const categoryStats = stats[cat.id] ?? { income: 0, expense: 0, profit: 0 };

          return (
            <Link key={cat.id} to={`/categories/${cat.id}`} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 hover:bg-zinc-800/50 transition-all block group backdrop-blur-sm">
              <div className="flex items-start justify-between mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <button className="text-zinc-500 hover:text-zinc-300 p-1" onClick={(event) => {
                  event.preventDefault();
                  setEditing(cat);
                }} aria-label={`Edit ${cat.name}`}>
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-zinc-100 font-medium text-lg mb-4">{cat.name}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Income</span>
                  <span className="text-emerald-400 font-medium">{formatCurrency(categoryStats.income)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Expense</span>
                  <span className="text-rose-400 font-medium">{formatCurrency(categoryStats.expense)}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between text-sm font-medium">
                  <span className="text-zinc-400">Net</span>
                  <span className={categoryStats.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {categoryStats.profit >= 0 ? "+" : "-"}{formatCurrency(Math.abs(categoryStats.profit))}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {isCreating && <CategoryModal onClose={() => setIsCreating(false)} />}
      {editing && <CategoryModal category={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
