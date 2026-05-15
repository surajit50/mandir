"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Printer, 
  Download, 
  BookOpen,
  Search,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Filter,
  RefreshCcw,
  ChevronRight,
  Users
} from "lucide-react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

interface CashBookEntry {
  id: string;
  date: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  referenceType: string;
  referenceId?: string;
}

interface CashBookResponse {
  entries: CashBookEntry[];
  summary: {
    openingBalance: number;
    totalReceipts: number;
    totalPayments: number;
    closingBalance: number;
    pendingMemberCash: number;
    totalTrustCash: number;
  };
}

export default function CashBookPage() {
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterType, setFilterType] = useState<string>("all");

  const filteredEntries = entries?.filter((entry) => {
    const entryDate = new Date(entry.date).toISOString().split("T")[0];
    const dateMatch = entryDate >= startDate && entryDate <= endDate;
    const typeMatch =
      filterType === "all" || entry.referenceType === filterType;
    return dateMatch && typeMatch;
  });

  const openingBalance = entries?.[0]
    ? entries[0].balance - (entries[0].debitAmount - entries[0].creditAmount)
    : 0;

  const filteredEntries = useMemo(() => {
    if (filterType === "all") return entries;
    return entries.filter(entry => entry.referenceType === filterType);
  }, [entries, filterType]);

  const receipts = useMemo(() => filteredEntries.filter(e => e.creditAmount > 0), [filteredEntries]);
  const payments = useMemo(() => filteredEntries.filter(e => e.debitAmount > 0), [filteredEntries]);

  const maxRows = Math.max(receipts.length, payments.length, 5);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.info("PDF Export started...");
    // Future implementation for PDF generation
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleRefresh = () => {
    mutate();
    toast.success("Cash book data refreshed");
  };

  return (
    <div className="space-y-8 pb-20 print:p-0 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-200 dark:shadow-none">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight dark:text-slate-100">
              Cash Book Ledger
            </h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">
            Real-time financial record of all cash transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-10 px-4 border-slate-200 hover:bg-slate-50">
            <RefreshCcw className="w-4 h-4 mr-2 text-slate-500" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-10 px-4 border-slate-200 hover:bg-slate-50">
            <Printer className="w-4 h-4 mr-2 text-slate-500" />
            Print
          </Button>
          <Button size="sm" onClick={handleExportPDF} className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 border-none transition-all hover:scale-[1.02]">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-1 px-4 pt-4">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3 text-amber-500" /> Period Start Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-black text-slate-900 dark:text-white">₹{summary.openingBalance.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[8px] h-4 font-bold border-slate-200">Opening Balance</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden border-l-4 border-l-emerald-500">
          <CardHeader className="pb-1 px-4 pt-4">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ArrowUpCircle className="w-3 h-3 text-emerald-500" /> Main Box Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">₹{summary.closingBalance.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[8px] h-4 font-bold border-emerald-100 bg-emerald-50 text-emerald-700">Cash-in-Box</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden border-l-4 border-l-amber-500">
          <CardHeader className="pb-1 px-4 pt-4">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3 h-3 text-amber-500" /> Cash with Members
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-black text-amber-700 dark:text-amber-400">₹{summary.pendingMemberCash.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[8px] h-4 font-bold border-amber-100 bg-amber-50 text-amber-700">Pending Handovers</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-indigo-600 to-indigo-800 text-white overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Wallet className="w-24 h-24" />
          </div>
          <CardHeader className="pb-1 px-4 pt-4">
            <CardTitle className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest flex items-center gap-2">
              <RefreshCcw className="w-3 h-3 text-amber-400" /> Total Consolidated Cash
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black">₹{summary.totalTrustCash.toLocaleString()}</div>
            <p className="text-[9px] text-indigo-200 mt-1 font-medium">Total Trust Assets (Box + Members)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/50 print:hidden overflow-visible">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-amber-500 rounded-lg h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-amber-500 rounded-lg h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> Entry Type
              </label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg h-10">
                  <SelectValue placeholder="All entries" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="CashHandover">Handovers Received</SelectItem>
                  <SelectItem value="PaymentVoucher">Vouchers (Receipt/Payment)</SelectItem>
                  <SelectItem value="BankDeposit">Bank Deposits (Cash Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="bg-slate-900 hover:bg-black text-white font-semibold rounded-lg h-10 transition-all hover:gap-3"
              onClick={() => mutate()}
            >
              <Search className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Ledger Content */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-none print:shadow-none animate-in slide-in-from-bottom-4 duration-1000">
        {/* Decorative Header */}
        <div className="bg-slate-900 dark:bg-black text-white p-8 text-center border-b border-slate-800 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="inline-block px-4 py-1.5 border-2 border-amber-500 text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4 print:hidden">
            Official Ledger Document
          </div>
          <h2 className="text-2xl font-bold tracking-[0.15em] uppercase mb-2">Temple Trust Cash Book</h2>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-widest print:text-slate-600">
            <span>Period:</span>
            <Badge variant="outline" className="text-white border-slate-700 font-bold px-3">
              {format(new Date(startDate), "dd MMM yyyy")}
            </Badge>
            <ChevronRight className="w-4 h-4" />
            <Badge variant="outline" className="text-white border-slate-700 font-bold px-3">
              {format(new Date(endDate), "dd MMM yyyy")}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row min-h-[500px]">
          {/* RECEIPTS SIDE (LEFT) */}
          <div className="flex-1 border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="bg-emerald-50/40 dark:bg-emerald-950/10 p-3 text-center border-b border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2">
              <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-[0.2em]">Receipts (Debit Side)</span>
            </div>
            
            <table className="w-full text-[11px] leading-relaxed border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 px-3 text-left border-r border-slate-100 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-tighter w-20">Date</th>
                  <th className="py-2.5 px-3 text-left border-r border-slate-100 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-tighter">Particulars</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-500 uppercase tracking-tighter w-24">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                {/* Opening Balance Row */}
                <tr className="bg-slate-50/30 dark:bg-slate-900/10 italic">
                  <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-400">{format(new Date(startDate), "dd/MM/yy")}</td>
                  <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-600 dark:text-slate-300">To</span> Opening Balance b/f
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">{summary.openingBalance.toLocaleString()}</td>
                </tr>

                {/* Transaction Rows */}
                {filteredEntries?.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-900 font-medium">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 tabular-nums">{entry.creditAmount.toLocaleString()}</td>
                  </tr>
                ))}

                {/* Empty Rows to match length */}
                {Array.from({ length: Math.max(0, maxRows - receipts.length) }).map((_, i) => (
                  <tr key={`pad-r-${i}`} className="h-12">
                    <td className="border-r border-slate-100 dark:border-slate-800"></td>
                    <td className="border-r border-slate-100 dark:border-slate-800"></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAYMENTS SIDE (RIGHT) */}
          <div className="flex-1 flex flex-col">
            <div className="bg-rose-50/40 dark:bg-rose-950/10 p-3 text-center border-b border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2">
              <ArrowDownCircle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase tracking-[0.2em]">Payments (Credit Side)</span>
            </div>
            
            <table className="w-full text-[11px] leading-relaxed border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 px-3 text-left border-r border-slate-100 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-tighter w-20">Date</th>
                  <th className="py-2.5 px-3 text-left border-r border-slate-100 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-tighter">Particulars</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-500 uppercase tracking-tighter w-24">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                {/* Payment Entries */}
                {payments.map((entry) => (
                  <tr key={entry.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-400 font-mono">{format(new Date(entry.date), "dd/MM/yy")}</td>
                    <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-rose-600 dark:text-rose-400">By</span> 
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{entry.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400 font-mono opacity-60">REF: {entry.referenceId?.slice(-8).toUpperCase() || "N/A"}</span>
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20">
                            {entry.referenceType}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 tabular-nums">{entry.debitAmount.toLocaleString()}</td>
                  </tr>
                ))}

                {/* Empty Rows to match length */}
                {Array.from({ length: Math.max(0, maxRows - payments.length) }).map((_, i) => (
                  <tr key={`pad-p-${i}`} className="h-12">
                    <td className="border-r border-slate-100 dark:border-slate-800"></td>
                    <td className="border-r border-slate-100 dark:border-slate-800"></td>
                    <td></td>
                  </tr>
                ))}

                {/* Closing Balance Row */}
                <tr className="bg-slate-50/30 dark:bg-slate-900/10 italic">
                  <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-400">{format(new Date(endDate), "dd/MM/yy")}</td>
                  <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-600 dark:text-slate-300">By</span> Closing Balance c/o
                  </td>
                  <td className="py-3 px-3 text-right font-black text-indigo-700 dark:text-indigo-400 underline decoration-double underline-offset-4 decoration-1">
                    {summary.closingBalance.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Footer */}
        <div className="flex flex-col lg:flex-row bg-slate-900 text-white font-bold border-t border-slate-800 print:bg-white print:text-black print:border-t-2 print:border-black">
          <div className="flex-1 p-4 flex justify-between items-center border-r border-slate-800 lg:px-6">
            <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">Total Receipts</span>
            <span className="text-lg font-black tabular-nums">₹{(summary.openingBalance + summary.totalReceipts).toLocaleString()}</span>
          </div>
          <div className="flex-1 p-4 flex justify-between items-center lg:px-6">
            <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">Total Payments</span>
            <span className="text-lg font-black tabular-nums">₹{(summary.totalPayments + summary.closingBalance).toLocaleString()}</span>
          </div>
        </div>
      </div>

     
      
    </div>
  );
}
