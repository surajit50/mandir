"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building,
  Calendar,
  Copy,
  Check,
  Download,
  Printer,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Scale,
  Landmark,
} from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  accountHolder: string;
  accountType: string;
  openingBalance: number;
  currentBalance: number;
  branch?: string;
  ifscCode?: string;
}

interface PassbookEntry {
  id: string;
  date: string;
  description: string;
  chequeNumber?: string;
  instrumentType?: string;
  instrumentNumber?: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  referenceType: string;
  referenceId?: string;
  voucherNumber?: string;
}

interface BankAccountPassbookClientProps {
  accountId: string;
}

export default function BankAccountPassbookClient({
  accountId,
}: BankAccountPassbookClientProps) {
  // Date State defaults to last 3 months
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 3))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  // Fetch Passbook and Account details via SWR
  const { data, error, isLoading } = useSWR<{
    account: BankAccount;
    transactions: PassbookEntry[];
  }>(
    accountId
      ? `/api/bank-accounts/${accountId}/passbook?startDate=${startDate}&endDate=${endDate}`
      : null,
    fetcher
  );

  const account = data?.account;
  const transactions = data?.transactions || [];

  // Filter passbook transactions by search query and credits/debits type filter
  const filteredPassbook = useMemo(() => {
    let result = transactions;

    if (typeFilter === "credit") {
      result = result.filter((tx) => tx.creditAmount > 0);
    } else if (typeFilter === "debit") {
      result = result.filter((tx) => tx.debitAmount > 0);
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.description.toLowerCase().includes(q) ||
          tx.voucherNumber?.toLowerCase().includes(q) ||
          tx.instrumentNumber?.toLowerCase().includes(q) ||
          tx.instrumentType?.toLowerCase().includes(q) ||
          tx.referenceType.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, typeFilter, searchQuery]);

  // Financial Calculations
  const openingBalance = useMemo(() => {
    if (transactions.length > 0) {
      // First transaction balance - first transaction credit + first transaction debit
      const first = transactions[0];
      return first.balance - first.creditAmount + first.debitAmount;
    }
    return account?.openingBalance || 0;
  }, [transactions, account]);

  const closingBalance = useMemo(() => {
    if (transactions.length > 0) {
      return transactions[transactions.length - 1].balance;
    }
    return account?.currentBalance || 0;
  }, [transactions, account]);

  const totalCredits = useMemo(() => {
    return filteredPassbook.reduce((sum, tx) => sum + tx.creditAmount, 0);
  }, [filteredPassbook]);

  const totalDebits = useMemo(() => {
    return filteredPassbook.reduce((sum, tx) => sum + tx.debitAmount, 0);
  }, [filteredPassbook]);

  // Copy Account Number helper
  const handleCopyAccount = () => {
    if (!account) return;
    navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    toast.success("Account number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // CSV Export helper
  const handleExportCSV = () => {
    if (!account) return;
    const headers = [
      "Voucher ID",
      "Voucher Date",
      "Instrument Type",
      "Instrument No",
      "Description",
      "Credit (Deposit)",
      "Debit (Withdrawal)",
      "Running Balance",
    ];
    const rows = filteredPassbook.map((tx) => [
      tx.voucherNumber || tx.referenceId || "—",
      new Date(tx.date).toLocaleDateString(),
      tx.instrumentType || tx.referenceType,
      tx.instrumentNumber || tx.chequeNumber || "—",
      tx.description,
      tx.creditAmount || "0.00",
      tx.debitAmount || "0.00",
      tx.balance || "0.00",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `passbook-${account.bankName.toLowerCase().replace(/\s+/g, "-")}-${account.accountNumber}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Passbook exported as CSV!");
  };

  // Print helper
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 transition-all duration-300">
      {/* Back button and Print Stylesheet injection */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, footer, nav, aside, .print-hidden {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            margin-bottom: 20px !important;
          }
          .print-table {
            font-size: 10px !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            color: black !important;
            border: 1px solid #cbd5e1 !important;
          }
          .print-table td {
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>

      <div className="print-hidden flex items-center justify-between">
        <Link href="/dashboard/bank-accounts">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground group transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Accounts
          </Button>
        </Link>
      </div>

      <PageHeader
        title={account ? `${account.bankName} - Passbook` : "Bank Account Passbook"}
        description={
          account
            ? `Passbook records for A/C ${account.accountNumber} (${account.accountHolder})`
            : "Detailed transaction history for individual bank account"
        }
        className="print-full-width"
      >
        <div className="print-hidden flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-slate-200 hover:bg-slate-50 gap-2 h-9 px-4 text-xs font-semibold uppercase tracking-wider"
          >
            <Printer className="w-4 h-4" />
            Print Passbook
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={filteredPassbook.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 px-4 text-xs font-semibold uppercase tracking-wider shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-6">
          <Card className="border border-slate-100 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-sm" />
        </div>
      ) : error || !account ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-6">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-lg">Error:</span>
            <span>{error?.message || "Failed to load bank account details. Verify if the account exists."}</span>
          </div>
        </Card>
      ) : (
        <div className="space-y-6 print-full-width">
          {/* A/C Details Showcase (Premium Glassmorphism View) */}
          <Card className="print-card overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow relative">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700" />
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                {/* Bank / Landmark Icon and Name */}
                <div className="flex items-center gap-4 border-slate-100 pb-4 lg:pb-0 lg:border-r lg:pr-6">
                  <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{account.bankName}</h3>
                    <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mt-0.5">{account.accountType} Account</p>
                  </div>
                </div>

                {/* Account Number & Holder */}
                <div className="flex flex-col justify-center border-slate-100 pb-4 lg:pb-0 lg:border-r lg:px-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account Number</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyAccount}
                      className="print-hidden h-6 w-6 text-slate-400 hover:text-slate-700"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <p className="text-xl font-bold text-slate-700 font-mono tracking-tight mt-1">{account.accountNumber}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Holder: <span className="text-slate-700 font-bold">{account.accountHolder}</span></p>
                </div>

                {/* Branch / IFSC & Quick Status */}
                <div className="flex flex-col justify-center lg:pl-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Branch</span>
                      <span className="text-sm font-semibold text-slate-700">{account.branch || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">IFSC Code</span>
                      <span className="text-sm font-semibold text-slate-700 font-mono">{account.ifscCode || "—"}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5 font-semibold">
                      ACTIVE LEDGER
                    </Badge>
                    <span className="text-xs text-slate-400">Current Bal: <span className="font-bold text-slate-700">{formatCurrency(account.currentBalance)}</span></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Selector & Search Filters Bar */}
          <Card className="print-hidden border-none shadow-sm bg-slate-50/80 backdrop-blur-sm p-4 rounded-lg">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-48 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> From Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border-slate-200 h-9 text-xs focus:ring-amber-500"
                />
              </div>

              <div className="w-48 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> To Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border-slate-200 h-9 text-xs focus:ring-amber-500"
                />
              </div>

              <div className="flex-1 min-w-[200px] relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Search Transactions
                </label>
                <div className="relative">
                  <Input
                    placeholder="Search by description, instrument, voucher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs pr-8 focus:ring-amber-500"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.75 text-slate-400" />
                </div>
              </div>
            </div>
          </Card>

          {/* Interactive Dynamic Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opening Balance */}
            <Card className="print-card relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Opening Balance</span>
                  <div className="p-1.5 rounded-full bg-slate-200/50 text-slate-600">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-lg font-bold text-slate-800 tracking-tight">{formatCurrency(openingBalance)}</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">As on {new Date(startDate).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Credits */}
            <Card className="print-card relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/20 border border-emerald-200 shadow-sm transition-all duration-300 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Credits</span>
                  <div className="p-1.5 rounded-full bg-emerald-100/80 text-emerald-700">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-lg font-bold text-emerald-700 tracking-tight">+{formatCurrency(totalCredits)}</span>
                  <p className="text-[9px] text-emerald-500/75 mt-0.5">{filteredPassbook.length} credits filtered</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Debits */}
            <Card className="print-card relative overflow-hidden bg-gradient-to-br from-rose-50 to-rose-100/20 border border-rose-200 shadow-sm transition-all duration-300 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Total Debits</span>
                  <div className="p-1.5 rounded-full bg-rose-100/80 text-rose-700">
                    <TrendingDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-lg font-bold text-rose-700 tracking-tight">-{formatCurrency(totalDebits)}</span>
                  <p className="text-[9px] text-rose-500/75 mt-0.5">{filteredPassbook.length} debits filtered</p>
                </div>
              </CardContent>
            </Card>

            {/* Closing Balance */}
            <Card className="print-card relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/20 border border-amber-200 shadow-sm transition-all duration-300 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Closing Balance</span>
                  <div className="p-1.5 rounded-full bg-amber-100/80 text-amber-700">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-lg font-bold text-amber-800 tracking-tight">{formatCurrency(closingBalance)}</span>
                  <p className="text-[9px] text-amber-500/75 mt-0.5">As on {new Date(endDate).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Passbook Table Toolbar (Search / Credits / Debits filter toggle) */}
          <div className="print-hidden flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 h-8 text-[11px] font-semibold border-slate-200 bg-white">
                  <SelectValue placeholder="All entries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All entries</SelectItem>
                  <SelectItem value="credit" className="text-xs text-emerald-600">Credits Only</SelectItem>
                  <SelectItem value="debit" className="text-xs text-rose-600">Debits Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Showing <span className="text-slate-700 font-bold">{filteredPassbook.length}</span> of <span className="font-semibold">{transactions.length}</span> transactions
            </div>
          </div>

          {/* Core Bank Passbook Table */}
          <div className="print-card border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white print-full-width">
            <div className="overflow-x-auto">
              <table className="print-table w-full text-[11px] leading-tight border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white divide-x divide-slate-700">
                    <th className="py-3 px-3 text-left font-bold w-28 uppercase tracking-wider">
                      Voucher ID
                    </th>
                    <th className="py-3 px-3 text-left font-bold w-24 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="py-3 px-3 text-left font-bold w-32 uppercase tracking-wider">
                      Instrument
                    </th>
                    <th className="py-3 px-3 text-left font-bold w-28 uppercase tracking-wider">
                      Instrument No
                    </th>
                    <th className="py-3 px-3 text-left font-bold uppercase tracking-wider">
                      Particulars / Description
                    </th>
                    <th className="py-3 px-3 text-right font-bold w-28 uppercase tracking-wider bg-emerald-900/10 text-emerald-100">
                      Amount Credit
                    </th>
                    <th className="py-3 px-3 text-right font-bold w-28 uppercase tracking-wider bg-rose-900/10 text-rose-100">
                      Amount Debit
                    </th>
                    <th className="py-3 px-3 text-right font-bold w-32 uppercase tracking-wider bg-slate-900 text-white">
                      Running Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors divide-x divide-slate-100 border-b border-slate-200/80">
                    <td className="py-3 px-3 font-semibold text-slate-500 italic">Opening Bal</td>
                    <td className="py-3 px-3 text-slate-400 italic text-[10px]">{new Date(startDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3"></td>
                    <td className="py-3 px-3"></td>
                    <td className="py-3 px-3 text-slate-500 font-medium italic">Opening Balance for selected period</td>
                    <td className="py-3 px-3 text-right bg-emerald-50/30"></td>
                    <td className="py-3 px-3 text-right bg-rose-50/30"></td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700 bg-slate-100/50 font-mono">
                      {openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {filteredPassbook.length > 0 ? (
                    filteredPassbook.map((entry) => {
                      const isCredit = entry.creditAmount > 0;
                      return (
                        <tr
                          key={entry.id}
                          className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-100"
                        >
                          <td className="py-2.5 px-3 font-semibold text-amber-700 font-mono">
                            {entry.voucherNumber || entry.referenceId?.slice(-10).toUpperCase() || entry.id.slice(-10).toUpperCase()}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium uppercase text-[10px]">
                            {entry.instrumentType || entry.referenceType}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">
                            {entry.instrumentNumber || entry.chequeNumber || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium leading-normal">
                            {entry.description}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600 bg-emerald-50/10 font-mono">
                            {entry.creditAmount > 0
                              ? entry.creditAmount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 bg-rose-50/10 font-mono">
                            {entry.debitAmount > 0
                              ? entry.debitAmount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 bg-slate-50/50 font-mono">
                            {entry.balance.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2 opacity-40">
                          <FileSpreadsheet className="w-10 h-10 text-slate-400" />
                          <p className="text-sm font-semibold italic text-slate-500">No passbook records found for this criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Summary Totals Footer Row */}
                  {filteredPassbook.length > 0 && (
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 divide-x divide-slate-100">
                      <td className="py-3 px-3 text-slate-700 uppercase" colSpan={5}>
                        Period Totals
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700 bg-emerald-50/30 font-mono">
                        +{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-700 bg-rose-50/30 font-mono">
                        -{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-800 bg-slate-100/50 font-mono">
                        {closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
