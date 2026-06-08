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

interface AccountModalProps {
  account?: AccountRecord;
  mode: "create" | "edit" | "transfer";
  onClose: () => void;
}

function AccountModal({ account, mode, onClose }: AccountModalProps) {
  const { accounts, addAccount, updateAccount, archiveAccount, addTransfer, accountBalances } = useFinance();
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
                  options={[
                    {label: "USD", value: "USD"},
                    {label: "EUR", value: "EUR"},
                    {label: "GBP", value: "GBP"},
                    {label: "BDT", value: "BDT"}
                  ]} 
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
            <button type="button" onClick={() => {
              if (window.confirm("Archive this account? Existing transactions will stay available.")) {
                archiveAccount(account.id);
                onClose();
              }
            }} className="px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg">
              Archive
            </button>
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

export function Accounts() {
  const { accounts, accountBalances } = useFinance();
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "transfer"; account?: AccountRecord } | null>(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Accounts</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage connected accounts, transfers, and reconciliation.</p>
        </div>
        <button onClick={() => setModal({ mode: "create" })} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
          <Plus className="w-4 h-4" />
          Link Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const chartData = acc.trend.map((val, i) => ({ name: i, value: val }));
          const balance = accountBalances[acc.id] ?? acc.openingBalance;
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
                    {balance < 0 ? "-" : ""}{formatCurrency(Math.abs(balance), acc.currency)}
                  </h2>
                  <span className="flex items-center text-xs font-medium text-emerald-400 mb-1">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    2.4%
                  </span>
                </div>
                <button onClick={() => setModal({ mode: "transfer", account: acc })} className="mt-4 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-800/60">
                  Transfer
                </button>
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

      {modal && <AccountModal mode={modal.mode} account={modal.account} onClose={() => setModal(null)} />}
    </div>
  );
}
