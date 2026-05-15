"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  Printer, 
  Download, 
  Search,
  BookOpen,
  Wallet,
  LayoutDashboard
} from "lucide-react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CashBookEntry {
  id: string;
  date: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  referenceType: string;
}

export default function CashLedgerPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "";

  const apiUrl = ["ADMIN", "ACCOUNTANT"].includes(userRole)
    ? `/api/cash-book?startDate=${startDate}&endDate=${endDate}`
    : "/api/members/me/ledger";

  const {
    data: rawData,
    isLoading,
  } = useSWR<any>(userRole ? apiUrl : null, fetcher);

  const entries = Array.isArray(rawData) ? rawData : (rawData?.entries || []);

  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const filteredEntries = entries.filter((entry: any) => {
    const entryDate = new Date(entry.date).toISOString().split("T")[0];
    return entryDate >= startDate && entryDate <= endDate;
  });

  const summary = rawData?.summary || null;

  // Sorted entries for display
  const sortedEntries = [...(filteredEntries || [])].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const receipts = sortedEntries.filter(e => e.creditAmount > 0);
  const payments = sortedEntries.filter(e => e.debitAmount > 0);

  // Opening balance: Use API summary if available, otherwise calculate from first entry
  const openingBalance = summary 
    ? summary.openingBalance 
    : (sortedEntries[0] 
        ? (sortedEntries[0].balance - sortedEntries[0].creditAmount + sortedEntries[0].debitAmount)
        : 0);

  const totalReceiptsAmount = summary ? summary.totalReceipts : receipts.reduce((sum, e) => sum + e.creditAmount, 0);
  const totalPaymentsAmount = summary ? summary.totalPayments : payments.reduce((sum, e) => sum + e.debitAmount, 0);
  
  const closingBalance = summary ? summary.closingBalance : (openingBalance + totalReceiptsAmount - totalPaymentsAmount);
  const maxRows = Math.max(receipts.length, payments.length, 10);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
              <Wallet className="w-6 h-6" />
            </div>
            {["ADMIN", "ACCOUNTANT"].includes(userRole) ? "Cash Book" : "My Cash Ledger"}
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {["ADMIN", "ACCOUNTANT"].includes(userRole)
              ? "All trust cash transactions"
              : "Personal collection and handover records"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-200">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Button onClick={handlePrint} className="bg-slate-900 hover:bg-black text-white">
            <Printer className="w-4 h-4 mr-2" />
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Filters - Hidden on Print */}
      <Card className="border-none shadow-sm bg-slate-50/50 print:hidden">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border-slate-200"
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-100">
                <Search className="w-4 h-4 mr-2" />
                Update View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traditional Double-Column Ledger Design */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 text-center border-b border-slate-800 print:bg-white print:text-black print:border-b-2 print:border-black">
          <h2 className="text-xl font-bold tracking-[0.2em] uppercase mb-1">
            {["ADMIN", "ACCOUNTANT"].includes(userRole) ? "General Cash Book" : "Personal Cash Ledger"}
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] print:text-slate-600">
            Account Holder: {session?.user?.name || "System User"} | Period: {new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row min-h-[500px]">
          {/* RECEIPTS (LEFT) */}
          <div className="flex-1 border-r border-slate-200 flex flex-col">
            <div className="bg-emerald-50/80 p-3 text-center border-b border-slate-200 print:bg-slate-50 print:border-black">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.4em]">Receipts / Collections</span>
            </div>
            
            <table className="w-full text-[11px] leading-tight border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 print:border-black">
                  <th className="py-2 px-3 text-left border-r border-slate-200 font-bold text-slate-600 w-20 uppercase tracking-tighter">Date</th>
                  <th className="py-2 px-3 text-left border-r border-slate-200 font-bold text-slate-600 uppercase tracking-tighter">Particulars</th>
                  <th className="py-2 px-3 text-right font-bold text-slate-600 w-24 uppercase tracking-tighter">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-emerald-50/30 border-b border-slate-100 italic">
                  <td className="py-2 px-3 border-r border-slate-100">{new Date(startDate).toLocaleDateString()}</td>
                  <td className="py-2 px-3 border-r border-slate-100 font-semibold text-slate-700">To Opening Balance b/f</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">{openingBalance.toLocaleString()}</td>
                </tr>

                {receipts.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-500">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="py-2 px-3 border-r border-slate-100">
                      <span className="font-bold text-slate-700 mr-1 italic">To</span> 
                      {entry.description}
                      <span className="ml-2 text-[9px] text-slate-400 bg-slate-100 px-1 rounded">REF: {entry.id.slice(-6)}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{entry.creditAmount.toLocaleString()}</td>
                  </tr>
                ))}

                {Array.from({ length: Math.max(0, maxRows - receipts.length) }).map((_, i) => (
                  <tr key={`pad-r-${i}`} className="border-b border-slate-50 h-8">
                    <td className="border-r border-slate-50"></td>
                    <td className="border-r border-slate-50"></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-auto border-t-2 border-slate-900 bg-slate-900 text-white p-3 flex justify-between items-center print:bg-white print:text-black print:border-t-2 print:border-black">
              <span className="text-[10px] font-black uppercase tracking-widest">Total Receipts Side</span>
              <span className="text-sm font-black">₹{(openingBalance + totalReceiptsAmount).toLocaleString()}</span>
            </div>
          </div>

          {/* PAYMENTS (RIGHT) */}
          <div className="flex-1 flex flex-col">
            <div className="bg-rose-50/80 p-3 text-center border-b border-slate-200 print:bg-slate-50 print:border-black">
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-[0.4em]">Payments / Handovers</span>
            </div>
            
            <table className="w-full text-[11px] leading-tight border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 print:border-black">
                  <th className="py-2 px-3 text-left border-r border-slate-200 font-bold text-slate-600 w-20 uppercase tracking-tighter">Date</th>
                  <th className="py-2 px-3 text-left border-r border-slate-200 font-bold text-slate-600 uppercase tracking-tighter">Particulars</th>
                  <th className="py-2 px-3 text-right font-bold text-slate-600 w-24 uppercase tracking-tighter">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-500">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="py-2 px-3 border-r border-slate-100">
                      <span className="font-bold text-slate-700 mr-1 italic">By</span> 
                      {entry.description}
                      <span className="ml-2 text-[9px] text-slate-400 bg-slate-100 px-1 rounded">REF: {entry.id.slice(-6)}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-rose-700">{entry.debitAmount.toLocaleString()}</td>
                  </tr>
                ))}

                {Array.from({ length: Math.max(0, maxRows - payments.length) }).map((_, i) => (
                  <tr key={`pad-p-${i}`} className="border-b border-slate-50 h-8">
                    <td className="border-r border-slate-50"></td>
                    <td className="border-r border-slate-50"></td>
                    <td></td>
                  </tr>
                ))}

                <tr className="bg-blue-50/30 border-t-2 border-slate-100 italic">
                  <td className="py-2 px-3 border-r border-slate-100">{new Date(endDate).toLocaleDateString()}</td>
                  <td className="py-2 px-3 border-r border-slate-100 font-semibold text-slate-700">By Closing Balance c/o</td>
                  <td className="py-2 px-3 text-right font-bold text-blue-900 underline decoration-double">{closingBalance.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            
            <div className="mt-auto border-t-2 border-slate-900 bg-slate-900 text-white p-3 flex justify-between items-center print:bg-white print:text-black print:border-t-2 print:border-black">
              <span className="text-[10px] font-black uppercase tracking-widest">Total Payments Side</span>
              <span className="text-sm font-black">₹{(totalPaymentsAmount + closingBalance).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
        <p>* This statement is for internal use only.</p>
        <div className="flex gap-4">
          <span>Date: {new Date().toLocaleDateString()}</span>
          <span>User: {session?.user?.name}</span>
        </div>
      </div>
    </div>
  );
}
