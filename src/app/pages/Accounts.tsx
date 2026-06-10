import { type FormEvent, useState } from "react";
import {
  Building2,
  Smartphone,
  Wallet,
  PiggyBank,
  CreditCard,
  Plus,
  ArrowUpRight,
  MoreHorizontal,
  X,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { type AccountRecord, useFinance } from "../data/financeStore";
import { formatCurrency, STANDARD_COLORS } from "../utils";
import { CustomSelect } from '../components/ui/CustomSelect';
import { ColorSelect } from '../components/ui/ColorSelect';

const iconMap = {
  Building2,
  Smartphone,
  Wallet,
  PiggyBank,
  CreditCard,
};

function getIcon(name: string) {
  return iconMap[name as keyof typeof iconMap] ?? Wallet;
}

export interface AccountModalProps {
  account?: AccountRecord;
  mode: "create" | "edit" | "transfer";
  onClose: () => void;
}

export function AccountModal({ account, mode, onClose }: AccountModalProps) {
  const { accounts, addAccount, updateAccount, archiveAccount, unarchiveAccount, addTransfer, accountBalances, currencies } = useFinance();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState(account?.type ?? "Bank Account");
  const [balance, setBalance] = useState(String(account ? accountBalances[account.id] ?? account.openingBalance : 0));
  const [color, setColor] = useState(account?.color ?? "bg-indigo-500/20 text-indigo-400");
  const [currency, setCurrency] = useState((account as any)?.currency ?? "USD");
  const [toAccountId, setToAccountId] = useState(accounts.find((item) => item.id !== account?.id)?.id ?? "");
  const [amount, setAmount] = useState("");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "transfer" && account) {
      addTransfer(account.id, toAccountId, Number(amount), new Date().toISOString().slice(0, 10), "Manual account transfer");
      onClose();
      return;
    }

    if (mode === "create") {
      const hex = STANDARD_COLORS.find(c => c.full === color)?.value?.split("-")[1] || "indigo";
      (addAccount as any)(name, type, Number(balance), color, "#" + (hex === "emerald" ? "10b981" : hex === "rose" ? "f43f5e" : hex === "blue" ? "3b82f6" : hex === "purple" ? "a855f7" : hex === "amber" ? "f59e0b" : hex === "cyan" ? "06b6d4" : hex === "indigo" ? "6366f1" : "71717a"), currency);
    } else if (account) {
      const currentCalculated = accountBalances[account.id] ?? account.openingBalance;
      const adjustment = Number(balance) - currentCalculated;
      const hex = STANDARD_COLORS.find(c => c.full === color)?.value?.split("-")[1] || "indigo";
      updateAccount(account.id, {
        name,
        type,
        openingBalance: account.openingBalance + adjustment,
        color,
        currency,
        stroke: "#" + (hex === "emerald" ? "10b981" : hex === "rose" ? "f43f5e" : hex === "blue" ? "3b82f6" : hex === "purple" ? "a855f7" : hex === "amber" ? "f59e0b" : hex === "cyan" ? "06b6d4" : hex === "indigo" ? "6366f1" : "71717a"),
      } as any);
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} aria-label="Close account modal" />
      <form onSubmit={save} className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-visible">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">
            {mode === "create" ? "Link Account" : mode === "transfer" ? "Transfer Funds" : "Account Details"}
          </h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mode === "transfer" && account ? (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">From</label>
                <input value={account.name} readOnly className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">To</label>
                <CustomSelect 
                  value={toAccountId} 
                  onChange={(val) => setToAccountId(val)} 
                  options={accounts.filter((item) => item.id !== account?.id).map((item) => ({ label: item.name, value: item.id }))} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Amount</label>
                <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" step="0.01" className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Account Name</label>
                <input value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type</label>
                <CustomSelect 
                  value={type} 
                  onChange={(val) => setType(val)} 
                  options={[
                    {label: "Bank Account", value: "Bank Account"},
                    {label: "Business Bank", value: "Business Bank"},
                    {label: "Personal Bank", value: "Personal Bank"},
                    {label: "Savings Account", value: "Savings Account"},
                    {label: "Credit Card", value: "Credit Card"},
                    {label: "Mobile Banking", value: "Mobile Banking"},
                    {label: "Cash Wallet", value: "Cash Wallet"}
                  ]} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{mode === "create" ? "Opening Balance" : "Reconciled Balance"}</label>
                <input value={balance} onChange={(event) => setBalance(event.target.value)} type="number" step="0.01" className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200" />
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
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-between gap-3 rounded-b-2xl">
          {mode === "edit" && account ? (
            account.archived ? (
              <button type="button" onClick={() => {
                unarchiveAccount(account.id);
                onClose();
              }} className="px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg">
                Unarchive
              </button>
            ) : (
              <button type="button" onClick={() => {
                if (window.confirm("Archive this account? Existing transactions will stay available.")) {
                  archiveAccount(account.id);
                  onClose();
                }
              }} className="px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg">
                Archive
              </button>
            )
          ) : <span />}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg">
              {mode === "transfer" ? "Transfer" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function AccountDetailModal({ account, onClose }: { account: AccountRecord; onClose: () => void }) {
  const { transactions } = useFinance();
  const accountTxns = transactions.filter((t) => t.accountId === account.id || t.transferAccountId === account.id).slice(0, 50);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{account.name} History</h2>
            <p className="text-sm text-zinc-500">Recent transactions for this account.</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          {accountTxns.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No transactions found.</p>
          ) : (
            accountTxns.map((t) => {
              const isOutflow = t.type === "expense" || (t.type === "transfer" && t.accountId === account.id);
              return (
                <div key={t.id} className="flex justify-between items-center p-3 rounded-xl border border-zinc-800/50 hover:bg-zinc-800/20">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{t.description}</p>
                    <p className="text-xs text-zinc-500">{t.date} • {t.category}</p>
                  </div>
                  <p className={`text-sm font-medium ${isOutflow ? "text-zinc-200" : "text-emerald-400"}`}>
                    {isOutflow ? "-" : "+"}{formatCurrency(t.amount)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ReconcileModal({ account, onClose }: { account: AccountRecord; onClose: () => void }) {
  const { transactions, toggleReconciled } = useFinance();
  const [statementBalance, setStatementBalance] = useState("");
  
  // Only get transactions for this account
  const accountTxns = transactions.filter((t) => t.accountId === account.id || t.transferAccountId === account.id);
  
  // Real balance
  const balance = accountTxns.reduce((sum, t) => {
    if (t.accountId === account.id) {
      return sum + (t.type === "income" ? Math.abs(t.amount) : -Math.abs(t.amount));
    }
    if (t.transferAccountId === account.id) {
      return sum + Math.abs(t.amount);
    }
    return sum;
  }, account.openingBalance);

  const unreconciledTxns = accountTxns.filter(t => !t.reconciled);
  const clearedBalance = balance - unreconciledTxns.reduce((sum, t) => {
    if (t.accountId === account.id) {
      return sum + (t.type === "income" ? Math.abs(t.amount) : -Math.abs(t.amount));
    }
    if (t.transferAccountId === account.id) {
      return sum + Math.abs(t.amount);
    }
    return sum;
  }, 0);

  const target = parseFloat(statementBalance) || 0;
  const diff = clearedBalance - target;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Reconcile {account.name}</h2>
            <p className="text-sm text-zinc-500">Match app transactions with your real bank statement.</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-6 shrink-0">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Statement Balance</label>
            <input value={statementBalance} onChange={e => setStatementBalance(e.target.value)} type="number" step="any" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-200" placeholder="0.00" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cleared Balance</label>
            <div className="py-2 text-lg font-semibold text-zinc-100">{formatCurrency(clearedBalance)}</div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Difference</label>
            <div className={`py-2 text-lg font-semibold ${diff === 0 && statementBalance ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(Math.abs(diff))}</div>
          </div>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">Unreconciled Transactions</h3>
          {unreconciledTxns.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">All transactions are reconciled.</p>
          ) : (
            unreconciledTxns.map((t) => {
              const isOutflow = t.type === "expense" || (t.type === "transfer" && t.accountId === account.id);
              return (
                <div key={t.id} onClick={() => toggleReconciled(t.id)} className="flex justify-between items-center p-3 rounded-xl border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 cursor-pointer transition-colors">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{t.description}</p>
                    <p className="text-xs text-zinc-500">{t.date} • {t.category}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`text-sm font-medium ${isOutflow ? "text-zinc-200" : "text-emerald-400"}`}>
                      {isOutflow ? "-" : "+"}{formatCurrency(t.amount)}
                    </p>
                    <div className="w-5 h-5 rounded border border-zinc-600 flex items-center justify-center">
                      {t.reconciled && <div className="w-3 h-3 bg-indigo-500 rounded-sm" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Close</button>
          <button disabled={diff !== 0 || !statementBalance} onClick={onClose} className="px-5 py-2 bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 text-white text-sm font-medium rounded-lg">
            Finish Reconciliation
          </button>
        </div>
      </div>
    </div>
  );
}

export function Accounts() {
  const { accounts, accountBalances, settings, exchangeRates, currencies, allAccounts, unarchiveAccount } = useFinance();
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "transfer" | "detail" | "reconcile"; account?: AccountRecord } | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState(settings.currency || "USD");
  const [showArchived, setShowArchived] = useState(false);

  const archivedAccounts = allAccounts.filter(a => a.archived);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Accounts</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage connected accounts, transfers, and reconciliation.</p>
        </div>
        <div className="flex items-center gap-3 z-20">
          <div className="w-32">
            <CustomSelect value={displayCurrency} onChange={setDisplayCurrency} options={currencies.map(c => ({ label: c, value: c }))} />
          </div>
          {archivedAccounts.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/50 rounded-lg border border-zinc-800">
              {showArchived ? "Hide Archived" : `Archived (${archivedAccounts.length})`}
            </button>
          )}
          <button onClick={() => setModal({ mode: "create" })} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
            <Plus className="w-4 h-4" />
            Link Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(showArchived ? allAccounts : accounts).map((acc) => {
          const chartData = acc.trend.map((val, i) => ({ name: i, value: val }));
          const rawBalance = accountBalances[acc.id] ?? acc.openingBalance;
          const baseRate = exchangeRates[acc.currency || "USD"] || 1;
          const targetRate = displayCurrency === "USD" ? 1 : (exchangeRates[displayCurrency] || 1);
          const convertedBalance = (rawBalance / baseRate) * targetRate;
          const Icon = getIcon(acc.icon);

          return (
            <div key={acc.id} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 hover:bg-zinc-800/40 transition-all group backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-zinc-100 font-medium">{acc.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{acc.type} • {acc.number}</p>
                  </div>
                </div>
                <button onClick={() => setModal({ mode: "edit", account: acc })} className="text-zinc-500 hover:text-zinc-300" aria-label={`Edit ${acc.name}`}>
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <div className="relative z-10">
                <p className="text-sm text-zinc-400 mb-1">Current Balance</p>
                <div className="flex items-end gap-3">
                  <h2 className="text-3xl font-semibold text-zinc-100">
                    {convertedBalance < 0 ? "-" : ""}{formatCurrency(Math.abs(convertedBalance), displayCurrency)}
                  </h2>
                  <span className="flex items-center text-xs font-medium text-emerald-400 mb-1">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    2.4%
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setModal({ mode: "transfer", account: acc })} className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-800/60 transition-colors">
                    Transfer
                  </button>
                  <button onClick={() => setModal({ mode: "detail", account: acc })} className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-800/60 transition-colors">
                    History
                  </button>
                  <button onClick={() => setModal({ mode: "reconcile", account: acc })} className="px-3 py-1.5 rounded-lg border border-indigo-500/30 text-xs text-indigo-400 hover:bg-indigo-500/20 transition-colors">
                    Reconcile
                  </button>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-24 opacity-30 group-hover:opacity-60 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs key="defs">
                      <linearGradient key={`grad-${acc.id}`} id={`grad-${acc.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop key="stop-1" offset="5%" stopColor={acc.stroke} stopOpacity={1}/>
                        <stop key="stop-2" offset="95%" stopColor={acc.stroke} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area key="area" type="monotone" dataKey="value" stroke={acc.stroke} strokeWidth={2} fill={`url(#grad-${acc.id})`} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {modal && modal.mode === "detail" && modal.account ? (
        <AccountDetailModal account={modal.account} onClose={() => setModal(null)} />
      ) : modal && modal.mode === "reconcile" && modal.account ? (
        <ReconcileModal account={modal.account} onClose={() => setModal(null)} />
      ) : modal ? (
        <AccountModal mode={modal.mode as any} account={modal.account} onClose={() => setModal(null)} />
      ) : null}
    </div>
  );
}
