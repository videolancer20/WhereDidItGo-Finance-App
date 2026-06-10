import { X, Upload, Tag } from "lucide-react";
import { clsx } from "clsx";
import { type ChangeEvent, type FormEvent, useRef, useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { type FinanceTransaction, useFinance } from "../data/financeStore";
import { CustomSelect } from "./ui/CustomSelect";
import { CustomDatePicker } from "./ui/CustomDatePicker";
import { convertCurrency, formatCurrency } from "../utils";
import { CategoryModal } from "../pages/Categories";
import { AccountModal } from "../pages/Accounts";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: FinanceTransaction;
  onSave?: () => void;
}

export function AddTransactionModal({ isOpen, onClose, initialData, onSave }: AddTransactionModalProps) {
  const { addTransaction, updateTransaction, categories, accounts, exchangeRates, currencies, fetchLiveRates } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<"expense" | "income" | "transfer">(initialData?.type || "expense");
  const [amount, setAmount] = useState(initialData ? Math.abs(initialData.amount).toString() : "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [date, setDate] = useState(() => initialData?.date || new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "software");
  const [accountId, setAccountId] = useState(initialData?.accountId || accounts[0]?.id || "");
  const [transferAccountId, setTransferAccountId] = useState(initialData?.transferAccountId || accounts[1]?.id || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [tagText, setTagText] = useState(initialData?.tags?.join(", ") || "");
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; type: string; size: number; addedAt: string }>>(initialData?.attachments || []);
  const [splits, setSplits] = useState<{categoryId: string, amount: number, notes?: string}[]>(initialData?.splits || []);
  const [subModal, setSubModal] = useState<"category" | "account" | "transferAccount" | null>(null);

  const sourceAccount = useMemo(() => accounts.find(a => a.id === accountId), [accounts, accountId]);
  const destAccount = useMemo(() => accounts.find(a => a.id === transferAccountId), [accounts, transferAccountId]);

  const [currency, setCurrency] = useState(initialData?.currency || sourceAccount?.currency || "USD");
  const [destinationAmount, setDestinationAmount] = useState(initialData?.destinationAmount?.toString() || "");
  const [feeAmount, setFeeAmount] = useState(initialData?.feeAmount?.toString() || "");

  useEffect(() => {
    if (!initialData && sourceAccount) {
      setCurrency(sourceAccount.currency || "USD");
    }
  }, [sourceAccount, initialData]);

  useEffect(() => {
    if (isOpen) {
      fetchLiveRates();
    }
  }, [isOpen, fetchLiveRates]);

  const isCrossCurrency = type === "transfer" && sourceAccount && destAccount && sourceAccount.currency !== destAccount.currency;

  useEffect(() => {
    if (isCrossCurrency && amount && !initialData) {
      const parsedAmount = Number(amount);
      if (parsedAmount > 0) {
        const converted = convertCurrency(parsedAmount, sourceAccount.currency, destAccount.currency, exchangeRates);
        setDestinationAmount(converted.toFixed(2));
        setFeeAmount("0.00");
      }
    }
  }, [amount, isCrossCurrency, sourceAccount, destAccount, exchangeRates, initialData]);

  if (!isOpen) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!description.trim() && type !== "transfer") return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const dataToSave: any = {
      type,
      amount: parsedAmount,
      description: type === "transfer" ? description.trim() || "Account transfer" : description.trim(),
      date,
      categoryId: type === "transfer" ? "transfer" : categoryId,
      accountId,
      notes: notes.trim(),
      tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean),
      attachments,
      currency: type === "transfer" ? sourceAccount?.currency || "USD" : currency,
      exchangeRate: exchangeRates[currency] || 1,
      splits: splits.length > 0 ? splits : undefined,
    };

    if (type === "transfer") {
      dataToSave.transferAccountId = transferAccountId;
      if (isCrossCurrency) {
        dataToSave.destinationAmount = Number(destinationAmount);
        dataToSave.destinationCurrency = destAccount?.currency;
        dataToSave.feeAmount = feeAmount ? Number(feeAmount) : 0;
      }
    }

    if (initialData) {
      updateTransaction(initialData.id, dataToSave);
      onSave?.();
    } else {
      addTransaction(dataToSave as any);
    }

    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
    setCategoryId(type === "income" ? "freelance-income" : "software");
    setDestinationAmount("");
    setFeeAmount("");
    setNotes("");
    setTagText("");
    setAttachments([]);
    onClose();
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments((current) => [
          ...current,
          {
            id: `${file.name}-${file.lastModified}`,
            name: file.name,
            type: file.type || "file",
            size: file.size,
            addedAt: new Date().toISOString(),
            url: e.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  }

  return createPortal(
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close transaction form"
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-transaction-title"
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h2 id="add-transaction-title" className="text-lg font-semibold text-zinc-100">{initialData ? "Edit Transaction" : "Add Transaction"}</h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="Close transaction form">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex bg-zinc-950 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={clsx(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                type === "expense" 
                  ? "bg-zinc-800 text-zinc-100 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={clsx(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                type === "income" 
                  ? "bg-zinc-800 text-zinc-100 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType("transfer")}
              className={clsx(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                type === "transfer"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Transfer
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{type === "transfer" ? "Sent Amount" : "Amount"}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00" 
                    min="0"
                    step="0.000001"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2 px-4 text-xl font-semibold text-zinc-100 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Currency</label>
                {type === "transfer" ? (
                  <div className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2 px-4 text-xl font-semibold text-zinc-400 text-center">
                    {sourceAccount?.currency || "USD"}
                  </div>
                ) : (
                  <CustomSelect
                    value={currency}
                    onChange={setCurrency}
                    options={currencies.map(c => ({ label: c, value: c }))}
                  />
                )}
              </div>
            </div>

            {currency === "ETH" && exchangeRates["ETH"] && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm text-indigo-300 flex flex-wrap items-center justify-between">
                <span>Rate: <strong>1 Ξ ≈ {formatCurrency(1 / exchangeRates["ETH"], "USD")}</strong></span>
                <span>Total: <strong>{amount ? formatCurrency(Number(amount) / exchangeRates["ETH"], "USD") : "$0.00"}</strong></span>
              </div>
            )}

            {isCrossCurrency && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Received Amount ({destAccount?.currency})</label>
                  <input 
                    type="number" 
                    value={destinationAmount}
                    onChange={(event) => {
                      const newDestAmount = event.target.value;
                      setDestinationAmount(newDestAmount);
                      
                      const parsedSource = Number(amount);
                      const parsedDest = Number(newDestAmount);
                      if (parsedSource > 0 && parsedDest >= 0 && sourceAccount && destAccount) {
                        const standardDest = convertCurrency(parsedSource, sourceAccount.currency, destAccount.currency, exchangeRates);
                        if (parsedDest !== standardDest) {
                           const destDiff = standardDest - parsedDest;
                           const fee = convertCurrency(destDiff, destAccount.currency, sourceAccount.currency, exchangeRates);
                           setFeeAmount(Math.max(0, fee).toFixed(2));
                        }
                      }
                    }}
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Txn Fee ({sourceAccount?.currency})</label>
                  <input 
                    type="number" 
                    value={feeAmount}
                    onChange={(event) => setFeeAmount(event.target.value)}
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={type === "transfer" ? "Move money between accounts" : "Client payment, subscription, lunch..."}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
                <CustomDatePicker value={date} onChange={setDate} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
                <CustomSelect
                  value={categoryId}
                  onChange={(val) => {
                    if (val === "create_new") {
                      setSubModal("category");
                    } else {
                      setCategoryId(val);
                    }
                  }}
                  options={[...categories.map(c => ({ label: c.name, value: c.id })), { label: "+ Create new category", value: "create_new" }]}
                />
              </div>
            </div>

            {type !== "transfer" && splits.length > 0 && (
              <div className="space-y-3 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-zinc-300">Splits</h4>
                  <button type="button" onClick={() => setSplits([...splits, { categoryId: categories[0]?.id || "", amount: 0 }])} className="text-xs text-indigo-400 hover:text-indigo-300">Add Split</button>
                </div>
                {splits.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <CustomSelect value={s.categoryId} onChange={val => { 
                        if (val === "create_new") setSubModal("category");
                        else { const n = [...splits]; n[i].categoryId = val; setSplits(n); }
                      }} options={[...categories.map(c => ({ label: c.name, value: c.id })), { label: "+ Create new category", value: "create_new" }]} />
                    </div>
                    <div className="w-24">
                      <input type="number" step="any" min="0" value={s.amount || ""} onChange={e => { const n = [...splits]; n[i].amount = Number(e.target.value); setSplits(n); }} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-200" placeholder="Amount" />
                    </div>
                    <button type="button" onClick={() => { const n = [...splits]; n.splice(i, 1); setSplits(n); }} className="p-2 text-zinc-500 hover:text-rose-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            {type !== "transfer" && splits.length === 0 && (
              <button type="button" onClick={() => setSplits([{ categoryId: categoryId, amount: Number(amount) || 0 }])} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                + Split transaction
              </button>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{type === "transfer" ? "Transfer From" : "Account"}</label>
                <CustomSelect
                  value={accountId}
                  onChange={(val) => {
                    if (val === "create_new") setSubModal("account");
                    else setAccountId(val);
                  }}
                  options={[...accounts.map(a => ({ label: a.name, value: a.id })), { label: "+ Create new account", value: "create_new" }]}
                />
              </div>

              {type === "transfer" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Transfer To</label>
                  <CustomSelect
                    value={transferAccountId}
                    onChange={(val) => {
                      if (val === "create_new") setSubModal("transferAccount");
                      else setTransferAccountId(val);
                    }}
                    options={[...accounts.filter(a => a.id !== accountId).map(a => ({ label: a.name, value: a.id })), { label: "+ Create new account", value: "create_new" }]}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
              <textarea 
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What was this for?" 
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
              ></textarea>
            </div>

            <div className="flex gap-4">
              <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,.pdf" onChange={handleFiles} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 border border-zinc-800 rounded-xl border-dashed text-zinc-400 text-sm flex items-center justify-center gap-2 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {attachments.length ? `${attachments.length} attached` : "Receipt"}
              </button>
              <div className="flex-1 relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  value={tagText}
                  onChange={(event) => setTagText(event.target.value)}
                  placeholder="Tags"
                  className="w-full py-2.5 border border-zinc-800 rounded-xl border-dashed bg-transparent pl-9 pr-3 text-zinc-300 text-sm hover:bg-zinc-800/50 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              Number(amount) <= 0 ||
              (type !== "transfer" && !description.trim()) ||
              (type === "transfer" && accountId === transferAccountId)
            }
            className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            Save Transaction
          </button>
        </div>
      </form>
    </div>
    {subModal === "category" && <CategoryModal onClose={() => setSubModal(null)} />}
    {subModal === "account" && <AccountModal mode="create" onClose={() => setSubModal(null)} />}
    {subModal === "transferAccount" && <AccountModal mode="create" onClose={() => setSubModal(null)} />}
    </>,
    document.body
  );
}
