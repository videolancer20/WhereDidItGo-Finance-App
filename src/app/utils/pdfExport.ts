import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type FinanceTransaction, type BudgetRecord } from "../data/financeStore";
import { formatCurrency } from "../utils";

interface ExportData {
  title: string;
  transactions: FinanceTransaction[];
  budgets?: BudgetRecord[];
  totals?: {
    monthlyIncome: number;
    monthlyExpenses: number;
    netProfit: number;
  };
  dateRange?: string;
}

function createBasePdf(title: string, dateRange?: string) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("WhereDidItGo", 14, 22);
  
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(title, 14, 32);

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  const dateStr = `Generated: ${new Date().toLocaleDateString()}`;
  doc.text(dateStr, 14, 40);
  
  if (dateRange) {
    doc.text(`Period: ${dateRange}`, 14, 46);
  }

  return doc;
}

export function generateStandardReport(data: ExportData) {
  const doc = createBasePdf(data.title, data.dateRange);
  let startY = data.dateRange ? 55 : 50;

  if (data.totals) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Summary", 14, startY);
    
    autoTable(doc, {
      startY: startY + 5,
      head: [["Metric", "Amount"]],
      body: [
        ["Total Income", formatCurrency(data.totals.monthlyIncome)],
        ["Total Expenses", formatCurrency(data.totals.monthlyExpenses)],
        ["Net Profit", formatCurrency(data.totals.netProfit)],
      ],
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    });
    
    startY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Top Transactions
  const sortedTxns = [...data.transactions]
    .filter(t => t.type === "expense")
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 15);

  if (sortedTxns.length > 0) {
    doc.setFontSize(12);
    doc.text("Largest Expenses", 14, startY);
    
    autoTable(doc, {
      startY: startY + 5,
      head: [["Date", "Description", "Category", "Amount"]],
      body: sortedTxns.map(t => [
        t.date,
        t.description,
        t.category,
        formatCurrency(Math.abs(t.amount))
      ]),
      theme: "striped",
      headStyles: { fillColor: [244, 63, 94] }, // rose-500
    });
  }

  doc.save(`${data.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

export function generateCashFlowReport(data: ExportData) {
  const doc = createBasePdf("Cash Flow Report", data.dateRange);
  let startY = 55;

  const incomeTxns = data.transactions.filter(t => t.type === "income");
  const expenseTxns = data.transactions.filter(t => t.type === "expense");

  doc.setFontSize(12);
  doc.text("Income Transactions", 14, startY);
  
  autoTable(doc, {
    startY: startY + 5,
    head: [["Date", "Description", "Category", "Amount"]],
    body: incomeTxns.map(t => [t.date, t.description, t.category, formatCurrency(t.amount)]),
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] }, // emerald-500
  });

  startY = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.text("Expense Transactions", 14, startY);
  
  autoTable(doc, {
    startY: startY + 5,
    head: [["Date", "Description", "Category", "Amount"]],
    body: expenseTxns.map(t => [t.date, t.description, t.category, formatCurrency(Math.abs(t.amount))]),
    theme: "striped",
    headStyles: { fillColor: [244, 63, 94] }, // rose-500
  });

  doc.save(`cash_flow_report.pdf`);
}

export function generateAnalyticsExport(data: ExportData) {
  const doc = createBasePdf("Analytics Insights Export", data.dateRange);
  let startY = 55;

  // 1. Spend by Category
  const spendByCategory = data.transactions
    .filter(t => t.type === "expense" && t.categoryId !== "transfer")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const categoryRows = Object.entries(spendByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => [cat, formatCurrency(amount)]);

  if (categoryRows.length > 0) {
    doc.setFontSize(12);
    doc.text("Spend by Category", 14, startY);
    autoTable(doc, {
      startY: startY + 5,
      head: [["Category", "Total Spent"]],
      body: categoryRows,
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] }, // indigo-500
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 2. Budget Utilization
  if (data.budgets && data.budgets.length > 0) {
    const budgetRows = data.budgets.map(b => {
      const spent = data.transactions
        .filter(t => t.type === "expense")
        .filter(t => {
          if (b.targetType === "account") return t.accountId === b.categoryId;
          return t.categoryId === b.categoryId;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const status = spent > b.limit ? "Over Budget" : "Under Budget";
      const targetName = b.targetType === "account" ? `Account: ${b.category}` : `Category: ${b.category}`;
      
      return [targetName, formatCurrency(b.limit), formatCurrency(spent), status];
    });

    doc.setFontSize(12);
    doc.text("Budget Utilization", 14, startY);
    autoTable(doc, {
      startY: startY + 5,
      head: [["Target", "Limit", "Actual Spent", "Status"]],
      body: budgetRows,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129] }, // emerald-500
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'Over Budget') {
            data.cell.styles.textColor = [220, 38, 38]; // red-600
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
  }

  doc.save(`analytics_export.pdf`);
}
