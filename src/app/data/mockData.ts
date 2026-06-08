export const mockData = {
  kpi: {
    totalBalance: 124500.50,
    monthlyIncome: 32450.00,
    monthlyExpenses: 14200.00,
    netProfit: 18250.00,
    cashFlow: 8400.00,
    trends: {
      balance: "+4.2%",
      income: "+12.5%",
      expenses: "-2.4%",
      profit: "+18.1%",
      cashFlow: "+5.2%"
    }
  },
  cashFlow: [
    { name: 'Jan', income: 28000, expense: 15000 },
    { name: 'Feb', income: 30000, expense: 14500 },
    { name: 'Mar', income: 25000, expense: 16000 },
    { name: 'Apr', income: 35000, expense: 14000 },
    { name: 'May', income: 32000, expense: 15500 },
    { name: 'Jun', income: 40000, expense: 13000 },
    { name: 'Jul', income: 38000, expense: 14200 },
  ],
  categoryPerformance: [
    { id: 1, name: 'Personal Expenses', income: 0, expense: 4200, icon: 'Home', color: 'orange', trend: '+5%' },
    { id: 2, name: 'Freelance Income', income: 12500, expense: 1200, icon: 'Briefcase', color: 'emerald', trend: '+12%' },
    { id: 3, name: 'V20 Studio Finance', income: 25500, expense: 8800, icon: 'Layout', color: 'purple', trend: '+8%' },
  ],
  recentTransactions: [
    { id: '1', date: '2026-06-07', description: 'Stripe Payout - V20 Studio', category: 'Agency', account: 'Business Bank', amount: 4500.00, type: 'income' },
    { id: '2', date: '2026-06-06', description: 'AWS Hosting', category: 'Software', account: 'Credit Card', amount: -245.50, type: 'expense' },
    { id: '3', date: '2026-06-05', description: 'Upwork Transfer', category: 'Freelance', account: 'Business Bank', amount: 1250.00, type: 'income' },
    { id: '4', date: '2026-06-04', description: 'Whole Foods Market', category: 'Groceries', account: 'Personal Bank', amount: -185.20, type: 'expense' },
    { id: '5', date: '2026-06-03', description: 'Figma Subscription', category: 'Software', account: 'Credit Card', amount: -15.00, type: 'expense' },
    { id: '6', date: '2026-06-02', description: 'Client Retainer - Acme Corp', category: 'Agency', account: 'Business Bank', amount: 5000.00, type: 'income' },
  ],
  accounts: [
    { id: '1', name: 'Chase Business Checking', type: 'Bank Account', balance: 45200.00, icon: 'Building2' },
    { id: '2', name: 'Mercury Startup', type: 'Bank Account', balance: 68400.50, icon: 'Wallet' },
    { id: '3', name: 'Amex Platinum', type: 'Credit Card', balance: -4250.00, icon: 'CreditCard' },
    { id: '4', name: 'Wealthfront Savings', type: 'Savings', balance: 15150.00, icon: 'PiggyBank' },
  ],
  expenseBreakdown: [
    { name: 'Software', value: 35 },
    { name: 'Contractors', value: 40 },
    { name: 'Marketing', value: 15 },
    { name: 'Office', value: 10 },
  ]
};
