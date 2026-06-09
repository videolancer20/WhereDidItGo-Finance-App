import { X, Copy, Trash2, Upload, Edit3, Calendar, Tag as TagIcon } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type FinanceTransaction, useFinance } from "../data/financeStore";
import { formatCurrency } from "../utils";
import { AddTransactionModal } from "./AddTransactionModal";

interface TransactionDetailModalProps {
  transaction: FinanceTransaction;
  onClose: () => void;
  onEdit?: () => void;
}

export function TransactionDetailModal({ transaction, onClose, onEdit }: TransactionDetailModalProps) {
  const { updateTransaction, deleteTransaction, duplicateTransaction, exchangeRates } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState(transaction.notes || "");
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <AddTransactionModal 
        isOpen={true} 
        onClose={() => setIsEditing(false)} 
        initialData={transaction} 
        onSave={() => { setIsEditing(false); onClose(); }} 
      />
    );
  }

  function handleNotesBlur() {
    if (notes !== transaction.notes) {
      updateTransaction(transaction.id, { notes });
    }
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const newAttachments = files.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      type: file.type || "file",
      size: file.size,
      addedAt: new Date().toISOString(),
    }));

    updateTransaction(transaction.id, {
      attachments: [...(transaction.attachments || []), ...newAttachments],
    });
    event.target.value = "";
  }

  function handleDelete() {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      deleteTransaction(transaction.id);
      onClose();
    }
  }

  function handleDuplicate() {
    duplicateTransaction(transaction.id);
    onClose();
  }

  const typeColor =
    transaction.type === "income"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : transaction.type === "expense"
      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
      : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

  const amountColor =
    transaction.type === "income"
      ? "text-emerald-400"
      : transaction.type === "expense"
      ? "text-zinc-100"
      : "text-cyan-400";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800">
          <div className="flex items-start justify-between mb-4">
            <div className="flex gap-2">
              <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md border ${typeColor}`}>
                {transaction.type}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md border bg-zinc-800/50 text-zinc-400 border-zinc-700/50">
                {transaction.status}
              </span>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100 leading-tight">
            {transaction.description}
          </h2>
          <div className="flex items-center gap-1.5 text-zinc-500 text-sm mt-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(transaction.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Amount</p>
              <p className={`text-xl font-semibold ${amountColor}`}>
                {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}{formatCurrency(Math.abs(transaction.amount), transaction.currency || "USD")}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Account</p>
              <p className="text-sm font-medium text-zinc-200">{transaction.account}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Category</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                <p className="text-sm font-medium text-zinc-200">{transaction.category}</p>
              </div>
            </div>
            {transaction.transferAccount && (
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-1">Transfer To</p>
                <p className="text-sm font-medium text-zinc-200">{transaction.transferAccount}</p>
              </div>
            )}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-zinc-500 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {transaction.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 text-xs text-zinc-300">
                      <TagIcon className="w-3 h-3 text-zinc-500" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {transaction.currency === "ETH" && exchangeRates["ETH"] && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-wrap items-center justify-between text-sm">
              <span className="text-indigo-400">Rate: <strong className="text-indigo-300">1 Ξ ≈ {formatCurrency(1 / exchangeRates["ETH"], "USD")}</strong></span>
              <span className="text-indigo-400">Total Value: <strong className="text-indigo-300">{formatCurrency(Math.abs(transaction.amount) / exchangeRates["ETH"], "USD")}</strong></span>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Notes</h3>
            <textarea
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 resize-none"
              rows={3}
              placeholder="Add notes about this transaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
            />
            <p className="text-[10px] text-zinc-500 mt-1">Saves automatically</p>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-zinc-300">Attachments</h3>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                <Upload className="w-3.5 h-3.5" />
                Add File
              </button>
              <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,.pdf" onChange={handleFiles} />
            </div>
            
            {(!transaction.attachments || transaction.attachments.length === 0) ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center">
                <p className="text-xs text-zinc-500">No attachments yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transaction.attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800/50 bg-zinc-800/30">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-zinc-400">{file.type.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                      </div>
                      <p className="text-sm text-zinc-300 truncate">{file.name}</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm("Remove this attachment?")) {
                          updateTransaction(transaction.id, {
                            attachments: transaction.attachments.filter(a => a.id !== file.id)
                          });
                        }
                      }}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between">
          <button 
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDuplicate}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            <button 
              onClick={() => {
                if (onEdit) {
                  onEdit();
                } else {
                  setIsEditing(true);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
        
      </div>
    </div>,
    document.body
  );
}
