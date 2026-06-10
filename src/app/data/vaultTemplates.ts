import type { AccountRecord, CategoryRecord } from "./financeStore";

export interface VaultTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  accounts: AccountRecord[];
  categories: CategoryRecord[];
}

const createCat = (id: string, name: string, type: "income" | "expense" | "both", icon: string, color: string): CategoryRecord => ({
  id, name, type, icon, color, archived: false
});

const createAcc = (id: string, name: string, type: string, icon: string, colorStr: string, stroke: string): AccountRecord => ({
  id, name, type, openingBalance: 0, number: "****", icon, trend: [], color: colorStr, stroke, archived: false, currency: "USD"
});

export const vaultTemplates: VaultTemplate[] = [
  {
    id: "default",
    name: "Default Setup",
    description: "A balanced template with standard categories and bank accounts. Great for getting started.",
    icon: "LayoutTemplate",
    accounts: [
      createAcc("acc-checking", "Checking Account", "Checking", "Landmark", "bg-indigo-500/10", "#6366f1"),
      createAcc("acc-savings", "Savings Account", "Savings", "PiggyBank", "bg-blue-500/10", "#3b82f6"),
      createAcc("acc-cash", "Cash Wallet", "Cash", "Wallet", "bg-emerald-500/10", "#10b981"),
    ],
    categories: [
      createCat("cat-personal", "Personal Expenses", "expense", "User", "bg-blue-500/20 text-blue-400"),
      createCat("cat-business", "Business Expenses", "expense", "Receipt", "bg-orange-500/20 text-orange-400"),
      createCat("cat-taxes", "Taxes", "expense", "Landmark", "bg-rose-500/20 text-rose-400"),
      createCat("cat-savings", "Savings", "expense", "PiggyBank", "bg-teal-500/20 text-teal-400"),
      createCat("cat-groceries", "Groceries", "expense", "ShoppingCart", "bg-sky-500/20 text-sky-400"),
      createCat("cat-travel", "Travel", "expense", "Plane", "bg-pink-500/20 text-pink-400"),
      createCat("cat-dining", "Dining Out", "expense", "Utensils", "bg-amber-500/20 text-amber-400"),
      createCat("cat-income", "Income", "income", "Zap", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-transfer", "Transfer", "both", "ArrowLeftRight", "bg-cyan-500/20 text-cyan-400")
    ]
  },
  {
    id: "blank",
    name: "Blank Canvas",
    description: "Start completely from scratch. 0 accounts, 0 categories.",
    icon: "FileQuestion",
    accounts: [],
    categories: []
  },
  {
    id: "family",
    name: "Family Finance",
    description: "Designed for households managing joint expenses, groceries, and kids.",
    icon: "Users",
    accounts: [
      createAcc("acc-joint", "Joint Checking", "Checking", "Users", "bg-blue-500/10", "#3b82f6"),
      createAcc("acc-emergency", "Emergency Fund", "Savings", "PiggyBank", "bg-emerald-500/10", "#10b981"),
    ],
    categories: [
      createCat("cat-groceries", "Groceries", "expense", "ShoppingCart", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-housing", "Housing & Rent", "expense", "Home", "bg-blue-500/20 text-blue-400"),
      createCat("cat-utilities", "Utilities", "expense", "Zap", "bg-amber-500/20 text-amber-400"),
      createCat("cat-childcare", "Childcare & Education", "expense", "GraduationCap", "bg-purple-500/20 text-purple-400"),
      createCat("cat-health", "Health & Medical", "expense", "Heart", "bg-rose-500/20 text-rose-400"),
      createCat("cat-auto", "Auto & Transport", "expense", "Car", "bg-zinc-500/20 text-zinc-400"),
      createCat("cat-salary", "Salary", "income", "DollarSign", "bg-emerald-500/20 text-emerald-400")
    ]
  },
  {
    id: "freelancer",
    name: "Freelancer",
    description: "Track client invoices, software subscriptions, and tax deductions easily.",
    icon: "Briefcase",
    accounts: [
      createAcc("acc-biz-check", "Business Checking", "Checking", "Briefcase", "bg-violet-500/10", "#8b5cf6"),
      createAcc("acc-tax-save", "Tax Savings", "Savings", "Landmark", "bg-rose-500/10", "#f43f5e"),
    ],
    categories: [
      createCat("cat-invoices", "Client Invoices", "income", "FileText", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-software", "Software & SaaS", "expense", "Monitor", "bg-blue-500/20 text-blue-400"),
      createCat("cat-office", "Office Supplies", "expense", "Paperclip", "bg-zinc-500/20 text-zinc-400"),
      createCat("cat-marketing", "Marketing", "expense", "Megaphone", "bg-amber-500/20 text-amber-400"),
      createCat("cat-taxes-out", "Taxes", "expense", "Landmark", "bg-rose-500/20 text-rose-400")
    ]
  },
  {
    id: "student",
    name: "Student",
    description: "Manage tuition, books, dining hall food, and that part-time job.",
    icon: "GraduationCap",
    accounts: [
      createAcc("acc-student", "Student Checking", "Checking", "GraduationCap", "bg-sky-500/10", "#0ea5e9"),
      createAcc("acc-loan", "Student Loan", "Loan", "Landmark", "bg-rose-500/10", "#f43f5e"),
    ],
    categories: [
      createCat("cat-tuition", "Tuition", "expense", "GraduationCap", "bg-rose-500/20 text-rose-400"),
      createCat("cat-books", "Books & Supplies", "expense", "Book", "bg-amber-500/20 text-amber-400"),
      createCat("cat-dining-hall", "Dining Hall", "expense", "Utensils", "bg-orange-500/20 text-orange-400"),
      createCat("cat-financial-aid", "Financial Aid", "income", "Landmark", "bg-emerald-500/20 text-emerald-400")
    ]
  },
  {
    id: "realestate",
    name: "Real Estate",
    description: "Track rental income, property management fees, and mortgages.",
    icon: "Building",
    accounts: [
      createAcc("acc-operating", "Operating Account", "Checking", "Building", "bg-blue-500/10", "#3b82f6"),
      createAcc("acc-escrow", "Security Escrow", "Savings", "Lock", "bg-zinc-500/10", "#71717a"),
    ],
    categories: [
      createCat("cat-rent", "Rental Income", "income", "Home", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-maintenance", "Maintenance", "expense", "Wrench", "bg-amber-500/20 text-amber-400"),
      createCat("cat-mortgage", "Mortgage Interest", "expense", "Percent", "bg-rose-500/20 text-rose-400"),
      createCat("cat-property-tax", "Property Tax", "expense", "Landmark", "bg-rose-500/20 text-rose-400")
    ]
  },
  {
    id: "dink",
    name: "DINK",
    description: "Double income, no kids. Focus on fine dining, luxury travel, and joint savings.",
    icon: "GlassWater",
    accounts: [
      createAcc("acc-joint-check", "Joint Checking", "Checking", "Users", "bg-indigo-500/10", "#6366f1"),
      createAcc("acc-hysa", "High-Yield Savings", "Savings", "TrendingUp", "bg-emerald-500/10", "#10b981"),
    ],
    categories: [
      createCat("cat-salary1", "Partner A Salary", "income", "DollarSign", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-salary2", "Partner B Salary", "income", "DollarSign", "bg-teal-500/20 text-teal-400"),
      createCat("cat-fine-dining", "Fine Dining", "expense", "Utensils", "bg-rose-500/20 text-rose-400"),
      createCat("cat-luxury-travel", "Luxury Travel", "expense", "Plane", "bg-sky-500/20 text-sky-400"),
      createCat("cat-pets", "Pet Care", "expense", "Dog", "bg-amber-500/20 text-amber-400")
    ]
  },
  {
    id: "fire",
    name: "FIRE",
    description: "Financial Independence, Retire Early. Track your high-yield savings and frugal living.",
    icon: "Flame",
    accounts: [
      createAcc("acc-brokerage", "Brokerage", "Investment", "TrendingUp", "bg-emerald-500/10", "#10b981"),
      createAcc("acc-hysa-fire", "HYSA", "Savings", "PiggyBank", "bg-blue-500/10", "#3b82f6"),
    ],
    categories: [
      createCat("cat-index-funds", "Index Funds", "expense", "TrendingUp", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-dividends", "Dividends", "income", "Percent", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-frugal", "Frugal Groceries", "expense", "ShoppingCart", "bg-sky-500/20 text-sky-400")
    ]
  },
  {
    id: "creator",
    name: "Content Creator",
    description: "Manage AdSense, brand deals, and your expensive camera gear.",
    icon: "Camera",
    accounts: [
      createAcc("acc-paypal", "PayPal / Stripe", "Wallet", "CreditCard", "bg-blue-500/10", "#3b82f6"),
      createAcc("acc-biz-creator", "Business Checking", "Checking", "Briefcase", "bg-indigo-500/10", "#6366f1"),
    ],
    categories: [
      createCat("cat-adsense", "AdSense Income", "income", "Youtube", "bg-rose-500/20 text-rose-400"),
      createCat("cat-brand-deals", "Brand Deals", "income", "Handshake", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-gear", "Camera & Gear", "expense", "Camera", "bg-zinc-500/20 text-zinc-400"),
      createCat("cat-software-creator", "Editing Software", "expense", "Monitor", "bg-violet-500/20 text-violet-400")
    ]
  },
  {
    id: "nomad",
    name: "Digital Nomad",
    description: "Track AirBnb costs, flights, co-working spaces, and foreign exchange fees.",
    icon: "Globe",
    accounts: [
      createAcc("acc-travel-card", "Global Travel Card", "Credit Card", "Globe", "bg-sky-500/10", "#0ea5e9"),
      createAcc("acc-local-cash", "Local Cash", "Cash", "Wallet", "bg-emerald-500/10", "#10b981"),
    ],
    categories: [
      createCat("cat-airbnb", "Accommodation", "expense", "Home", "bg-rose-500/20 text-rose-400"),
      createCat("cat-flights", "Flights", "expense", "Plane", "bg-sky-500/20 text-sky-400"),
      createCat("cat-coworking", "Co-working", "expense", "Laptop", "bg-violet-500/20 text-violet-400"),
      createCat("cat-fx", "FX Fees", "expense", "Percent", "bg-amber-500/20 text-amber-400")
    ]
  },
  {
    id: "crypto",
    name: "Crypto Bro",
    description: "Track NFT purchases, gas fees, and staking yields.",
    icon: "Bitcoin",
    accounts: [
      createAcc("acc-coinbase", "Coinbase", "Exchange", "CircleDollarSign", "bg-blue-500/10", "#3b82f6"),
      createAcc("acc-phantom", "Phantom Wallet", "Wallet", "Ghost", "bg-purple-500/10", "#a855f7"),
      createAcc("acc-cold", "Cold Storage", "Wallet", "HardDrive", "bg-zinc-500/10", "#71717a"),
    ],
    categories: [
      createCat("cat-trading", "Trading Profit", "income", "TrendingUp", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-gas", "Gas Fees", "expense", "Fuel", "bg-amber-500/20 text-amber-400"),
      createCat("cat-nft", "NFT Purchases", "expense", "Image", "bg-rose-500/20 text-rose-400"),
      createCat("cat-staking", "Staking Yield", "income", "Percent", "bg-emerald-500/20 text-emerald-400")
    ]
  },
  {
    id: "gamer",
    name: "Gamer",
    description: "Manage your Steam sales, microtransactions, and hardware upgrades.",
    icon: "Gamepad2",
    accounts: [
      createAcc("acc-check-gamer", "Checking", "Checking", "Landmark", "bg-indigo-500/10", "#6366f1"),
      createAcc("acc-paypal-gamer", "PayPal", "Wallet", "CreditCard", "bg-blue-500/10", "#3b82f6"),
    ],
    categories: [
      createCat("cat-steam", "Steam Sales", "expense", "Gamepad2", "bg-blue-500/20 text-blue-400"),
      createCat("cat-micro", "Microtransactions", "expense", "Coins", "bg-amber-500/20 text-amber-400"),
      createCat("cat-hardware", "Hardware Upgrades", "expense", "Monitor", "bg-purple-500/20 text-purple-400"),
      createCat("cat-salary-gamer", "Salary", "income", "DollarSign", "bg-emerald-500/20 text-emerald-400")
    ]
  },
  {
    id: "lifeless",
    name: "I'm just lifeless",
    description: "You have no life. Only existential dread and 3 AM Uber Eats.",
    icon: "Ghost",
    accounts: [
      createAcc("acc-mattress", "Mattress Stash", "Cash", "Bed", "bg-zinc-500/10", "#71717a"),
      createAcc("acc-moms-card", "Mom's Credit Card", "Credit Card", "CreditCard", "bg-rose-500/10", "#f43f5e"),
      createAcc("acc-smashed-piggy", "Smashed Piggy Bank", "Cash", "PiggyBank", "bg-amber-500/10", "#f59e0b"),
    ],
    categories: [
      createCat("cat-dread", "Existential Dread Coping", "expense", "Brain", "bg-purple-500/20 text-purple-400"),
      createCat("cat-uber", "Uber Eats at 3 AM", "expense", "Pizza", "bg-rose-500/20 text-rose-400"),
      createCat("cat-gym", "Unused Gym Memberships", "expense", "Dumbbell", "bg-zinc-500/20 text-zinc-400"),
      createCat("cat-emotional", "Emotional Support Purchases", "expense", "Heart", "bg-pink-500/20 text-pink-400"),
      createCat("cat-tiktok", "Impulse Buys from TikTok", "expense", "Smartphone", "bg-sky-500/20 text-sky-400"),
      createCat("cat-ebay", "Selling old junk on eBay", "income", "Package", "bg-emerald-500/20 text-emerald-400"),
      createCat("cat-couch", "Finding coins in the couch", "income", "Coins", "bg-amber-500/20 text-amber-400"),
    ]
  }
];
