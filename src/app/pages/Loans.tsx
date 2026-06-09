import { useState, useMemo } from "react";
import { Plus, Building2, User as UserIcon, CheckCircle2, Circle, MoreVertical, X } from "lucide-react";
import { useFinance } from "../data/financeStore";
import { formatCurrency, STANDARD_COLORS } from "../utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { CustomSelect } from '../components/ui/CustomSelect';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { ColorSelect } from '../components/ui/ColorSelect';

export function Loans() {
  const { loanEntities, loanTransactions, addLoanEntity, updateLoanEntity, deleteLoanEntity, addLoanTransaction, deleteLoanTransaction, toggleLoanSettled } = useFinance();
  const [activeTab, setActiveTab] = useState<"lent" | "borrowed">("lent");
  const [isEntityModalOpen, setEntityModalOpen] = useState(false);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [repayTxn, setRepayTxn] = useState<any>(null);
  const [showSettled, setShowSettled] = useState<Record<string, boolean>>({});

  const activeEntities = useMemo(() => loanEntities.filter(e => !e.archived), [loanEntities]);

  const { totalLent, totalBorrowed } = useMemo(() => {
    return activeEntities.reduce((acc, entity) => {
      const txns = loanTransactions.filter(t => t.entityId === entity.id);
      const balance = txns.reduce((sum, t) => {
        return t.type === "lent" ? sum + t.amount : sum - t.amount;
      }, 0);
      
      if (balance > 0) acc.totalLent += balance;
      else if (balance < 0) acc.totalBorrowed += Math.abs(balance);
      
      return acc;
    }, { totalLent: 0, totalBorrowed: 0 });
  }, [activeEntities, loanTransactions]);

  const relevantEntities = useMemo(() => {
    return activeEntities.map(entity => {
      const txns = loanTransactions.filter(t => t.entityId === entity.id);
      const balance = txns.reduce((sum, t) => {
        return t.type === "lent" ? sum + t.amount : sum - t.amount;
      }, 0);
      return { ...entity, balance, txns };
    }).filter(e => activeTab === "lent" ? e.balance > 0 : e.balance < 0);
  }, [activeEntities, loanTransactions, activeTab]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Loans</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage lent and borrowed money.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEntityModalOpen(true)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors">
            Add Person/Bank
          </button>
          <button onClick={() => setTransactionModalOpen(true)} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-colors">
            <Plus className="w-4 h-4" />
            New Loan Record
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm font-medium text-zinc-400 mb-1">Total Lent</p>
          <p className="text-3xl font-semibold text-emerald-400">{formatCurrency(totalLent)}</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm font-medium text-zinc-400 mb-1">Total Borrowed</p>
          <p className="text-3xl font-semibold text-rose-400">{formatCurrency(totalBorrowed)}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-800 p-2 flex gap-2">
          <button onClick={() => setActiveTab("lent")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "lent" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Lent (Owed to you)</button>
          <button onClick={() => setActiveTab("borrowed")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "borrowed" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Borrowed (You owe)</button>
        </div>
        <div className="p-6 space-y-6">
          {relevantEntities.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No active {activeTab === "lent" ? "lent" : "borrowed"} loans found.</p>
          ) : (
            relevantEntities.map(entity => (
              <div key={entity.id} className="border border-zinc-800 rounded-xl overflow-hidden">
                <div className="bg-zinc-950/50 p-4 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${entity.color || 'bg-zinc-800 text-zinc-300'}`}>
                      {entity.category === "bank" ? <Building2 className={`w-5 h-5 ${entity.color ? '' : 'text-indigo-400'}`} /> : <UserIcon className={`w-5 h-5 ${entity.color ? '' : 'text-emerald-400'}`} />}
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-200">{entity.name}</h3>
                      <p className="text-xs text-zinc-500">{entity.category === "bank" ? "Bank/Institution" : "Individual"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 mb-0.5">Outstanding Balance</p>
                    <p className={`text-lg font-semibold ${entity.balance > 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatCurrency(Math.abs(entity.balance))}</p>
                  </div>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {entity.txns.filter(t => !t.parentId && !t.settled).map(txn => {
                    const subpayments = entity.txns.filter(t => t.parentId === txn.id);
                    const remainingAmount = txn.amount - subpayments.reduce((sum, s) => sum + s.amount, 0);
                    return (
                      <div key={txn.id} className="divide-y divide-zinc-800/30">
                        <div className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <button onClick={() => toggleLoanSettled(txn.id)} className="text-zinc-500 hover:text-emerald-400 transition-colors" title="Mark as settled">
                              <Circle className="w-5 h-5" />
                            </button>
                            {remainingAmount > 0 && (
                              <button onClick={() => setRepayTxn(txn)} className="text-[10px] font-medium px-2 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-md transition-colors whitespace-nowrap" title="Log a partial repayment">
                                Partial Repay
                              </button>
                            )}
                            <div>
                              <p className="text-sm text-zinc-300">{txn.notes}</p>
                              <p className="text-xs text-zinc-500">{new Date(txn.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-sm font-medium ${txn.type === "lent" ? "text-emerald-400" : "text-rose-400"}`}>{formatCurrency(remainingAmount)}</p>
                              {subpayments.length > 0 && <p className="text-[10px] text-zinc-500">of {formatCurrency(txn.amount)}</p>}
                            </div>
                            <button onClick={() => { if(window.confirm("Delete record?")) deleteLoanTransaction(txn.id); }} className="text-zinc-600 hover:text-rose-400 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {subpayments.length > 0 && (
                          <div className="bg-zinc-950/30 pl-16 pr-4 py-2 space-y-2">
                            {subpayments.map(sub => (
                              <div key={sub.id} className="flex items-center justify-between border-l-2 border-zinc-800 pl-4">
                                <div>
                                  <p className="text-xs text-zinc-400">{sub.notes}</p>
                                  <p className="text-[10px] text-zinc-600">{new Date(sub.date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <p className="text-xs text-zinc-500">{formatCurrency(sub.amount)}</p>
                                  <button onClick={() => { if(window.confirm("Delete partial payment?")) deleteLoanTransaction(sub.id); }} className="text-zinc-600 hover:text-rose-400 transition-colors">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {entity.txns.some(t => t.settled) && (
                    <div className="p-3 bg-zinc-950 flex justify-center">
                      <button 
                        onClick={() => setShowSettled(s => ({...s, [entity.id]: !s[entity.id]}))}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
                      >
                        {showSettled[entity.id] ? "Hide Settled Records" : "Show Settled Records"}
                      </button>
                    </div>
                  )}

                  {showSettled[entity.id] && entity.txns.filter(t => !t.parentId && t.settled).map(txn => {
                    const subpayments = entity.txns.filter(t => t.parentId === txn.id);
                    const remainingAmount = txn.amount - subpayments.reduce((sum, s) => sum + s.amount, 0);
                    return (
                      <div key={txn.id} className="divide-y divide-zinc-800/30 opacity-50 bg-zinc-950">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button onClick={() => toggleLoanSettled(txn.id)} className="text-emerald-500">
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <div>
                              <p className="text-sm text-zinc-400 line-through">{txn.notes}</p>
                              <p className="text-xs text-zinc-600">{new Date(txn.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <p className="text-sm text-zinc-500">{formatCurrency(remainingAmount)}</p>
                        </div>
                        {subpayments.length > 0 && (
                          <div className="bg-zinc-950/30 pl-16 pr-4 py-2 space-y-2">
                            {subpayments.map(sub => (
                              <div key={sub.id} className="flex items-center justify-between border-l-2 border-zinc-800 pl-4">
                                <div>
                                  <p className="text-xs text-zinc-500">{sub.notes}</p>
                                  <p className="text-[10px] text-zinc-600">{new Date(sub.date).toLocaleDateString()}</p>
                                </div>
                                <p className="text-xs text-zinc-600">{formatCurrency(sub.amount)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      
      {isEntityModalOpen && <EntityModal onClose={() => setEntityModalOpen(false)} onSubmit={(name, category, notes, color, currency) => (addLoanEntity as any)(name, category, notes, color, currency)} />}
      {isTransactionModalOpen && <TransactionModal onClose={() => setTransactionModalOpen(false)} entities={activeEntities} onSubmit={(entityId, amount, type, date, notes, accountId, currency) => addLoanTransaction(entityId, amount, type, date, notes, false, undefined, accountId, currency)} />}
      {repayTxn && (
        <RepayModal 
          txn={repayTxn} 
          onClose={() => setRepayTxn(null)} 
          onSubmit={(amount, date, accountId) => {
            const repayType = repayTxn.type === "lent" ? "borrowed" : "lent";
            const notes = `${repayTxn.notes || "Loan"} (Partial Payment) (${new Date(date).toLocaleDateString()})`;
            addLoanTransaction(repayTxn.entityId, amount, repayType, date, notes, true, repayTxn.id, accountId, repayTxn.currency);
            setRepayTxn(null);
          }} 
        />
      )}
    </div>
  );
}

function EntityModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (name: string, category: "bank" | "individual", notes: string, color?: string, currency?: string) => void }) {
  const { currencies } = useFinance();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"bank" | "individual">("individual");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("");
  const [currency, setCurrency] = useState("USD");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name, category, notes, color, currency);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-6">Add Person / Bank</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" placeholder="John Doe, Chase Bank..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
            <CustomSelect 
              value={category} 
              onChange={val => setCategory(val as any)} 
              options={[
                {label: "Individual", value: "individual"},
                {label: "Bank/Institution", value: "bank"}
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Currency</label>
            <CustomSelect 
              value={currency} 
              onChange={val => setCurrency(val)} 
              options={currencies.map(c => ({ label: c, value: c }))} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 resize-none" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Color Label</label>
            <ColorSelect value={color} onChange={val => setColor(val)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-zinc-200">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium">Save Entity</button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
}

function TransactionModal({ onClose, entities, onSubmit }: { onClose: () => void, entities: any[], onSubmit: (entityId: string, amount: number, type: "lent" | "borrowed", date: string, notes: string, accountId: string, currency: string) => void }) {
  const { accounts, currencies } = useFinance();
  const [entityId, setEntityId] = useState(entities[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"lent" | "borrowed">("lent");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [currency, setCurrency] = useState("USD");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId || !amount || !accountId) return;
    onSubmit(entityId, Number(amount), type, date, notes, accountId, currency);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-6">New Loan Record</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Person / Bank</label>
            <CustomSelect 
              value={entityId} 
              onChange={val => setEntityId(val)} 
              options={entities.map(e => ({ label: e.name, value: e.id }))}
            />
          </div>
          <div className="flex bg-zinc-950 p-1 rounded-lg">
            <button type="button" onClick={() => setType("lent")} className={`flex-1 py-1.5 text-sm rounded-md ${type === "lent" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}>I lent money</button>
            <button type="button" onClick={() => setType("borrowed")} className={`flex-1 py-1.5 text-sm rounded-md ${type === "borrowed" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}>I borrowed money</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Account (From/To)</label>
            <CustomSelect 
              value={accountId} 
              onChange={val => setAccountId(val)} 
              options={accounts.map(a => ({ label: a.name, value: a.id }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Currency</label>
            <CustomSelect 
              value={currency} 
              onChange={val => setCurrency(val)} 
              options={currencies.map(c => ({ label: c, value: c }))} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Amount</label>
            <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
            <CustomDatePicker value={date} onChange={val => setDate(val)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Notes / Description</label>
            <input type="text" required value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-zinc-200">Cancel</button>
            <button type="submit" disabled={!entityId} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg font-medium">Save Record</button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
}

function RepayModal({ txn, onClose, onSubmit }: { txn: any, onClose: () => void, onSubmit: (amount: number, date: string, accountId: string) => void }) {
  const { accounts } = useFinance();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !accountId) return;
    onSubmit(Number(amount), date, accountId);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Partial Repayment</h2>
        <p className="text-sm text-zinc-400 mb-6">Log a repayment for a specific amount. This will adjust the outstanding balance.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Repayment Amount</label>
            <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} max={txn.amount} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Account (Deposit To/Draw From)</label>
            <CustomSelect 
              value={accountId} 
              onChange={val => setAccountId(val)} 
              options={accounts.map(a => ({ label: a.name, value: a.id }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
            <CustomDatePicker value={date} onChange={val => setDate(val)} />
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
