import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number, currency: string = "USD") => {
  const cleanCurrency = (currency || "USD").toUpperCase();
  if (cleanCurrency === "BDT") {
    return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (cleanCurrency === "ETH") {
    return `Ξ${amount.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} ETH`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cleanCurrency,
    }).format(amount);
  } catch (e) {
    return `${cleanCurrency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

export function convertCurrency(amount: number, from: string, to: string, rates: Record<string, number>): number {
  if (from === to || !rates[from] || !rates[to]) return amount;
  // Rates are based on USD: rate is "how much of this currency equals 1 USD".
  // So amount in USD = amount / rates[from]
  // Target amount = amount in USD * rates[to]
  return (amount / rates[from]) * rates[to];
}
export const STANDARD_COLORS = [
  { id: "emerald", label: "Emerald", value: "bg-emerald-500", text: "text-emerald-500", full: "bg-emerald-500/20 text-emerald-400" },
  { id: "blue", label: "Blue", value: "bg-blue-500", text: "text-blue-500", full: "bg-blue-500/20 text-blue-400" },
  { id: "rose", label: "Rose", value: "bg-rose-500", text: "text-rose-500", full: "bg-rose-500/20 text-rose-400" },
  { id: "amber", label: "Amber", value: "bg-amber-500", text: "text-amber-500", full: "bg-amber-500/20 text-amber-400" },
  { id: "purple", label: "Purple", value: "bg-purple-500", text: "text-purple-500", full: "bg-purple-500/20 text-purple-400" },
  { id: "cyan", label: "Cyan", value: "bg-cyan-500", text: "text-cyan-500", full: "bg-cyan-500/20 text-cyan-400" },
  { id: "indigo", label: "Indigo", value: "bg-indigo-500", text: "text-indigo-500", full: "bg-indigo-500/20 text-indigo-400" },
  { id: "pink", label: "Pink", value: "bg-pink-500", text: "text-pink-500", full: "bg-pink-500/20 text-pink-400" },
  { id: "violet", label: "Violet", value: "bg-violet-500", text: "text-violet-500", full: "bg-violet-500/20 text-violet-400" },
  { id: "teal", label: "Teal", value: "bg-teal-500", text: "text-teal-500", full: "bg-teal-500/20 text-teal-400" },
  { id: "orange", label: "Orange", value: "bg-orange-500", text: "text-orange-500", full: "bg-orange-500/20 text-orange-400" },
  { id: "sky", label: "Sky", value: "bg-sky-500", text: "text-sky-500", full: "bg-sky-500/20 text-sky-400" },
];
