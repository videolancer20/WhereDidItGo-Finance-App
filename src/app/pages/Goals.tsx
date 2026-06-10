import { type FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import {
  Target,
  Plus,
  MoreHorizontal,
  Home,
  Plane,
  X,
  Trash2,
  Laptop,
  History,
  Pencil,
} from "lucide-react";
import { type GoalRecord, type GoalContribution, useFinance } from "../data/financeStore";
import { formatCurrency } from "../utils";
import { projectGoalCompletion } from "../analyticsEngine";
import { CustomSelect } from '../components/ui/CustomSelect';
import { ColorSelect } from '../components/ui/ColorSelect';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';

const goalIcons = { Target, Home, Plane, Laptop };

function GoalModal({ goal, onClose }: { goal?: GoalRecord; onClose: () => void }) {
  const { addGoal, updateGoal, currencies } = useFinance();
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
            options={currencies.map(c => ({ label: c, value: c }))} 
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
  const { goals, updateGoal, deleteGoal, goalContributions, addGoalContribution, updateGoalContribution, deleteGoalContribution, accounts } = useFinance();
  const [editing, setEditing] = useState<GoalRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [addingToGoal, setAddingToGoal] = useState<GoalRecord | null>(null);
  const [editingContribution, setEditingContribution] = useState<GoalContribution | null>(null);
  const [viewingHistoryFor, setViewingHistoryFor] = useState<GoalRecord | null>(null);

  const handleSaveContribution = (amount: number, date: string, accountId: string, notes: string) => {
    if (editingContribution) {
      updateGoalContribution(editingContribution.id, { amount, date, accountId, notes });
      setEditingContribution(null);
    } else if (addingToGoal) {
      addGoalContribution(addingToGoal.id, amount, date, accountId, notes);
      setAddingToGoal(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 w-full max-w-[2560px] mx-auto space-y-8">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 xl:gap-8">
        {goals.map((goal) => {
          const percentage = goal.target ? (goal.current / goal.target) * 100 : 0;
          const Icon = goalIcons[goal.icon as keyof typeof goalIcons] ?? Target;
          const projection = projectGoalCompletion(
            goal.current,
            goal.target,
            (goalContributions || []).filter(c => c.goalId === goal.id),
            goal.due
          );
          const statusConfig = {
            "on-track": { label: "On Track", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            "behind": { label: "Behind", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
            "ahead": { label: "Ahead", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            "achieved": { label: "Achieved", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          };
          const badge = statusConfig[projection.status];
          const goalCur = (goal as any).currency || "USD";
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
                    <p className="text-sm text-zinc-500">{goal.type.replace("-", " ")} • Target: {formatCurrency(goal.target, goalCur)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAddingToGoal(goal)} className="text-zinc-500 hover:text-emerald-400 text-xs px-2 rounded-lg bg-zinc-800/30 border border-zinc-700">Add Funds</button>
                  <button onClick={() => setViewingHistoryFor(goal)} className="text-zinc-500 hover:text-indigo-400" aria-label={`History ${goal.name}`}>
                    <History className="w-5 h-5" />
                  </button>
                  <button onClick={() => setEditing(goal)} className="text-zinc-500 hover:text-zinc-300" aria-label={`Edit ${goal.name}`}>
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <button onClick={() => {
                    if (window.confirm("Delete this goal?")) deleteGoal(goal.id);
                  }} className="text-zinc-500 hover:text-rose-400" aria-label={`Delete ${goal.name}`}>
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <div><span className="text-2xl font-bold text-zinc-100">{formatCurrency(goal.current, goalCur)}</span><span className="text-sm text-zinc-500 ml-2">progress</span></div>
                  <span className="text-sm font-medium text-zinc-300">{percentage.toFixed(0)}%</span>
                </div>
                <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-out ${percentage >= 100 ? "bg-emerald-500" : goal.color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs pt-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${badge.color}`}>{badge.label}</span>
                    {projection.status !== "achieved" && (
                      <span className="text-zinc-500">
                        {formatCurrency(projection.requiredMonthlyRate, goalCur)}/mo needed • {formatCurrency(projection.actualMonthlyRate, goalCur)}/mo actual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500">
                    {projection.projectedCompletionDate && (
                      <span>Est. {projection.projectedCompletionDate}</span>
                    )}
                    {projection.status === "behind" && projection.monthsBehind > 0 && (
                      <span className="text-rose-400 font-medium">
                        {formatCurrency(projection.requiredMonthlyRate - projection.actualMonthlyRate, goalCur)}/mo deficit
                      </span>
                    )}
                    <span>Due: {goal.due}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isCreating && <GoalModal onClose={() => setIsCreating(false)} />}
      {editing && <GoalModal goal={editing} onClose={() => setEditing(null)} />}
      
      {(addingToGoal || editingContribution) && (
        <ContributionModal 
          contribution={editingContribution}
          goalName={addingToGoal?.name || (goals.find(g => g.id === editingContribution?.goalId)?.name ?? "Goal")}
          accounts={accounts}
          onClose={() => { setAddingToGoal(null); setEditingContribution(null); }}
          onSubmit={handleSaveContribution}
        />
      )}

      {viewingHistoryFor && (
        <ContributionHistoryModal 
          goal={viewingHistoryFor}
          contributions={goalContributions.filter(c => c.goalId === viewingHistoryFor.id)}
          accounts={accounts}
          onClose={() => setViewingHistoryFor(null)}
          onEdit={(c) => { setViewingHistoryFor(null); setEditingContribution(c); }}
          onDelete={deleteGoalContribution}
        />
      )}
    </div>
  );
}

function ContributionModal({ contribution, goalName, accounts, onClose, onSubmit }: { contribution: GoalContribution | null, goalName: string, accounts: any[], onClose: () => void, onSubmit: (amount: number, date: string, accountId: string, notes: string) => void }) {
  const [amount, setAmount] = useState(contribution?.amount?.toString() || "");
  const [date, setDate] = useState(contribution?.date || new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(contribution?.accountId || accounts[0]?.id || "");
  const [notes, setNotes] = useState(contribution?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    onSubmit(Number(amount), date, accountId, notes);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-6">{contribution ? "Edit Contribution" : `Add to ${goalName}`}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Amount</label>
            <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Funding Account</label>
            <CustomSelect 
              value={accountId} 
              onChange={val => setAccountId(val)} 
              options={[{label: "None (Don't deduct cash)", value: ""}, ...accounts.map(a => ({ label: a.name, value: a.id }))]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
            <CustomDatePicker value={date} onChange={val => setDate(val)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note" className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-zinc-200">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium">Save</button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
}

function ContributionHistoryModal({ goal, contributions, accounts, onClose, onEdit, onDelete }: { goal: GoalRecord, contributions: GoalContribution[], accounts: any[], onClose: () => void, onEdit: (c: GoalContribution) => void, onDelete: (id: string) => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">{goal.name} History</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] pr-2">
          {contributions.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">No contributions yet.</div>
          ) : (
            contributions.sort((a,b) => b.date.localeCompare(a.date)).map(c => {
              const account = accounts.find(a => a.id === c.accountId);
              return (
                <div key={c.id} className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{formatCurrency(c.amount, (goal as any).currency || "USD")}</p>
                    <p className="text-xs text-zinc-500">{new Date(c.date).toLocaleDateString()} {account ? `• from ${account.name}` : ""} {c.notes ? `• ${c.notes}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(c)} className="p-1.5 text-zinc-500 hover:text-indigo-400 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if(window.confirm("Delete this contribution?")) onDelete(c.id); }} className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>, document.body
  );
}
