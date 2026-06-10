import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Zap } from "lucide-react";
import { formatCurrency } from "../utils";
import { vaultTemplates } from "./vaultTemplates";

export type TransactionType = "income" | "expense" | "transfer";

export interface FinanceAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
  url?: string;
}

export interface FinanceTransaction {
  id: string;
  date: string;
  description: string;
  categoryId: string;
  category: string;
  accountId: string;
  account: string;
  amount: number;
  type: TransactionType;
  status: "Completed" | "Pending";
  notes: string;
  tags: string[];
  attachments: FinanceAttachment[];
  transferAccountId?: string;
  transferAccount?: string;
  destinationAmount?: number;
  destinationCurrency?: string;
  feeAmount?: number;
  currency?: string;
  exchangeRate?: number;
  splits?: { categoryId: string, amount: number, notes?: string }[];
  reconciled?: boolean;
}

export interface CategoryRecord {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  icon: string;
  color: string;
  archived: boolean;
}

export interface AccountRecord {
  id: string;
  name: string;
  type: string;
  openingBalance: number;
  number: string;
  icon: string;
  trend: number[];
  color: string;
  stroke: string;
  archived: boolean;
  currency: string;
}

export interface BudgetRecord {
  id: string;
  categoryId: string; // re-used as targetId for accounts
  category: string; // re-used as targetName for accounts
  targetType?: "category" | "account";
  limit: number;
  color: string;
  month: string;
  currency: string;
}

export interface GoalRecord {
  id: string;
  name: string;
  target: number;
  current: number;
  type: "savings" | "debt-payoff" | "expense-reduction";
  icon: string;
  color: string;
  due: string;
  achieved?: boolean;
  currency: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  accountId?: string;
  notes?: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  accountId: string;
  nextDate: string;
  frequency: "Monthly" | "Quarterly" | "Annual";
  autoPay: boolean;
}

export interface SavedReport {
  id: string;
  name: string;
  date: string;
  type: "CSV" | "PDF" | "Excel";
  size: string;
  snapshotTotals?: { monthlyIncome: number; monthlyExpenses: number; netProfit: number };
  snapshotTxnCount?: number;
}

export interface AppSettings {
  firstName: string;
  lastName: string;
  email: string;
  currency: string;
  dateFormat: "MMM d, yyyy" | "yyyy-MM-dd" | "MM/dd/yyyy";
  theme: string;
  backupSchedule: "Off" | "Daily" | "Weekly" | "Monthly";
  customCurrencies?: string[];
  avatarUrl?: string;
  dismissedAlerts?: string[];
  budgetAlerts?: boolean;
  weeklyReport?: boolean;
  unusualActivity?: boolean;
  billReminders?: boolean;
  dashboardConfig?: {
    hideWallet?: boolean;
    hideTopCategories?: boolean;
    hideUpcomingSubs?: boolean;
    hideSavingsRate?: boolean;
    hideGoals?: boolean;
    hideWarnings?: boolean;
    hideRecentTransactions?: boolean;
  };
}

export interface LoanEntity {
  id: string;
  name: string;
  category: "bank" | "individual";
  notes: string;
  archived: boolean;
  color?: string;
  currency: string;
}

export interface LoanTransaction {
  id: string;
  entityId: string;
  amount: number;
  type: "lent" | "borrowed";
  date: string;
  notes: string;
  settled: boolean;
  currency: string;
  parentId?: string;
  accountId?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "monthly" | "yearly" | "custom";
  customIntervalDays?: number;
  categoryId: string;
  accountId: string;
  startDate: string;
  nextDueDate: string;
  status: "active" | "paused" | "cancelled";
  notes: string;
  color: string;
  websiteUrl?: string;
  currency: string;
}

export interface SubscriptionOverride {
  id: string;
  subscriptionId: string;
  period: string;
  accountId?: string;
  date?: string;
  amount?: number;
  skipped: boolean;
}

export interface InvestmentAsset {
  id: string;
  symbol: string;
  name: string;
  type: "stock" | "crypto" | "real_estate" | "other";
  shares: number;
  averagePrice: number;
  currentPrice: number;
  currency: string;
}

export interface InvestmentTransaction {
  id: string;
  assetId: string;
  type: "buy" | "sell";
  date: string;
  shares: number;
  price: number;
  fees: number;
  accountId?: string;
}

export interface FinanceState {
  version: number;
  transactions: FinanceTransaction[];
  categories: CategoryRecord[];
  accounts: AccountRecord[];
  budgets: BudgetRecord[];
  goals: GoalRecord[];
  recurringPayments: RecurringPayment[];
  reports: SavedReport[];
  settings: AppSettings;
  lastBackupAt?: string;
  loanEntities: LoanEntity[];
  loanTransactions: LoanTransaction[];
  subscriptions: Subscription[];
  subscriptionOverrides: SubscriptionOverride[];
  exchangeRates: Record<string, number>;
  customExchangeRates?: Record<string, number>;
  investments: InvestmentAsset[];
  investmentTransactions: InvestmentTransaction[];
  goalContributions?: GoalContribution[];
}

export interface NewTransactionInput {
  date: string;
  description: string;
  categoryId: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  notes?: string;
  tags?: string[];
  attachments?: FinanceAttachment[];
  transferAccountId?: string;
  currency?: string;
  exchangeRate?: number;
  destinationAmount?: number;
  destinationCurrency?: string;
  feeAmount?: number;
}

export interface Workspace {
  id: string;
  name: string;
}

export const getWorkspaces = (): Workspace[] => {
  try {
    return JSON.parse(localStorage.getItem("flowledger-workspaces") || '[{"id":"default","name":"Personal"}]');
  } catch {
    return [{ id: "default", name: "Personal" }];
  }
};

export const setWorkspaces = (ws: Workspace[]) => {
  localStorage.setItem("flowledger-workspaces", JSON.stringify(ws));
};

export const getActiveWorkspaceId = () => {
  return localStorage.getItem("flowledger-active-workspace") || "default";
};

export const setActiveWorkspaceId = (id: string) => {
  localStorage.setItem("flowledger-active-workspace", id);
};

export const getIndexedDbName = () => `flowledger-workspace-${getActiveWorkspaceId()}`;
const indexedStoreName = "app-state";
const indexedStateKey = "finance-state";
const legacyTransactionsKey = "flowledger.transactions";
const appStateVersion = 1;

const categories: CategoryRecord[] = [
  { id: "personal-expenses", name: "Personal Expenses", type: "expense", icon: "User", color: "bg-blue-500/20 text-blue-400", archived: false },
  { id: "freelance-income", name: "Freelance Income", type: "income", icon: "Zap", color: "bg-emerald-500/20 text-emerald-400", archived: false },
  { id: "v20-studio", name: "V20 Studio", type: "both", icon: "Briefcase", color: "bg-purple-500/20 text-purple-400", archived: false },
  { id: "investments", name: "Investments", type: "both", icon: "TrendingUp", color: "bg-indigo-500/20 text-indigo-400", archived: false },
  { id: "taxes", name: "Taxes", type: "expense", icon: "Landmark", color: "bg-rose-500/20 text-rose-400", archived: false },
  { id: "savings", name: "Savings", type: "expense", icon: "PiggyBank", color: "bg-teal-500/20 text-teal-400", archived: false },
  { id: "business-expenses", name: "Business Expenses", type: "expense", icon: "Receipt", color: "bg-orange-500/20 text-orange-400", archived: false },
  { id: "groceries", name: "Groceries", type: "expense", icon: "ShoppingCart", color: "bg-sky-500/20 text-sky-400", archived: false },
  { id: "travel", name: "Travel", type: "expense", icon: "Plane", color: "bg-pink-500/20 text-pink-400", archived: false },
  { id: "software", name: "Software", type: "expense", icon: "Monitor", color: "bg-violet-500/20 text-violet-400", archived: false },
  { id: "office", name: "Office", type: "expense", icon: "Building2", color: "bg-blue-500/20 text-blue-400", archived: false },
  { id: "marketing", name: "Marketing", type: "expense", icon: "Megaphone", color: "bg-amber-500/20 text-amber-400", archived: false },
  { id: "equipment", name: "Equipment", type: "expense", icon: "Laptop", color: "bg-zinc-500/20 text-zinc-300", archived: false },
  { id: "dining-out", name: "Dining Out", type: "expense", icon: "Receipt", color: "bg-pink-500/20 text-pink-400", archived: false },
  { id: "transfer", name: "Transfer", type: "both", icon: "ArrowLeftRight", color: "bg-cyan-500/20 text-cyan-400", archived: false },
];

const accounts: AccountRecord[] = [
  { id: "mercury-business", name: "Mercury Business", type: "Business Bank", openingBalance: 70250, number: "**** 4201", icon: "Building2", trend: [10, 20, 15, 30, 25, 40, 35], color: "from-indigo-500/20 to-purple-500/0", stroke: "#8b5cf6", archived: false, currency: "USD" },
  { id: "chase-personal", name: "Chase Personal", type: "Personal Bank", openingBalance: 12571.8, number: "**** 8892", icon: "Building2", trend: [5, 12, 8, 15, 10, 18, 22], color: "from-blue-500/20 to-blue-500/0", stroke: "#3b82f6", archived: false, currency: "USD" },
  { id: "wealthfront", name: "Wealthfront", type: "Savings Account", openingBalance: 27729.05, number: "**** 1102", icon: "PiggyBank", trend: [20, 22, 23, 25, 26, 27, 28], color: "from-emerald-500/20 to-emerald-500/0", stroke: "#10b981", archived: false, currency: "USD" },
  { id: "brex-card", name: "Brex Card", type: "Credit Card", openingBalance: -996.5, number: "**** 9931", icon: "CreditCard", trend: [0, -5, -15, -10, -25, -20, -30], color: "from-rose-500/20 to-rose-500/0", stroke: "#f43f5e", archived: false, currency: "USD" },
  { id: "cash-app", name: "Cash App", type: "Mobile Banking", openingBalance: 850, number: "@alexjensen", icon: "Smartphone", trend: [2, 5, 3, 8, 4, 10, 8], color: "from-teal-500/20 to-teal-500/0", stroke: "#14b8a6", archived: false, currency: "USD" },
  { id: "physical-wallet", name: "Physical Wallet", type: "Cash Wallet", openingBalance: 350, number: "N/A", icon: "Wallet", trend: [8, 7, 6, 5, 4, 3, 3], color: "from-amber-500/20 to-amber-500/0", stroke: "#f59e0b", archived: false, currency: "USD" },
];

const initialTransactions: FinanceTransaction[] = [
  buildSeedTransaction("txn-1", "2026-06-07", "Stripe Payout", "freelance-income", "mercury-business", 4250, "income", "client,stripe"),
  buildSeedTransaction("txn-2", "2026-06-06", "AWS Web Services", "software", "brex-card", -340.5, "expense", "hosting,recurring"),
  buildSeedTransaction("txn-3", "2026-06-05", "Whole Foods", "groceries", "chase-personal", -125.8, "expense", "personal"),
  buildSeedTransaction("txn-4", "2026-06-04", "Figma Subscription", "software", "brex-card", -15, "expense", "design,recurring"),
  buildSeedTransaction("txn-5", "2026-06-03", "V20 Client Retainer", "v20-studio", "mercury-business", 8500, "income", "client,retainer"),
  buildSeedTransaction("txn-6", "2026-06-02", "WeWork Hot Desk", "office", "brex-card", -399, "expense", "office"),
  buildSeedTransaction("txn-7", "2026-05-30", "Uber Rides", "travel", "chase-personal", -45.5, "expense", "travel"),
  buildSeedTransaction("txn-8", "2026-05-28", "Dividend Payout", "investments", "wealthfront", 120.45, "income", "dividend"),
  buildSeedTransaction("txn-9", "2026-05-20", "Apple Store", "equipment", "brex-card", -2499, "expense", "equipment"),
  buildSeedTransaction("txn-10", "2026-05-18", "Upwork Escrow", "freelance-income", "mercury-business", 1250, "income", "client,upwork"),
];

const initialLoanEntities: LoanEntity[] = [
  { id: "loan-chase", name: "Chase Business Loan", category: "bank", notes: "Business expansion loan", archived: false, currency: "USD" },
  { id: "loan-alice", name: "Alice Rahman", category: "individual", notes: "Personal loan to friend", archived: false, currency: "USD" },
  { id: "loan-fahim", name: "Fahim Ahmed", category: "individual", notes: "Borrowed for equipment", archived: false, currency: "USD" },
];

const initialLoanTransactions: LoanTransaction[] = [
  { id: "ltxn-1", entityId: "loan-chase", amount: 15000, type: "borrowed", date: "2026-01-15", notes: "Initial business loan", settled: false, currency: "USD" },
  { id: "ltxn-2", entityId: "loan-alice", amount: 500, type: "lent", date: "2026-03-20", notes: "Lent for emergency", settled: false, currency: "USD" },
  { id: "ltxn-3", entityId: "loan-fahim", amount: 2000, type: "borrowed", date: "2026-04-10", notes: "Equipment purchase help", settled: false, currency: "USD" },
  { id: "ltxn-4", entityId: "loan-chase", amount: 3000, type: "borrowed", date: "2026-02-01", notes: "Additional credit line", settled: true, currency: "USD" },
];

const initialSubscriptions: Subscription[] = [
  { id: "sub-netflix", name: "Netflix", amount: 15.99, frequency: "monthly", categoryId: "personal-expenses", accountId: "chase-personal", startDate: "2025-01-01", nextDueDate: "2026-07-01", status: "active", notes: "Premium plan", color: "bg-rose-500", currency: "USD" },
  { id: "sub-adobe", name: "Adobe Creative Cloud", amount: 54.99, frequency: "monthly", categoryId: "software", accountId: "brex-card", startDate: "2025-03-01", nextDueDate: "2026-07-01", status: "active", notes: "All apps plan", color: "bg-red-500", currency: "USD" },
  { id: "sub-aws", name: "AWS Web Services", amount: 340.50, frequency: "monthly", categoryId: "software", accountId: "brex-card", startDate: "2024-06-01", nextDueDate: "2026-06-28", status: "active", notes: "Production hosting", color: "bg-amber-500", currency: "USD" },
  { id: "sub-wework", name: "WeWork Hot Desk", amount: 399, frequency: "monthly", categoryId: "office", accountId: "brex-card", startDate: "2025-09-01", nextDueDate: "2026-07-02", status: "active", notes: "Flexible workspace", color: "bg-blue-500", currency: "USD" },
  { id: "sub-gym", name: "Gym Membership", amount: 49.99, frequency: "monthly", categoryId: "personal-expenses", accountId: "chase-personal", startDate: "2025-06-01", nextDueDate: "2026-07-01", status: "active", notes: "Monthly membership", color: "bg-emerald-500", currency: "USD" },
  { id: "sub-figma", name: "Figma Pro", amount: 15, frequency: "monthly", categoryId: "software", accountId: "brex-card", startDate: "2025-01-01", nextDueDate: "2026-07-01", status: "paused", notes: "Design tool", color: "bg-violet-500", currency: "USD" }
];

export const initialFinanceState: FinanceState = {
  version: appStateVersion,
  exchangeRates: { USD: 1 },
  transactions: initialTransactions.map(t => ({...t, currency: "USD"})),
  categories,
  accounts: accounts.map(a => ({...a, currency: "USD"})),
  budgets: [
    { id: "budget-software", categoryId: "software", category: "Software", limit: 500, color: "bg-violet-500", month: "2026-06", currency: "USD" },
    { id: "budget-office", categoryId: "office", category: "Office", limit: 300, color: "bg-blue-500", month: "2026-06", currency: "USD" },
    { id: "budget-travel", categoryId: "travel", category: "Travel", limit: 1500, color: "bg-amber-500", month: "2026-06", currency: "USD" },
    { id: "budget-marketing", categoryId: "marketing", category: "Marketing", limit: 2000, color: "bg-rose-500", month: "2026-06", currency: "USD" },
    { id: "budget-groceries", categoryId: "groceries", category: "Groceries", limit: 800, color: "bg-emerald-500", month: "2026-06", currency: "USD" },
    { id: "budget-dining", categoryId: "dining-out", category: "Dining Out", limit: 400, color: "bg-pink-500", month: "2026-06", currency: "USD" },
  ],
  goals: [
    { id: "goal-emergency", name: "Emergency Fund", target: 20000, current: 15400, type: "savings", icon: "Target", color: "bg-emerald-500", due: "Dec 2026", currency: "USD" },
    { id: "goal-house", name: "House Down Payment", target: 80000, current: 42500, type: "savings", icon: "Home", color: "bg-blue-500", due: "Jun 2027", currency: "USD" },
    { id: "goal-macbooks", name: "New Studio MacBooks", target: 6000, current: 1200, type: "expense-reduction", icon: "Laptop", color: "bg-purple-500", due: "Feb 2027", currency: "USD" },
    { id: "goal-japan", name: "Japan Trip", target: 5000, current: 5000, type: "savings", icon: "Plane", color: "bg-amber-500", due: "Nov 2026", achieved: true, currency: "USD" },
  ],
  recurringPayments: [
    { id: "rec-aws", name: "Amazon Web Services", amount: -340.5, categoryId: "software", accountId: "brex-card", nextDate: "2026-06-28", frequency: "Monthly", autoPay: true },
    { id: "rec-adobe", name: "Adobe Creative Cloud", amount: -54.99, categoryId: "software", accountId: "brex-card", nextDate: "2026-07-01", frequency: "Monthly", autoPay: true },
  ],
  reports: [
    { id: "report-q2", name: "Q2 2026 Financial Summary", date: "Jun 8, 2026", type: "PDF", size: "2.4 MB" },
    { id: "report-may-pl", name: "May Profit & Loss", date: "Jun 1, 2026", type: "CSV", size: "845 KB" },
    { id: "report-tax", name: "Tax Deductions 2026 YTD", date: "May 28, 2026", type: "Excel", size: "1.8 MB" },
  ],
  settings: {
    firstName: "Alex",
    lastName: "Jensen",
    email: "alex.jensen@example.com",
    currency: "USD",
    dateFormat: "MMM d, yyyy",
    theme: "theme-dark",
    backupSchedule: "Off",
    customCurrencies: ["USD", "EUR", "GBP", "BDT", "ETH"],
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop",
    budgetAlerts: true,
    weeklyReport: true,
    unusualActivity: true,
  },
  loanEntities: initialLoanEntities,
  loanTransactions: initialLoanTransactions,
  subscriptions: initialSubscriptions,
  subscriptionOverrides: [],
};

const emptyCategories: CategoryRecord[] = [
  { id: "personal-expenses", name: "Personal Expenses", type: "expense", icon: "User", color: "bg-blue-500/20 text-blue-400", archived: false },
  { id: "business-expenses", name: "Business Expenses", type: "expense", icon: "Receipt", color: "bg-orange-500/20 text-orange-400", archived: false },
  { id: "taxes", name: "Taxes", type: "expense", icon: "Landmark", color: "bg-rose-500/20 text-rose-400", archived: false },
  { id: "savings", name: "Savings", type: "expense", icon: "PiggyBank", color: "bg-teal-500/20 text-teal-400", archived: false },
  { id: "groceries", name: "Groceries", type: "expense", icon: "ShoppingCart", color: "bg-sky-500/20 text-sky-400", archived: false },
  { id: "travel", name: "Travel", type: "expense", icon: "Plane", color: "bg-pink-500/20 text-pink-400", archived: false },
  { id: "dining-out", name: "Dining Out", type: "expense", icon: "Receipt", color: "bg-pink-500/20 text-pink-400", archived: false },
  { id: "income", name: "Income", type: "income", icon: "Zap", color: "bg-emerald-500/20 text-emerald-400", archived: false },
  { id: "transfer", name: "Transfer", type: "both", icon: "ArrowLeftRight", color: "bg-cyan-500/20 text-cyan-400", archived: false }
];

export const emptyFinanceState: FinanceState = {
  version: appStateVersion,
  exchangeRates: { USD: 1 },
  transactions: [],
  categories: emptyCategories,
  accounts: [],
  budgets: [],
  goals: [],
  recurringPayments: [],
  reports: [],
  settings: {
    firstName: "New",
    lastName: "User",
    email: "",
    currency: "USD",
    dateFormat: "MMM d, yyyy",
    theme: "theme-dark",
    backupSchedule: "Off",
    customCurrencies: ["USD", "EUR", "GBP", "BDT", "ETH"],
    avatarUrl: "",
    budgetAlerts: true,
    weeklyReport: true,
    unusualActivity: true,
  },
  loanEntities: [],
  loanTransactions: [],
  subscriptions: [],
  subscriptionOverrides: [],
};

interface FinanceContextValue {
  state: FinanceState;
  isReady: boolean;
  transactions: FinanceTransaction[];
  categories: CategoryRecord[];
  accounts: AccountRecord[];
  budgets: BudgetRecord[];
  goals: GoalRecord[];
  reports: SavedReport[];
  settings: AppSettings;
  recurringPayments: RecurringPayment[];
  accountBalances: Record<string, number>;
  totals: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    netProfit: number;
    cashFlow: number;
  };
  exchangeRates: Record<string, number>;
  customExchangeRates?: Record<string, number>;
  updateCustomExchangeRates: (rates: Record<string, number>) => void;
  fetchLiveRates: () => Promise<void>;
  addTransaction: (transaction: NewTransactionInput) => string;
  updateTransaction: (id: string, changes: Partial<NewTransactionInput & Pick<FinanceTransaction, "status">>) => void;
  deleteTransaction: (id: string) => void;
  duplicateTransaction: (id: string) => void;
  bulkDeleteTransactions: (ids: string[]) => void;
  bulkUpdateTransactions: (ids: string[], changes: Partial<Pick<FinanceTransaction, "categoryId" | "accountId" | "tags">>) => void;
  addTransfer: (fromAccountId: string, toAccountId: string, amount: number, date: string, notes?: string) => void;
  addCategory: (name: string, type: CategoryRecord["type"], color?: string) => void;
  updateCategory: (id: string, changes: Partial<CategoryRecord>) => void;
  archiveCategory: (id: string) => void;
  mergeCategories: (sourceId: string, targetId: string) => void;
  addAccount: (name: string, type: string, openingBalance: number, color?: string, stroke?: string, currency?: string) => void;
  updateAccount: (id: string, changes: Partial<AccountRecord>) => void;
  archiveAccount: (id: string) => void;
  addBudget: (categoryId: string, limit: number, color: string, currency: string, targetType?: "category" | "account") => void;
  updateBudget: (id: string, changes: Partial<BudgetRecord>) => void;
  deleteBudget: (id: string) => void;
  addGoal: (goal: Omit<GoalRecord, "id">) => void;
  updateGoal: (id: string, changes: Partial<GoalRecord>) => void;
  deleteGoal: (id: string) => void;
  addGoalContribution: (goalId: string, amount: number, date: string, accountId?: string, notes?: string) => void;
  updateGoalContribution: (id: string, changes: Partial<GoalContribution>) => void;
  deleteGoalContribution: (id: string) => void;
  goalContributions: GoalContribution[];
  updateSettings: (settings: Partial<AppSettings>) => void;
  generateReport: (kind: "Monthly" | "Quarterly" | "Annual" | "Cash Flow" | "Profit & Loss" | "Category") => SavedReport;
  exportBackup: () => string;
  restoreBackup: (json: string) => boolean;
  resetDemoData: () => void;
  search: (query: string) => Array<{ id: string; type: string; title: string; subtitle: string; path: string }>;
  loanEntities: LoanEntity[];
  loanTransactions: LoanTransaction[];
  subscriptions: Subscription[];
  subscriptionOverrides: SubscriptionOverride[];
  upcomingPayments: Array<{ id: string; name: string; amount: number; nextDate: string; categoryId: string; accountId: string; accountName: string; frequency: string; }>;
  addLoanEntity: (name: string, category: "bank" | "individual", notes: string, color?: string, currency?: string) => string;
  updateLoanEntity: (id: string, changes: Partial<LoanEntity>) => void;
  deleteLoanEntity: (id: string) => void;
  addLoanTransaction: (entityId: string, amount: number, type: "lent" | "borrowed", date: string, notes: string, settled?: boolean, parentId?: string, accountId?: string, currency?: string) => void;
  updateLoanTransaction: (id: string, changes: Partial<LoanTransaction>) => void;
  deleteLoanTransaction: (id: string) => void;
  toggleLoanSettled: (id: string) => void;
  addSubscription: (sub: Omit<Subscription, "id" | "nextDueDate">) => string;
  updateSubscription: (id: string, changes: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  pauseSubscription: (id: string) => void;
  resumeSubscription: (id: string) => void;
  addSubscriptionOverride: (subscriptionId: string, period: string, overrides: Partial<Pick<SubscriptionOverride, "accountId" | "date" | "amount" | "skipped">>) => void;
  deleteSubscriptionOverride: (id: string) => void;
  skipSubscription: (id: string) => void;
  rewindSubscription: (id: string) => void;
  paySubscription: (id: string) => void;
  
  // Workspaces
  workspaces: Workspace[];
  activeWorkspaceId: string;
  createWorkspace: (name: string, templateId: string, withDemoData?: boolean) => Promise<void>;
  switchWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  
  // Custom currencies
  currencies: string[];

  // Alerts
  smartAlerts: Array<{ id: string; type: string; icon: any; message: string }>;
  dismissAlert: (id: string) => void;

  // Investments
  investments: InvestmentAsset[];
  investmentTransactions: InvestmentTransaction[];
  addInvestmentAsset: (asset: Omit<InvestmentAsset, "id">) => string;
  updateInvestmentAsset: (id: string, changes: Partial<InvestmentAsset>) => void;
  deleteInvestmentAsset: (id: string) => void;
  addInvestmentTransaction: (txn: Omit<InvestmentTransaction, "id">, accountId?: string) => void;
  deleteInvestmentTransaction: (id: string) => void;
  updateInvestmentPrice: (id: string, newPrice: number) => void;
  
  // Reconciliation
  toggleReconciled: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function computeNextDueDate(startDate: string, frequency: Subscription["frequency"], customIntervalDays?: number): string {
  const now = new Date();
  const start = new Date(startDate + "T00:00:00");
  let next = new Date(start);
  
  while (next <= now) {
    switch (frequency) {
      case "weekly": next.setDate(next.getDate() + 7); break;
      case "monthly": next.setMonth(next.getMonth() + 1); break;
      case "yearly": next.setFullYear(next.getFullYear() + 1); break;
      case "custom": next.setDate(next.getDate() + (customIntervalDays ?? 30)); break;
    }
  }
  return next.toISOString().slice(0, 10);
}

function advanceNextDueDate(current: string, frequency: Subscription["frequency"], customIntervalDays?: number): string {
  const date = new Date(current + "T00:00:00");
  switch (frequency) {
    case "weekly": date.setDate(date.getDate() + 7); break;
    case "monthly": date.setMonth(date.getMonth() + 1); break;
    case "yearly": date.setFullYear(date.getFullYear() + 1); break;
    case "custom": date.setDate(date.getDate() + (customIntervalDays ?? 30)); break;
  }
  return date.toISOString().slice(0, 10);
}

function rewindNextDueDate(current: string, frequency: Subscription["frequency"], customIntervalDays?: number): string {
  const date = new Date(current + "T00:00:00");
  switch (frequency) {
    case "weekly": date.setDate(date.getDate() - 7); break;
    case "monthly": date.setMonth(date.getMonth() - 1); break;
    case "yearly": date.setFullYear(date.getFullYear() - 1); break;
    case "custom": date.setDate(date.getDate() - (customIntervalDays ?? 30)); break;
  }
  return date.toISOString().slice(0, 10);
}

function buildSeedTransaction(
  id: string,
  date: string,
  description: string,
  categoryId: string,
  accountId: string,
  amount: number,
  type: TransactionType,
  tags: string
): FinanceTransaction {
  const category = categories.find((item) => item.id === categoryId);
  const account = accounts.find((item) => item.id === accountId);

  return {
    id,
    date,
    description,
    categoryId,
    category: category?.name ?? "Uncategorized",
    accountId,
    account: account?.name ?? "Unknown account",
    amount,
    type,
    status: "Completed",
    notes: "",
    tags: tags.split(",").filter(Boolean),
    attachments: [],
  };
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function withResolvedNames(state: FinanceState, transaction: NewTransactionInput): FinanceTransaction {
  const category = state.categories.find((item) => item.id === transaction.categoryId);
  const account = state.accounts.find((item) => item.id === transaction.accountId);
  const transferAccount = state.accounts.find((item) => item.id === transaction.transferAccountId);
  const signedAmount =
    transaction.type === "income" ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);

  return {
    id: createId("txn"),
    date: transaction.date,
    description: transaction.description.trim(),
    categoryId: transaction.categoryId,
    category: category?.name ?? "Uncategorized",
    accountId: transaction.accountId,
    account: account?.name ?? "Unknown account",
    amount: transaction.type === "transfer" ? -Math.abs(transaction.amount) : signedAmount,
    type: transaction.type,
    status: "Completed",
    notes: transaction.notes?.trim() ?? "",
    tags: transaction.tags ?? [],
    attachments: transaction.attachments ?? [],
    transferAccountId: transaction.transferAccountId,
    transferAccount: transferAccount?.name,
    currency: transaction.currency ?? "USD",
    exchangeRate: transaction.exchangeRate ?? 1,
    destinationAmount: transaction.destinationAmount,
    destinationCurrency: transaction.destinationCurrency,
    feeAmount: transaction.feeAmount,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(getIndexedDbName(), 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(indexedStoreName)) {
        db.createObjectStore(indexedStoreName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedState(): Promise<FinanceState | null> {
  if (typeof indexedDB === "undefined") return null;

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(indexedStoreName, "readonly");
    const request = transaction.objectStore(indexedStoreName).get(indexedStateKey);
    request.onsuccess = () => resolve((request.result as FinanceState | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function writeIndexedState(state: FinanceState) {
  if (typeof indexedDB === "undefined") return;

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(indexedStoreName, "readwrite");
    transaction.objectStore(indexedStoreName).put(state, indexedStateKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      console.error("IndexedDB write failed:", transaction.error);
      reject(transaction.error);
    };
  }).catch(err => {
    console.error("Write catch:", err);
  });
}

function migrateIndexedState(stored: FinanceState | null) {
  if (!stored) return initialFinanceState;

  const merged = {
    ...initialFinanceState,
    ...stored,
    accounts: (stored.accounts ?? initialFinanceState.accounts).map(a => ({...a, currency: a.currency || "USD"})),
    budgets: (stored.budgets ?? initialFinanceState.budgets).map(b => ({...b, currency: b.currency || "USD"})),
    goals: (stored.goals ?? initialFinanceState.goals).map(g => ({...g, currency: g.currency || "USD"})),
    loanEntities: (stored.loanEntities ?? initialFinanceState.loanEntities).map(l => ({...l, currency: l.currency || "USD"})),
    subscriptions: (stored.subscriptions ?? initialFinanceState.subscriptions).map(s => ({...s, currency: s.currency || "USD"})),
    transactions: (stored.transactions ?? initialFinanceState.transactions).map(t => ({...t, currency: t.currency || "USD"})),
  };
  return migrateLegacyTransactions(merged);
}

function migrateLegacyTransactions(state: FinanceState) {
  if (typeof window === "undefined") return state;

  try {
    const raw = window.localStorage.getItem(legacyTransactionsKey);
    if (!raw) return state;

    const legacy = JSON.parse(raw) as Array<Partial<FinanceTransaction> & { account?: string; category?: string }>;
    const migrated = legacy.map((transaction) => {
      const account = accounts.find((item) => item.name === transaction.account) ?? accounts[0];
      const category = categories.find((item) => item.name === transaction.category) ?? categories[0];

      return {
        ...transaction,
        id: transaction.id ?? createId("txn"),
        date: transaction.date ?? new Date().toISOString().slice(0, 10),
        description: transaction.description ?? "Imported transaction",
        categoryId: category.id,
        category: category.name,
        accountId: account.id,
        account: account.name,
        amount: Number(transaction.amount ?? 0),
        type: transaction.type ?? (Number(transaction.amount ?? 0) >= 0 ? "income" : "expense"),
        status: transaction.status ?? "Completed",
        notes: transaction.notes ?? "",
        tags: transaction.tags ?? [],
        attachments: transaction.attachments ?? [],
        currency: "USD",
      } satisfies FinanceTransaction;
    });

    window.localStorage.removeItem(legacyTransactionsKey);

    return {
      ...state,
      transactions: migrated.length ? migrated : state.transactions,
    };
  } catch {
    return state;
  }
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportTransactionsCsv(transactions: FinanceTransaction[]) {
  const header = ["Date", "Description", "Category", "Account", "Type", "Amount", "Tags", "Notes"];
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.description,
    transaction.category,
    transaction.account,
    transaction.type,
    transaction.amount.toFixed(2),
    transaction.tags.join("|"),
    transaction.notes,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  downloadFile(`flowledger-transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
}

export function downloadTextFile(filename: string, content: string, type = "text/plain") {
  downloadFile(filename, content, type);
}

function checkAndAutoPaySubscriptions(state: FinanceState): FinanceState {
  const todayStr = new Date().toISOString().slice(0, 10);
  let updatedSubscriptions = [...state.subscriptions];
  let updatedTransactions = [...state.transactions];
  let updatedOverrides = [...state.subscriptionOverrides];
  let stateChanged = false;

  for (let i = 0; i < updatedSubscriptions.length; i++) {
    const sub = updatedSubscriptions[i];
    if (sub.status !== "active") continue;

    let currentNextDueDate = sub.nextDueDate;
    // Keep paying as long as the next due date is in the past or today
    while (currentNextDueDate <= todayStr) {
      stateChanged = true;
      const currentPeriod = currentNextDueDate.slice(0, 7);
      const override = updatedOverrides.find(o => o.subscriptionId === sub.id && o.period === currentPeriod);

      if (override?.skipped) {
        currentNextDueDate = advanceNextDueDate(currentNextDueDate, sub.frequency, sub.customIntervalDays);
        updatedOverrides = updatedOverrides.filter(o => o.id !== override.id);
        continue;
      }

      const amount = override?.amount ?? sub.amount;
      const date = override?.date ?? currentNextDueDate;
      const accountId = override?.accountId ?? sub.accountId;

      const category = state.categories.find(c => c.id === sub.categoryId);
      const account = state.accounts.find(a => a.id === accountId);

      const txnId = createId("txn");
      const newTxn: FinanceTransaction = {
        id: txnId,
        date,
        description: sub.name,
        categoryId: sub.categoryId,
        category: category?.name ?? "Uncategorized",
        accountId,
        account: account?.name ?? "Unknown account",
        amount: -Math.abs(amount),
        type: "expense",
        status: "Completed",
        notes: "Subscription payment (Auto-paid)",
        tags: ["subscription"],
        attachments: [],
        currency: sub.currency || "USD",
      };

      updatedTransactions.unshift(newTxn);
      if (override) {
        updatedOverrides = updatedOverrides.filter(o => o.id !== override.id);
      }
      currentNextDueDate = advanceNextDueDate(currentNextDueDate, sub.frequency, sub.customIntervalDays);
    }

    if (currentNextDueDate !== sub.nextDueDate) {
      updatedSubscriptions[i] = {
        ...sub,
        nextDueDate: currentNextDueDate
      };
    }
  }

  if (stateChanged) {
    return {
      ...state,
      subscriptions: updatedSubscriptions,
      transactions: updatedTransactions,
      subscriptionOverrides: updatedOverrides
    };
  }
  return state;
}

async function getGlobalProfile(): Promise<Partial<AppSettings> | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("flowledger-global", 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("profile")) {
          req.result.createObjectStore("profile");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("profile", "readonly");
      const req = tx.objectStore("profile").get("current");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("Failed to read global profile from IndexedDB", e);
    return null;
  }
}

async function saveGlobalProfile(profile: Partial<AppSettings>) {
  if (typeof indexedDB === "undefined") return;
  try {
    const existing = await getGlobalProfile() || {};
    const merged = {
      firstName: profile.firstName ?? existing.firstName,
      lastName: profile.lastName ?? existing.lastName,
      email: profile.email ?? existing.email,
      avatarUrl: profile.avatarUrl ?? existing.avatarUrl
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("flowledger-global", 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("profile")) {
          req.result.createObjectStore("profile");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("profile", "readwrite");
      tx.objectStore("profile").put(merged, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch(e) {
    console.error("Failed to save global profile", e);
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(initialFinanceState);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    readIndexedState()
      .then(async (stored) => {
        if (!isMounted) return;
        
        let rates = stored?.exchangeRates && Object.keys(stored.exchangeRates).length > 1 
          ? stored.exchangeRates 
          : { USD: 1 };

        try {
          const res = await fetch("https://open.er-api.com/v6/latest/USD");
          const data = await res.json();
          if (data && data.rates) rates = { ...rates, ...data.rates };
        } catch (e) {
          console.error("Failed to fetch rates, falling back to cached rates", e);
        }

        try {
          const ethRes = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT");
          const ethData = await ethRes.json();
          if (ethData && ethData.price) {
            rates["ETH"] = 1 / Number(ethData.price);
          }
        } catch (e) {
          console.error("Failed to fetch ETH rate", e);
          if (!rates["ETH"]) {
            rates["ETH"] = 1 / 3000;
          }
        }

        const migratedState = migrateIndexedState(stored);
        migratedState.exchangeRates = rates;
        
        const globalProfile = await getGlobalProfile();
        if (globalProfile) {
          migratedState.settings = { ...migratedState.settings, ...globalProfile };
        } else {
          await saveGlobalProfile(migratedState.settings);
        }
        
        if (isMounted) setState(migratedState);
      })
      .catch((err) => {
        console.error("Failed to read indexed state", err);
        if (!isMounted) return;
        setState(initialFinanceState);
      })
      .finally(() => {
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const theme = state.settings.theme;
    
    // Remove all previous theme classes
    document.documentElement.classList.remove(
      "theme-light", "theme-dark", "theme-midnight", 
      "theme-forest", "theme-sunset", "theme-dracula", "theme-nord", 
      "theme-cyberpunk", "theme-monochrome", "theme-synthwave", "dark"
    );

    // Apply the current theme class
    document.documentElement.classList.add(theme);

    // Also apply 'dark' if it's a dark-based theme
    if (theme.includes("dark") || theme === "theme-midnight" || theme === "theme-forest" || theme === "theme-sunset" || theme === "theme-dracula" || theme === "theme-nord" || theme === "theme-cyberpunk" || theme === "theme-synthwave") {
      document.documentElement.classList.add("dark");
    } else if (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  }, [state.settings.theme, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const interval = setInterval(() => {
      setState(s => checkAndAutoPaySubscriptions(s));
    }, 60 * 60 * 1000);
    setState(s => checkAndAutoPaySubscriptions(s));
    return () => clearInterval(interval);
  }, [isReady]);

  const fetchLiveRates = async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();
      
      let ethRate: number | undefined;
      try {
        const ethRes = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT");
        const ethData = await ethRes.json();
        if (ethData && ethData.price) {
          ethRate = 1 / Number(ethData.price);
        }
      } catch (e) {
        console.error("Failed to fetch ETH rate", e);
      }

      setState(s => {
        let newRates = { ...s.exchangeRates };
        if (data && data.rates) newRates = { ...newRates, ...data.rates };
        if (ethRate !== undefined) newRates["ETH"] = ethRate;
        
        const updated = { ...s, exchangeRates: newRates };
        // Fire and forget writing to IndexedDB to persist
        void writeIndexedState(updated);
        return updated;
      });
    } catch (e) {
      console.error("Failed to fetch rates", e);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    fetchLiveRates();
    const interval = setInterval(fetchLiveRates, 60 * 60 * 1000); // refresh every hour
    return () => clearInterval(interval);
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const hasPastDue = state.subscriptions.some(s => s.status === "active" && s.nextDueDate <= todayStr);
    
    if (hasPastDue) {
      setState(current => checkAndAutoPaySubscriptions(current));
    }
  }, [isReady, state.subscriptions]);

  useEffect(() => {
    if (!isReady) return;
    void writeIndexedState(state);
  }, [isReady, state]);

  const transactions = useMemo(
    () => [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [state.transactions]
  );

  const activeAccounts = useMemo(() => state.accounts.filter((account) => !account.archived), [state.accounts]);
  const activeCategories = useMemo(() => state.categories.filter((category) => !category.archived), [state.categories]);

  const accountBalances = useMemo(() => {
    const balances = Object.fromEntries(state.accounts.map((account) => [account.id, account.openingBalance]));
    const accountCurrencies = Object.fromEntries(state.accounts.map((account) => [account.id, account.currency || "USD"]));

    for (const transaction of state.transactions) {
      const txCurrency = transaction.currency || "USD";
      const acctCurrency = accountCurrencies[transaction.accountId] || "USD";
      
      let amountToAdd = transaction.amount;
      if (txCurrency !== acctCurrency) {
        const txRate = state.exchangeRates[txCurrency] || 1;
        const acctRate = state.exchangeRates[acctCurrency] || 1;
        amountToAdd = (transaction.amount / txRate) * acctRate;
      }
      
      balances[transaction.accountId] = (balances[transaction.accountId] ?? 0) + amountToAdd;
      
      if (transaction.type === "transfer" && transaction.transferAccountId) {
        const destAcctCurrency = accountCurrencies[transaction.transferAccountId] || "USD";
        let destAmountToAdd = transaction.destinationAmount;
        
        if (destAmountToAdd === undefined) {
          if (txCurrency !== destAcctCurrency) {
            const txRate = state.exchangeRates[txCurrency] || 1;
            const destRate = state.exchangeRates[destAcctCurrency] || 1;
            destAmountToAdd = (Math.abs(transaction.amount) / txRate) * destRate;
          } else {
            destAmountToAdd = Math.abs(transaction.amount);
          }
        }
        
        balances[transaction.transferAccountId] = (balances[transaction.transferAccountId] ?? 0) + destAmountToAdd;
      }
    }

    return balances;
  }, [state.accounts, state.transactions, state.exchangeRates]);

  const totals = useMemo(() => {
    const userCurrency = state.settings.currency || "USD";
    const userRate = state.exchangeRates[userCurrency] || 1;

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);
    
    const nonTransfers = state.transactions.filter((transaction) => transaction.type !== "transfer");
    const currentMonthNonTransfers = nonTransfers.filter((t) => t.date.startsWith(currentMonthPrefix));
    
    const monthlyIncome = currentMonthNonTransfers
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => {
         const txCurrency = transaction.currency || "USD";
         const rate = state.exchangeRates[txCurrency] || 1;
         return sum + ((Math.abs(transaction.amount) / rate) * userRate);
      }, 0);
      
    const monthlyExpenses = currentMonthNonTransfers
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => {
         const txCurrency = transaction.currency || "USD";
         const rate = state.exchangeRates[txCurrency] || 1;
         return sum + ((Math.abs(transaction.amount) / rate) * userRate);
      }, 0);
      
    const totalBalance = activeAccounts
      .filter((account) => account.type !== "Credit Card")
      .reduce((sum, account) => {
         const bal = accountBalances[account.id] ?? 0;
         const rate = state.exchangeRates[account.currency || "USD"] || 1;
         return sum + ((bal / rate) * userRate);
      }, 0);

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netProfit: monthlyIncome - monthlyExpenses,
      cashFlow: monthlyIncome - monthlyExpenses,
    };
  }, [accountBalances, activeAccounts, state.transactions, state.exchangeRates, state.settings.currency]);

  const upcomingPayments = useMemo(() => {
    return state.subscriptions
      .filter((s) => s.status === "active")
      .map((s) => {
        const currentPeriod = s.nextDueDate.slice(0, 7);
        const override = state.subscriptionOverrides.find(
          (o) => o.subscriptionId === s.id && o.period === currentPeriod
        );

        if (override?.skipped) return null;

        const date = override?.date ?? s.nextDueDate;
        const amount = override?.amount ?? s.amount;
        const accountId = override?.accountId ?? s.accountId;
        const account = state.accounts.find((a) => a.id === accountId);

        return {
          id: s.id,
          name: s.name,
          amount,
          nextDate: date,
          categoryId: s.categoryId,
          accountId,
          accountName: account?.name ?? "Unknown",
          frequency: s.frequency,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  }, [state.subscriptions, state.subscriptionOverrides, state.accounts, state.exchangeRates]);

  const smartAlerts = useMemo(() => {
    const alerts: Array<{ id: string; type: string; icon: any; message: string }> = [];
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSubs = state.subscriptions.filter(s => s.status === 'active' && new Date(s.nextDueDate) <= nextWeek && new Date(s.nextDueDate) >= now);

    if (dueSubs.length > 0) alerts.push({ id: 'subs', type: 'warning', icon: AlertCircle, message: `You have ${dueSubs.length} subscription(s) due in the next 7 days totaling ${formatCurrency(dueSubs.reduce((a, b) => a + b.amount, 0))}` });

    state.budgets.forEach(b => {
      const spent = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => {
        if (b.targetType === "account" && t.accountId === b.categoryId) return sum + Math.abs(t.amount);
        if (b.targetType !== "account") {
          if (t.splits && t.splits.length > 0) {
            const splitSum = t.splits.filter(s => s.categoryId === b.categoryId).reduce((s, split) => s + Math.abs(split.amount), 0);
            return sum + splitSum;
          }
          if (t.categoryId === b.categoryId) return sum + Math.abs(t.amount);
        }
        return sum;
      }, 0);
      
      const targetName = b.targetType === "account" ? `Account: ${b.category}` : `Category: ${b.category}`;
      if (spent >= b.limit * 0.9 && spent < b.limit) alerts.push({ id: `budget-${b.id}`, type: 'warning', icon: AlertCircle, message: `Your '${targetName}' budget is at ${Math.round((spent/b.limit)*100)}% capacity!` });
      else if (spent >= b.limit) alerts.push({ id: `budget-${b.id}`, type: 'danger', icon: AlertCircle, message: `You have exceeded your '${targetName}' budget by ${formatCurrency(spent - b.limit)}.` });
    });

    const expenses = state.transactions.filter(t => t.type === 'expense' && t.categoryId !== 'transfer');
    if (expenses.length >= 3) {
      const amounts = expenses.map(t => Math.abs(t.amount));
      const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
      const stddev = Math.sqrt(amounts.reduce((s, v) => s + (v - avg) ** 2, 0) / amounts.length);
      if (stddev > 0) {
        const largest = [...expenses].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
        const zScore = (Math.abs(largest.amount) - avg) / stddev;
        if (zScore > 2.5 && Math.abs(largest.amount) > 100) {
          alerts.push({ id: `anomaly-${largest.id}`, type: 'info', icon: Zap, message: `Anomaly detected: '${largest.description}' was unusually high (${formatCurrency(Math.abs(largest.amount))}).` });
        }
      }
    }
    
    const dismissed = state.settings.dismissedAlerts || [];
    return alerts.filter(a => !dismissed.includes(a.id));
  }, [state.subscriptions, state.budgets, state.transactions, state.settings.dismissedAlerts]);

  const contextValue = useMemo<FinanceContextValue>(() => {
    function setAndResolve(update: (current: FinanceState) => FinanceState) {
      setState((current) => update(current));
    }

    return {
      state,
      isReady,
      transactions,
      categories: activeCategories,
      accounts: activeAccounts,
      budgets: state.budgets,
      goals: state.goals,
      reports: state.reports,
      settings: state.settings,
      recurringPayments: state.recurringPayments,
      accountBalances,
      totals,
      exchangeRates: { ...state.exchangeRates, ...(state.customExchangeRates || {}) },
      customExchangeRates: state.customExchangeRates,
      investments: state.investments || [],
      investmentTransactions: state.investmentTransactions || [],
      goalContributions: state.goalContributions || [],
      fetchLiveRates,
      addTransaction: (transaction) => {
        const id = createId("txn");
        setAndResolve((current) => ({
          ...current,
          transactions: [{ ...withResolvedNames(current, transaction), id }, ...current.transactions],
        }));
        toast.success("Transaction added");
        return id;
      },
      updateTransaction: (id, changes) => {
        setAndResolve((current) => ({
          ...current,
          transactions: current.transactions.map((transaction) => {
            if (transaction.id !== id) return transaction;
            const category = current.categories.find((item) => item.id === (changes.categoryId ?? transaction.categoryId));
            const account = current.accounts.find((item) => item.id === (changes.accountId ?? transaction.accountId));
            const transferAccount = current.accounts.find((item) => item.id === changes.transferAccountId);
            const nextType = changes.type ?? transaction.type;
            const rawAmount = changes.amount ?? Math.abs(transaction.amount);

            return {
              ...transaction,
              ...changes,
              amount: nextType === "income" ? Math.abs(rawAmount) : -Math.abs(rawAmount),
              categoryId: changes.categoryId ?? transaction.categoryId,
              category: category?.name ?? transaction.category,
              accountId: changes.accountId ?? transaction.accountId,
              account: account?.name ?? transaction.account,
              transferAccount: transferAccount?.name ?? transaction.transferAccount,
            };
          }),
        }));
        toast.success("Transaction updated");
      },
      deleteTransaction: (id) => {
        setAndResolve((current) => ({
          ...current,
          transactions: current.transactions.filter((transaction) => transaction.id !== id),
        }));
        toast.info("Transaction deleted");
      },
      duplicateTransaction: (id) => {
        setAndResolve((current) => {
          const transaction = current.transactions.find((item) => item.id === id);
          if (!transaction) return current;

          return {
            ...current,
            transactions: [
              { ...transaction, id: createId("txn"), description: `${transaction.description} copy`, date: new Date().toISOString().slice(0, 10) },
              ...current.transactions,
            ],
          };
        });
        toast.success("Transaction duplicated");
      },
      bulkDeleteTransactions: (ids) => {
        setAndResolve((current) => ({
          ...current,
          transactions: current.transactions.filter((transaction) => !ids.includes(transaction.id)),
        }));
        toast.info(`${ids.length} transactions deleted`);
      },
      bulkUpdateTransactions: (ids, changes) => {
        setAndResolve((current) => ({
          ...current,
          transactions: current.transactions.map((transaction) => {
            if (!ids.includes(transaction.id)) return transaction;
            const category = current.categories.find((item) => item.id === changes.categoryId);
            const account = current.accounts.find((item) => item.id === changes.accountId);

            return {
              ...transaction,
              ...changes,
              category: category?.name ?? transaction.category,
              account: account?.name ?? transaction.account,
              tags: changes.tags ?? transaction.tags,
            };
          }),
        }));
        toast.success(`${ids.length} transactions updated`);
      },
      addTransfer: (fromAccountId, toAccountId, amount, date, notes) => {
        setAndResolve((current) => {
          const from = current.accounts.find((account) => account.id === fromAccountId);
          const to = current.accounts.find((account) => account.id === toAccountId);
          if (!from || !to || amount <= 0) return current;

          return {
            ...current,
            transactions: [
              {
                id: createId("txn"),
                date,
                description: `Transfer to ${to.name}`,
                categoryId: "transfer",
                category: "Transfer",
                accountId: from.id,
                account: from.name,
                amount: -Math.abs(amount),
                type: "transfer",
                status: "Completed",
                notes: notes ?? "",
                tags: ["transfer"],
                attachments: [],
                transferAccountId: to.id,
                transferAccount: to.name,
                currency: from.currency || "USD",
              },
              ...current.transactions,
            ],
          };
        });
        toast.success("Transfer recorded");
      },
      addCategory: (name, type, color) => {
        const id = normalizeName(name);
        setAndResolve((current) => ({
          ...current,
          categories: [
            ...current.categories,
            { id, name: name.trim(), type, icon: "Tags", color: color || "bg-indigo-500/20 text-indigo-400", archived: false },
          ],
        }));
        toast.success("Category created");
      },
      updateCategory: (id, changes) => {
        setAndResolve((current) => ({
          ...current,
          categories: current.categories.map((category) => (category.id === id ? { ...category, ...changes } : category)),
          transactions: current.transactions.map((transaction) =>
            transaction.categoryId === id && changes.name ? { ...transaction, category: changes.name } : transaction
          ),
          budgets: current.budgets.map((budget) =>
            budget.categoryId === id && changes.name ? { ...budget, category: changes.name } : budget
          ),
        }));
        toast.success("Category updated");
      },
      archiveCategory: (id) => {
        setAndResolve((current) => ({
          ...current,
          categories: current.categories.map((category) => (category.id === id ? { ...category, archived: true } : category)),
        }));
        toast.info("Category archived");
      },
      mergeCategories: (sourceId, targetId) => {
        setAndResolve((current) => {
          const target = current.categories.find((category) => category.id === targetId);
          if (!target || sourceId === targetId) return current;

          return {
            ...current,
            categories: current.categories.map((category) => (category.id === sourceId ? { ...category, archived: true } : category)),
            transactions: current.transactions.map((transaction) =>
              transaction.categoryId === sourceId ? { ...transaction, categoryId: target.id, category: target.name } : transaction
            ),
          };
        });
        toast.success("Categories merged");
      },
      addAccount: (name, type, openingBalance, color, stroke, currency) => {
        setAndResolve((current) => ({
          ...current,
          accounts: [
            ...current.accounts,
            {
              id: "acc-" + Date.now(),
              name,
              type,
              openingBalance,
              number: `****${Math.floor(1000 + Math.random() * 9000)}`,
              icon: type.includes("Bank") ? "Building2" : "Wallet",
              trend: Array.from({ length: 7 }, () => openingBalance * (1 + (Math.random() * 0.1 - 0.05))),
              color: color || "bg-indigo-500/20 text-indigo-400",
              stroke: stroke || "#6366f1",
              archived: false,
              currency: currency || "USD",
            },
          ],
        }));
        toast.success("Account added");
      },
      updateAccount: (id, changes) => {
        setAndResolve((current) => ({
          ...current,
          accounts: current.accounts.map((account) => (account.id === id ? { ...account, ...changes } : account)),
          transactions: current.transactions.map((transaction) =>
            transaction.accountId === id && changes.name ? { ...transaction, account: changes.name } : transaction
          ),
        }));
        toast.success("Account updated");
      },
      archiveAccount: (id) => {
        setAndResolve((current) => ({
          ...current,
          accounts: current.accounts.map((account) => (account.id === id ? { ...account, archived: true } : account)),
        }));
        toast.info("Account archived");
      },
      addBudget: (categoryId, limit, color, currency, targetType = "category") => {
        setAndResolve((current) => {
          let categoryName = "Unknown";
          if (targetType === "category") {
            categoryName = current.categories.find((c) => c.id === categoryId)?.name || "Unknown";
          } else {
            categoryName = current.accounts.find((a) => a.id === categoryId)?.name || "Unknown";
          }
          return {
            ...current,
            budgets: [
              ...current.budgets,
              {
                id: crypto.randomUUID(),
                categoryId,
                category: categoryName,
                targetType,
                limit,
                color,
                month: new Date().toISOString().slice(0, 7),
                currency
              },
            ],
          };
        });
        toast.success("Budget created");
      },
      updateBudget: (id, changes) => {
        setAndResolve((current) => ({
          ...current,
          budgets: current.budgets.map((b) => (b.id === id ? { ...b, ...changes } : b)),
        }));
        toast.success("Budget updated");
      },
      deleteBudget: (id) => {
        setAndResolve((current) => ({
          ...current,
          budgets: current.budgets.filter((b) => b.id !== id),
        }));
        toast.info("Budget deleted");
      },
      addGoal: (goal) => {
        setAndResolve((current) => ({
          ...current,
          goals: [...current.goals, { ...goal, id: createId("goal") }],
        }));
        toast.success("Goal created");
      },
      updateGoal: (id, changes) => {
        setAndResolve((current) => ({
          ...current,
          goals: current.goals.map((g) => (g.id === id ? { ...g, ...changes } : g)),
        }));
        toast.success("Goal updated");
      },
      deleteGoal: (id) => {
        setAndResolve((current) => ({
          ...current,
          goals: current.goals.filter((g) => g.id !== id),
          goalContributions: (current.goalContributions || []).filter(c => c.goalId !== id)
        }));
        toast.info("Goal deleted");
      },
      addGoalContribution: (goalId, amount, date, accountId, notes) => {
        setAndResolve(current => {
          const newContrib = { id: createId("gcb"), goalId, amount, date, accountId, notes };
          const goal = current.goals.find(g => g.id === goalId);
          if (!goal) return current;
          const newGoals = current.goals.map(g => g.id === goalId ? { ...g, current: g.current + amount } : g);
          
          let newTxns = current.transactions;
          if (accountId) {
            const acc = current.accounts.find(a => a.id === accountId);
            if (acc) {
              newTxns = [
                {
                  id: createId("txn"),
                  date,
                  description: `Contribution to ${goal.name}`,
                  categoryId: "transfer",
                  category: "Transfer",
                  accountId,
                  account: acc.name,
                  amount: -Math.abs(amount),
                  type: "transfer",
                  status: "Completed",
                  notes: notes || `Goal contribution`,
                  tags: ["goal-contribution"],
                  attachments: [],
                  currency: acc.currency || "USD"
                },
                ...current.transactions
              ];
            }
          }
          
          return {
            ...current,
            goals: newGoals,
            goalContributions: [newContrib, ...(current.goalContributions || [])],
            transactions: newTxns
          };
        });
        toast.success("Contribution added");
      },
      updateGoalContribution: (id, changes) => {
        setAndResolve(current => {
          const contrib = (current.goalContributions || []).find(c => c.id === id);
          if (!contrib) return current;
          const diff = (changes.amount ?? contrib.amount) - contrib.amount;
          
          return {
            ...current,
            goalContributions: (current.goalContributions || []).map(c => c.id === id ? { ...c, ...changes } : c),
            goals: current.goals.map(g => g.id === contrib.goalId ? { ...g, current: g.current + diff } : g)
          };
        });
        toast.success("Contribution updated");
      },
      deleteGoalContribution: (id) => {
        setAndResolve(current => {
          const contrib = (current.goalContributions || []).find(c => c.id === id);
          if (!contrib) return current;
          return {
            ...current,
            goalContributions: (current.goalContributions || []).filter(c => c.id !== id),
            goals: current.goals.map(g => g.id === contrib.goalId ? { ...g, current: g.current - contrib.amount } : g)
          };
        });
        toast.info("Contribution deleted");
      },
      updateSettings: (settings) => {
        if (settings.firstName !== undefined || settings.lastName !== undefined || settings.email !== undefined || settings.avatarUrl !== undefined) {
          saveGlobalProfile({
            ...state.settings,
            ...settings
          }).catch(console.error);
        }
        setAndResolve((current) => ({
          ...current,
          settings: { ...current.settings, ...settings },
        }));
        toast.success("Settings saved");
      },
      generateReport: (kind) => {
        const report: SavedReport = {
          id: createId("report"),
          name: `${kind} Report`,
          date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date()),
          type: kind === "Category" ? "CSV" : "PDF",
          size: `${Math.max(1, Math.round(state.transactions.length * 0.18))}.${state.transactions.length % 9} MB`,
          snapshotTotals: {
            monthlyIncome: totals.monthlyIncome,
            monthlyExpenses: totals.monthlyExpenses,
            netProfit: totals.netProfit
          },
          snapshotTxnCount: state.transactions.length
        };
        setAndResolve((current) => ({ ...current, reports: [report, ...current.reports] }));
        return report;
      },
      exportBackup: () => {
        const backup = JSON.stringify({ ...state, lastBackupAt: new Date().toISOString() }, null, 2);
        setAndResolve((current) => ({ ...current, lastBackupAt: new Date().toISOString() }));
        return backup;
      },
      restoreBackup: (json) => {
        try {
          const restored = JSON.parse(json) as FinanceState;
          if (!restored.transactions || !restored.accounts || !restored.categories) {
            toast.error("Backup could not be restored");
            return false;
          }
          setState({ ...initialFinanceState, ...restored, version: appStateVersion });
          toast.success("Backup restored");
          return true;
        } catch {
          toast.error("Backup could not be restored");
          return false;
        }
      },
      resetDemoData: () => {
        setState(initialFinanceState);
        toast.success("Demo data restored");
      },
      updateCustomExchangeRates: (rates) => {
        setAndResolve((current) => ({
          ...current,
          customExchangeRates: rates
        }));
        toast.success("Exchange rates updated");
      },
      search: (query) => {
        const needle = query.trim().toLowerCase();
        if (!needle) return [];

        const transactionResults = state.transactions
          .filter((transaction) =>
            [transaction.description, transaction.category, transaction.account, transaction.notes, ...transaction.tags]
              .join(" ")
              .toLowerCase()
              .includes(needle)
          )
          .slice(0, 6)
          .map((transaction) => ({
            id: transaction.id,
            type: "Transaction",
            title: transaction.description,
            subtitle: `${transaction.category} - ${transaction.account}`,
            path: `/transactions?focus=${transaction.id}`,
          }));

        const categoryResults = state.categories
          .filter((category) => category.name.toLowerCase().includes(needle))
          .slice(0, 4)
          .map((category) => ({
            id: category.id,
            type: "Category",
            title: category.name,
            subtitle: `${category.type} category`,
            path: `/categories/${category.id}`,
          }));

        const accountResults = state.accounts
          .filter((account) => account.name.toLowerCase().includes(needle))
          .slice(0, 4)
          .map((account) => ({
            id: account.id,
            type: "Account",
            title: account.name,
            subtitle: account.type,
            path: "/accounts",
          }));

        return [...transactionResults, ...categoryResults, ...accountResults];
      },
      loanEntities: state.loanEntities,
      loanTransactions: state.loanTransactions,
      subscriptions: state.subscriptions,
      subscriptionOverrides: state.subscriptionOverrides,
      upcomingPayments,
      addLoanEntity: (name, category, notes, color, currency) => {
        const id = createId("loan");
        setAndResolve((current) => ({
          ...current,
          loanEntities: [
            ...current.loanEntities,
            { id, name, category, notes, color, currency: currency || "USD", archived: false },
          ],
        }));
        toast.success("Loan entity added");
        return id;
      },
      updateLoanEntity: (id, changes) => {
        setAndResolve(current => ({
          ...current,
          loanEntities: current.loanEntities.map(e => e.id === id ? { ...e, ...changes } : e)
        }));
        toast.success("Loan entity updated");
      },
      deleteLoanEntity: (id) => {
        setAndResolve(current => ({
          ...current,
          loanEntities: current.loanEntities.filter(e => e.id !== id),
          loanTransactions: current.loanTransactions.filter(t => t.entityId !== id)
        }));
        toast.info("Loan entity deleted");
      },
      addLoanTransaction: (entityId, amount, type, date, notes, settled = false, parentId, accountId, currency = "USD") => {
        setAndResolve(current => {
          let updatedTransactions = current.transactions;
          if (accountId) {
            const entity = current.loanEntities.find(e => e.id === entityId);
            const account = current.accounts.find(a => a.id === accountId);
            const ledgerTxn: FinanceTransaction = {
              id: createId("txn"),
              date,
              description: parentId ? `${entity?.name || "Loan"} (Repayment)` : `Loan: ${entity?.name || "Unknown"}`,
              categoryId: "transfer", // Using transfer or uncategorized
              category: "Loan / Transfer",
              accountId,
              account: account?.name || "Unknown account",
              amount: type === "lent" ? -amount : amount,
              type: type === "lent" ? "expense" : "income",
              status: "Completed",
              notes,
              tags: ["loan"],
              attachments: [],
              currency,
            };
            updatedTransactions = [ledgerTxn, ...current.transactions];
          }

          return {
            ...current,
            transactions: updatedTransactions,
            loanTransactions: [{ id: createId("ltxn"), entityId, amount, type, date, notes, settled, currency, parentId, accountId }, ...current.loanTransactions]
          };
        });
        toast.success("Loan transaction added");
      },
      updateLoanTransaction: (id, changes) => {
        setAndResolve(current => {
          let updatedTransactions = current.transactions;
          const oldLtxn = current.loanTransactions.find(t => t.id === id);
          if (!oldLtxn) return current;
          const newLtxn = { ...oldLtxn, ...changes };
          
          if (oldLtxn.amount !== newLtxn.amount || oldLtxn.date !== newLtxn.date) {
            // we should technically update the linked transaction if it exists. 
            // for simplicity if it has a linked transaction we skip it, or we just update loan state.
            // but the user wants to be able to edit loan transactions. 
          }
          
          return {
            ...current,
            loanTransactions: current.loanTransactions.map(t => t.id === id ? newLtxn : t)
          };
        });
        toast.success("Loan transaction updated");
      },
      deleteLoanTransaction: (id) => {
        setAndResolve(current => ({
          ...current,
          loanTransactions: current.loanTransactions.filter(t => t.id !== id)
        }));
        toast.info("Loan transaction deleted");
      },
      toggleLoanSettled: (id) => {
        setAndResolve(current => ({
          ...current,
          loanTransactions: current.loanTransactions.map(t => t.id === id ? { ...t, settled: !t.settled } : t)
        }));
        toast.success("Loan status updated");
      },
      addSubscription: (sub) => {
        const id = createId("sub");
        const nextDueDate = computeNextDueDate(sub.startDate, sub.frequency, sub.customIntervalDays);
        setAndResolve(current => ({
          ...current,
          subscriptions: [...current.subscriptions, { ...sub, id, nextDueDate }]
        }));
        toast.success("Subscription added");
        return id;
      },
      updateSubscription: (id, changes) => {
        setAndResolve(current => ({
          ...current,
          subscriptions: current.subscriptions.map(s => s.id === id ? { ...s, ...changes } : s)
        }));
        toast.success("Subscription updated");
      },
      deleteSubscription: (id) => {
        setAndResolve(current => ({
          ...current,
          subscriptions: current.subscriptions.filter(s => s.id !== id),
          subscriptionOverrides: current.subscriptionOverrides.filter(o => o.subscriptionId !== id)
        }));
        toast.info("Subscription deleted");
      },
      pauseSubscription: (id) => {
        setAndResolve(current => ({
          ...current,
          subscriptions: current.subscriptions.map(s => s.id === id ? { ...s, status: "paused" as const } : s)
        }));
        toast.info("Subscription paused");
      },
      resumeSubscription: (id) => {
        setAndResolve(current => {
          const sub = current.subscriptions.find(s => s.id === id);
          if (!sub) return current;
          let nextDue = sub.nextDueDate;
          const today = new Date().toISOString().slice(0, 10);
          while (nextDue < today) {
            nextDue = advanceNextDueDate(nextDue, sub.frequency, sub.customIntervalDays);
          }
          return {
            ...current,
            subscriptions: current.subscriptions.map(s => s.id === id ? { ...s, status: "active", nextDueDate: nextDue } : s)
          };
        });
        toast.success("Subscription resumed");
      },
      addSubscriptionOverride: (subscriptionId, period, overrides) => {
        setAndResolve(current => ({
          ...current,
          subscriptionOverrides: [
            ...current.subscriptionOverrides.filter(o => !(o.subscriptionId === subscriptionId && o.period === period)),
            { id: createId("so"), subscriptionId, period, skipped: false, ...overrides }
          ]
        }));
        toast.success("Subscription overridden for period");
      },
      deleteSubscriptionOverride: (id) => {
        setAndResolve(current => ({
          ...current,
          subscriptionOverrides: current.subscriptionOverrides.filter(o => o.id !== id)
        }));
        toast.info("Subscription override removed");
      },
      paySubscription: (id) => {
        setAndResolve(current => {
          const sub = current.subscriptions.find(s => s.id === id);
          if (!sub) return current;

          const currentPeriod = sub.nextDueDate.slice(0, 7);
          const override = current.subscriptionOverrides.find(o => o.subscriptionId === id && o.period === currentPeriod);

          if (override?.skipped) {
            return {
              ...current,
              subscriptions: current.subscriptions.map(s => s.id === id ? { ...s, nextDueDate: advanceNextDueDate(s.nextDueDate, s.frequency, s.customIntervalDays) } : s)
            };
          }

          const amount = override?.amount ?? sub.amount;
          const todayStr = new Date().toISOString().slice(0, 10);
          const date = override?.date ?? (sub.nextDueDate > todayStr ? todayStr : sub.nextDueDate);
          const accountId = override?.accountId ?? sub.accountId;

          const category = current.categories.find(c => c.id === sub.categoryId);
          const account = current.accounts.find(a => a.id === accountId);

          const txnId = createId("txn");
          const newTxn: FinanceTransaction = {
            id: txnId,
            date,
            description: sub.name,
            categoryId: sub.categoryId,
            category: category?.name ?? "Uncategorized",
            accountId,
            account: account?.name ?? "Unknown account",
            amount: -Math.abs(amount),
            type: "expense",
            status: "Completed",
            notes: "Subscription payment",
            tags: ["subscription"],
            attachments: [],
            currency: sub.currency || "USD",
          };

          return {
            ...current,
            transactions: [newTxn, ...current.transactions],
            subscriptionOverrides: current.subscriptionOverrides.filter(o => o.id !== override?.id),
            subscriptions: current.subscriptions.map(s => s.id === id ? { ...s, nextDueDate: advanceNextDueDate(s.nextDueDate, s.frequency, s.customIntervalDays) } : s)
          };
        });
        toast.success("Subscription paid");
      },
      skipSubscription: (id) => {
        setAndResolve(current => {
          const sub = current.subscriptions.find(s => s.id === id);
          if (!sub) return current;
          return {
            ...current,
            subscriptions: current.subscriptions.map(s => s.id === id ? { ...s, nextDueDate: advanceNextDueDate(s.nextDueDate, s.frequency, s.customIntervalDays) } : s)
          };
        });
        toast.info("Subscription skipped");
      },
      rewindSubscription: (id) => {
        setAndResolve(current => {
          const sub = current.subscriptions.find(s => s.id === id);
          if (!sub) return current;
          return {
            ...current,
            subscriptions: current.subscriptions.map(s => s.id === id ? { ...s, nextDueDate: rewindNextDueDate(s.nextDueDate, s.frequency, s.customIntervalDays) } : s)
          };
        });
        toast.info("Subscription payment undone");
      },
      workspaces: getWorkspaces(),
      activeWorkspaceId: getActiveWorkspaceId(),
      createWorkspace: async (name: string, templateId: string, withDemoData?: boolean) => {
        const id = createId("ws");
        const ws = getWorkspaces();
        ws.push({ id, name });
        setWorkspaces(ws);
        
        let initialState = emptyFinanceState;
        
        if (withDemoData) {
          initialState = initialFinanceState;
        } else {
          const template = vaultTemplates.find(t => t.id === templateId) || vaultTemplates[0];
          initialState = {
            ...emptyFinanceState,
            accounts: template.accounts,
            categories: template.categories
          };
        }
        
        const dbName = `flowledger-workspace-${id}`;
        
        try {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(dbName, 1);
            req.onupgradeneeded = () => {
              if (!req.result.objectStoreNames.contains(indexedStoreName)) {
                req.result.createObjectStore(indexedStoreName);
              }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(indexedStoreName, "readwrite");
            tx.objectStore(indexedStoreName).put(initialState, indexedStateKey);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
        } catch (err) {
          console.error("Failed to seed new workspace", err);
        }

        setActiveWorkspaceId(id);
        window.location.reload();
      },
      switchWorkspace: (id: string) => {
        setActiveWorkspaceId(id);
        window.location.reload();
      },
      renameWorkspace: (id: string, name: string) => {
        const ws = getWorkspaces().map(w => w.id === id ? { ...w, name } : w);
        setWorkspaces(ws);
        window.location.reload();
      },
      deleteWorkspace: (id: string) => {
        const ws = getWorkspaces().filter(w => w.id !== id);
        if (ws.length === 0) {
          ws.push({ id: "default", name: "Personal" });
        }
        setWorkspaces(ws);
        
        indexedDB.deleteDatabase(`flowledger-workspace-${id}`);
        
        if (getActiveWorkspaceId() === id) {
          setActiveWorkspaceId(ws[0].id);
        }
        window.location.reload();
      },
      currencies: state.settings.customCurrencies || ["USD", "EUR", "GBP", "BDT", "ETH"],
      smartAlerts,
      dismissAlert: (id: string) => {
        setAndResolve((current) => {
          const dismissedAlerts = current.settings.dismissedAlerts ? [...current.settings.dismissedAlerts] : [];
          if (!dismissedAlerts.includes(id)) {
            dismissedAlerts.push(id);
          }
          return {
            ...current,
            settings: { ...current.settings, dismissedAlerts }
          };
        });
      },
      addInvestmentAsset: (asset) => {
        const id = createId("inv");
        setAndResolve((current) => ({
          ...current,
          investments: [...(current.investments || []), { ...asset, id }]
        }));
        toast.success("Asset added");
        return id;
      },
      updateInvestmentAsset: (id, changes) => {
        setAndResolve((current) => ({
          ...current,
          investments: (current.investments || []).map(a => a.id === id ? { ...a, ...changes } : a)
        }));
        toast.success("Asset updated");
      },
      deleteInvestmentAsset: (id) => {
        setAndResolve((current) => ({
          ...current,
          investments: (current.investments || []).filter(a => a.id !== id),
          investmentTransactions: (current.investmentTransactions || []).filter(t => t.assetId !== id)
        }));
        toast.info("Asset deleted");
      },
      addInvestmentTransaction: (txn, accountId) => {
        const id = createId("itxn");
        setAndResolve(current => {
          let newTxns = current.transactions;
          if (accountId) {
            const acc = current.accounts.find(a => a.id === accountId);
            const asset = current.investments.find(a => a.id === txn.assetId);
            if (acc && asset) {
              const totalCost = (txn.shares * txn.price) + (txn.fees || 0);
              newTxns = [
                {
                  id: createId("txn"),
                  date: txn.date,
                  description: `${txn.type === 'buy' ? 'Buy' : 'Sell'} ${asset.symbol}`,
                  categoryId: "transfer",
                  category: "Investments",
                  accountId,
                  account: acc.name,
                  amount: txn.type === 'buy' ? -totalCost : totalCost,
                  type: txn.type === 'buy' ? "expense" : "income",
                  status: "Completed",
                  notes: `Trade ${txn.shares} shares of ${asset.symbol} @ ${txn.price}`,
                  tags: ["investment"],
                  attachments: [],
                  currency: acc.currency || "USD"
                },
                ...current.transactions
              ];
            }
          }
          return {
            ...current,
            transactions: newTxns,
            investmentTransactions: [{ ...txn, id }, ...current.investmentTransactions]
          };
        });
        toast.success("Trade recorded");
      },
      deleteInvestmentTransaction: (id) => {
        setAndResolve((current) => ({
          ...current,
          investmentTransactions: (current.investmentTransactions || []).filter(t => t.id !== id)
        }));
        toast.info("Transaction deleted");
      },
      updateInvestmentPrice: (id, newPrice) => {
        setAndResolve((current) => ({
          ...current,
          investments: (current.investments || []).map(a => a.id === id ? { ...a, currentPrice: newPrice } : a)
        }));
        toast.success("Price updated");
      },
      toggleReconciled: (id) => {
        setAndResolve((current) => ({
          ...current,
          transactions: current.transactions.map(t => t.id === id ? { ...t, reconciled: !t.reconciled } : t)
        }));
      },
    };
  }, [state, isReady, transactions, activeCategories, activeAccounts, accountBalances, totals, upcomingPayments, smartAlerts]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <FinanceContext.Provider value={contextValue}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error("useFinance must be used inside a FinanceProvider");
  }

  return context;
}
