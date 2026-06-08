import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Search,
  Filter,
  Download,
  Upload,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Trash2,
  X,
} from "lucide-react";
import {
  exportTransactionsCsv,
  type FinanceAttachment,
  type FinanceTransaction,
  useFinance,
} from "../data/financeStore";
import { formatCurrency } from "../utils";

const pageSize = 8;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim().replace(/^"|"$/g, ""));
  return values;
}

import { TimeFilter } from "../components/TimeFilter";
import { TransactionDetailModal } from "../components/TransactionDetailModal";
import { CustomSelect } from '../components/ui/CustomSelect';

export function Transactions() {
  const {
    transactions,
    categories,
    accounts,
    addTransaction,
    bulkDeleteTransactions,
    bulkUpdateTransactions,
  } = useFinance();
  const [searchParams, setSearchParams] = useSearchParams();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<"date" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);

  useEffect(() => {
    const focusedId = searchParams.get("focus");
    if (!focusedId) return;
    const transaction = transactions.find((item) => item.id === focusedId);
    if (transaction) setEditing(transaction);
  }, [searchParams, transactions]);

  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        const matchesQuery =
          !normalizedQuery ||
          [transaction.description, transaction.category, transaction.account, transaction.notes, ...transaction.tags]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesCategory = categoryFilter === "all" || transaction.categoryId === categoryFilter;
        const matchesAccount = accountFilter === "all" || transaction.accountId === accountFilter;
        const matchesType = typeFilter === "all" || transaction.type === typeFilter;
        const withinDate = transaction.date >= dateRange.start && transaction.date <= dateRange.end;

        return matchesQuery && matchesCategory && matchesAccount && matchesType && withinDate;
      })
      .sort((a, b) => {
        const direction = sortDirection === "asc" ? 1 : -1;
        if (sortKey === "amount") return (Math.abs(a.amount) - Math.abs(b.amount)) * direction;
        return a.date.localeCompare(b.date) * direction;
      });
  }, [accountFilter, categoryFilter, query, sortDirection, sortKey, transactions, typeFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(visibleTransactions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedTransactions = visibleTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key: "date" | "amount") {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = text.split(/\r?\n/).filter(Boolean);
      const [headerLine, ...dataRows] = rows;
      const headers = parseCsvLine(headerLine).map((item) => item.toLowerCase());

      for (const row of dataRows) {
        const values = parseCsvLine(row);
        const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
        const category = categories.find((item) => item.name.toLowerCase() === String(record.category).toLowerCase()) ?? categories[0];
        const account = accounts.find((item) => item.name.toLowerCase() === String(record.account).toLowerCase()) ?? accounts[0];
        const amount = Number(record.amount ?? 0);

        addTransaction({
          date: String(record.date || new Date().toISOString().slice(0, 10)),
          description: String(record.description || "Imported transaction"),
          categoryId: category.id,
          accountId: account.id,
          amount: Math.abs(amount),
          type: amount >= 0 ? "income" : "expense",
          notes: String(record.notes || ""),
          tags: String(record.tags || "").split("|").filter(Boolean),
        });
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Transactions</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage, search, edit, import, and export financial activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <TimeFilter onChange={setDateRange} compact />
          <input ref={importInputRef} type="file" accept=".csv" className="hidden" onChange={importCsv} />
          <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors">
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button onClick={() => exportTransactionsCsv(visibleTransactions)} className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl flex flex-col backdrop-blur-sm">
        <div className="p-4 border-b border-zinc-800/60 flex flex-wrap items-center gap-4 bg-zinc-900/50 rounded-t-2xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search description, category, account, notes, tags..."
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowFilters((current) => !current)} className="flex items-center gap-2 px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
            <div className="w-48">
              <CustomSelect 
                value={categoryFilter} 
                onChange={setCategoryFilter} 
                options={[{label: "All Categories", value: "all"}, ...categories.map(c => ({ label: c.name, value: c.id }))]} 
                className="!py-0"
              />
            </div>
            <div className="w-48">
              <CustomSelect 
                value={accountFilter} 
                onChange={setAccountFilter} 
                options={[{label: "All Accounts", value: "all"}, ...accounts.map(a => ({ label: a.name, value: a.id }))]} 
                className="!py-0"
              />
            </div>
          </div>
          {showFilters && (
            <div className="w-full flex flex-wrap items-center gap-3 pt-2">
              <div className="w-48">
                <CustomSelect 
                  value={typeFilter} 
                  onChange={setTypeFilter} 
                  options={[
                    {label: "All Types", value: "all"},
                    {label: "Income", value: "income"},
                    {label: "Expense", value: "expense"},
                    {label: "Transfers", value: "transfer"}
                  ]} 
                  className="!py-0"
                />
              </div>
              <button onClick={() => {
                setQuery("");
                setCategoryFilter("all");
                setAccountFilter("all");
                setTypeFilter("all");
              }} className="text-sm text-zinc-500 hover:text-zinc-300">Clear filters</button>
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="px-4 py-3 border-b border-zinc-800/60 bg-indigo-500/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-indigo-300">{selectedIds.length} selected</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => bulkUpdateTransactions(selectedIds, { categoryId: "business-expenses" })} className="px-3 py-1.5 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800/60">Mark business</button>
              <button onClick={() => {
                if (window.confirm("Delete selected transactions?")) {
                  bulkDeleteTransactions(selectedIds);
                  setSelectedIds([]);
                }
              }} className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-sm text-rose-400 hover:bg-rose-500/10">Delete selected</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/30 border-b border-zinc-800/60">
              <tr>
                <th className="px-6 py-4 font-medium">
                  <input
                    type="checkbox"
                    checked={pagedTransactions.length > 0 && pagedTransactions.every((transaction) => selectedIds.includes(transaction.id))}
                    onChange={(event) => setSelectedIds(event.target.checked ? pagedTransactions.map((transaction) => transaction.id) : [])}
                    className="accent-indigo-500"
                    aria-label="Select page transactions"
                  />
                </th>
                <th onClick={() => toggleSort("date")} className="px-6 py-4 font-medium cursor-pointer hover:text-zinc-300">
                  <span className="flex items-center gap-2">Date <ChevronDown className="w-3 h-3" /></span>
                </th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Account</th>
                <th onClick={() => toggleSort("amount")} className="px-6 py-4 font-medium text-right cursor-pointer hover:text-zinc-300">Amount</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {pagedTransactions.map((transaction) => (
                <tr key={transaction.id} className="group hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(transaction.id)}
                      onChange={() => toggleSelection(transaction.id)}
                      className="accent-indigo-500"
                      aria-label={`Select ${transaction.description}`}
                    />
                  </td>
                  <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">{formatDate(transaction.date)}</td>
                  <td className="px-6 py-4 cursor-pointer" onClick={() => {
                    setEditing(transaction);
                    setSearchParams({ focus: transaction.id });
                  }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${transaction.type === "income" ? "bg-emerald-500/10 text-emerald-400" : transaction.type === "transfer" ? "bg-cyan-500/10 text-cyan-400" : "bg-zinc-800 text-zinc-400"}`}>
                        {transaction.type === "income" ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-200">{transaction.description}</p>
                        <p className="text-xs text-zinc-500">{transaction.tags.length ? transaction.tags.join(", ") : transaction.notes || "No notes"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400"><span className="px-2.5 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-xs">{transaction.category}</span></td>
                  <td className="px-6 py-4 text-zinc-400">{transaction.account}</td>
                  <td className={`px-6 py-4 text-right font-medium whitespace-nowrap ${transaction.type === "income" ? "text-emerald-400" : transaction.type === "transfer" ? "text-cyan-400" : "text-zinc-200"}`}>
                    {transaction.type === "income" ? "+" : "-"}{formatCurrency(Math.abs(transaction.amount))}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing(transaction)} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg" aria-label={`Edit ${transaction.description}`}>
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => {
                        if (window.confirm("Delete this transaction?")) bulkDeleteTransactions([transaction.id]);
                      }} className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg" aria-label={`Delete ${transaction.description}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pagedTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">No transactions match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-zinc-500 bg-zinc-900/50 rounded-b-2xl">
          <span>Showing {pagedTransactions.length} of {visibleTransactions.length} entries</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((current) => Math.max(1, current - 1))} className="px-3 py-1 rounded border border-zinc-800 hover:bg-zinc-800/50 text-zinc-400 disabled:opacity-50" disabled={currentPage === 1}>Previous</button>
            <button className="px-3 py-1 rounded border border-indigo-500/50 bg-indigo-500/10 text-indigo-400">{currentPage}</button>
            <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="px-3 py-1 rounded border border-zinc-800 hover:bg-zinc-800/50 text-zinc-400 disabled:opacity-50" disabled={currentPage === totalPages}>Next</button>
          </div>
        </div>
      </div>

      {editing && <TransactionDetailModal transaction={editing} onClose={() => {
        setEditing(null);
        setSearchParams({});
      }} />}
    </div>
  );
}
