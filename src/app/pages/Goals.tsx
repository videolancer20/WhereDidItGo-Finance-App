import { type FormEvent, useState } from "react";
import {
  Target,
  Plus,
  MoreHorizontal,
  Home,
  Plane,
  Laptop,
  X,
} from "lucide-react";
import { type GoalRecord, useFinance } from "../data/financeStore";
import { formatCurrency, STANDARD_COLORS } from "../utils";
import { CustomSelect } from '../components/ui/CustomSelect';
import { ColorSelect } from '../components/ui/ColorSelect';

const goalIcons = { Target, Home, Plane, Laptop };

function GoalModal({ goal, onClose }: { goal?: GoalRecord; onClose: () => void }) {
  const { addGoal, updateGoal } = useFinance();
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(String(goal?.target ?? 10000));
  const [current, setCurrent] = useState(String(goal?.current ?? 0));
  const [type, setType] = useState<GoalRecord["type"]>(goal?.type ?? "savings");
  const [due, setDue] = useState(goal?.due ?? "Dec 2026");
  const [color, setColor] = useState(goal?.color ?? "bg-indigo-500");
  const [currency, setCurrency] = useState((goal as any)?.currency ?? "USD");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      name,
      target: Number(target),
      current: Number(current),
      type,
      due,
      icon: goal?.icon ?? "Target",
      color: color,
      currency,
      achieved: Number(current) >= Number(target),
    };
    if (goal) updateGoal(goal.id, payload as any);
    else (addGoal as any)(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} aria-label="Close goal modal" />
      <form onSubmit={save} className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-visible">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">{goal ? "Edit Goal" : "New Goal"}</h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Goal name" className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200" />
          <div className="grid grid-cols-2 gap-4">
            <input value={target} onChange={(event) => setTarget(event.target.value)} type="number" min="1" placeholder="Target" className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200" />
            <input value={current} onChange={(event) => setCurrent(event.target.value)} type="number" min="0" placeholder="Current" className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200" />
          </div>
          <CustomSelect 
            value={type} 
            onChange={(val) => setType(val as GoalRecord["type"])} 
            options={[
              {label: "Savings Goal", value: "savings"},
              {label: "Revenue Goal", value: "revenue"},
              {label: "Expense Reduction Goal", value: "expense-reduction"}
            ]} 
          />
          <CustomSelect 
            value={currency} 
            onChange={(val) => setCurrency(val)} 
            options={[
              {label: "USD", value: "USD"},
              {label: "EUR", value: "EUR"},
              {label: "GBP", value: "GBP"},
              {label: "BDT", value: "BDT"}
            ]} 
          />
          <input value={due} onChange={(event) => setDue(event.target.value)} placeholder="Target date" className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200" />
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Color Label</label>
            <ColorSelect value={color} onChange={(val) => setColor(val)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
          <button type="submit" className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg">Save</button>
        </div>
      </form>
    </div>
  );
}

export function Goals() {
  const { goals } = useFinance();
  const [editing, setEditing] = useState<GoalRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Financial Goals</h1>
          <p className="text-zinc-500 text-sm mt-1">Set savings, revenue, and expense reduction objectives.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const percentage = goal.target ? (goal.current / goal.target) * 100 : 0;
          const Icon = goalIcons[goal.icon as keyof typeof goalIcons] ?? Target;
          return (
            <div key={goal.id} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group hover:bg-zinc-800/40 transition-colors">
              {(goal.achieved || percentage >= 100) && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-bl-lg">Achieved</div>}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${goal.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100">{goal.name}</h3>
                    <p className="text-sm text-zinc-500">{goal.type.replace("-", " ")} • Target: {formatCurrency(goal.target)}</p>
                  </div>
                </div>
                <button onClick={() => setEditing(goal)} className="text-zinc-500 hover:text-zinc-300" aria-label={`Edit ${goal.name}`}>
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <div><span className="text-2xl font-bold text-zinc-100">{formatCurrency(goal.current)}</span><span className="text-sm text-zinc-500 ml-2">progress</span></div>
                  <span className="text-sm font-medium text-zinc-300">{percentage.toFixed(0)}%</span>
                </div>
                <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-out ${percentage >= 100 ? "bg-emerald-500" : goal.color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 pt-2"><span>Forecast: {percentage > 70 ? "Healthy pace" : "Needs attention"}</span><span>Target Date: {goal.due}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {isCreating && <GoalModal onClose={() => setIsCreating(false)} />}
      {editing && <GoalModal goal={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
