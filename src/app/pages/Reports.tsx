import { useMemo, useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileBarChart,
} from "lucide-react";
import { downloadTextFile, exportTransactionsCsv, type SavedReport, useFinance } from "../data/financeStore";
import { formatCurrency } from "../utils";
import { generateStandardReport, generateCashFlowReport } from "../utils/pdfExport";

function makePdf(title: string, lines: string[]) {
  const content = [`BT /F1 16 Tf 50 780 Td (${title}) Tj`, ...lines.map((line, index) => `50 ${750 - index * 18} Td (${line.replace(/[()]/g, "")}) Tj`), "ET"].join("\n");
  return `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${content.length} >> stream
${content}
endstream endobj
xref
0 6
0000000000 65535 f
trailer << /Root 1 0 R /Size 6 >>
startxref
0
%%EOF`;
}

export function Reports() {
  const { reports, transactions, totals, generateReport } = useFinance();
  const [range, setRange] = useState("All Time");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredReports = useMemo(() => reports.filter((report) => typeFilter === "all" || report.type === typeFilter), [reports, typeFilter]);

  function downloadReport(report: SavedReport) {
    const lines = [
      `Generated: ${report.date}`,
      `Income: ${formatCurrency(totals.monthlyIncome)}`,
      `Expenses: ${formatCurrency(totals.monthlyExpenses)}`,
      `Net profit: ${formatCurrency(totals.netProfit)}`,
      `Transactions: ${transactions.length}`,
    ];

    if (report.type === "CSV") {
      exportTransactionsCsv(transactions);
      return;
    }

    if (report.type === "Excel") {
      const tsv = ["Metric\tValue", `Income\t${totals.monthlyIncome}`, `Expenses\t${totals.monthlyExpenses}`, `Net Profit\t${totals.netProfit}`].join("\n");
      downloadTextFile(`${report.name}.xls`, tsv, "application/vnd.ms-excel");
      return;
    }

    downloadTextFile(`${report.name}.pdf`, makePdf(report.name, lines), "application/pdf");
  }

  function generate(kind: Parameters<typeof generateReport>[0]) {
    const report = generateReport(kind);
    if (kind === "Monthly" || kind === "Profit & Loss") {
      generateStandardReport({
        title: kind === "Monthly" ? "Monthly Financial Report" : "Profit & Loss Statement",
        transactions,
        totals,
        dateRange: range
      });
    } else if (kind === "Cash Flow") {
      generateCashFlowReport({
        title: "Cash Flow Report",
        transactions,
        dateRange: range
      });
    } else if (kind === "Category") {
      exportTransactionsCsv(transactions);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Reports</h1>
          <p className="text-zinc-500 text-sm mt-1">Generate and download financial statements.</p>
        </div>
        <button onClick={() => generate("Monthly")} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button onClick={() => generate("Profit & Loss")} className="text-left bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm hover:bg-zinc-800/40 transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform"><FileBarChart className="w-6 h-6" /></div>
          <h3 className="text-lg font-medium text-zinc-100 mb-1">Profit & Loss</h3>
          <p className="text-sm text-zinc-500">Income, expenses, and net profit over time.</p>
        </button>
        <button onClick={() => generate("Cash Flow")} className="text-left bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm hover:bg-zinc-800/40 transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform"><FileSpreadsheet className="w-6 h-6" /></div>
          <h3 className="text-lg font-medium text-zinc-100 mb-1">Cash Flow</h3>
          <p className="text-sm text-zinc-500">Operating cash movement and runway overview.</p>
        </button>
        <button onClick={() => generate("Category")} className="text-left bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm hover:bg-zinc-800/40 transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform"><FileText className="w-6 h-6" /></div>
          <h3 className="text-lg font-medium text-zinc-100 mb-1">Category Report</h3>
          <p className="text-sm text-zinc-500">Category totals and export-ready transaction lines.</p>
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl flex flex-col backdrop-blur-sm">
        <div className="p-6 border-b border-zinc-800/60 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-100">Saved Reports</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setRange((current) => current === "All Time" ? "This Year" : "All Time")} className="flex items-center gap-2 px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors">
              <Calendar className="w-4 h-4" />
              {range}
            </button>
            <button onClick={() => setTypeFilter((current) => current === "all" ? "PDF" : current === "PDF" ? "CSV" : "all")} className="flex items-center gap-2 px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors">
              <Filter className="w-4 h-4" />
              {typeFilter === "all" ? "All Types" : typeFilter}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/30 border-b border-zinc-800/60">
              <tr><th className="px-6 py-4 font-medium">Report Name</th><th className="px-6 py-4 font-medium">Date Generated</th><th className="px-6 py-4 font-medium">Format</th><th className="px-6 py-4 font-medium">Size</th><th className="px-6 py-4 font-medium text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredReports.map((report) => (
                <tr key={report.id} className="group hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-200 flex items-center gap-3"><FileText className="w-4 h-4 text-zinc-500" />{report.name}</td>
                  <td className="px-6 py-4 text-zinc-400">{report.date}</td>
                  <td className="px-6 py-4 text-zinc-400"><span className="px-2 py-1 bg-zinc-800/50 rounded text-xs">{report.type}</span></td>
                  <td className="px-6 py-4 text-zinc-400">{report.size}</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => downloadReport(report)} className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" aria-label={`Download ${report.name}`}><Download className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
