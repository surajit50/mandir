"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Download, 
  Printer, 
  Search, 
  ArrowUpDown,
  FileSpreadsheet,
  Building2,
  Calendar
} from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  accountHolder: string;
  currentBalance: number;
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

export default function BankPassbookPage() {
  const { data: accounts } = useSWR<BankAccount[]>("/api/bank-accounts", fetcher);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 3))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [passbook, setPassbook] = useState<PassbookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);

  const fetchPassbook = async () => {
    if (!selectedAccountId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/bank-accounts/${selectedAccountId}/passbook?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      setPassbook(data.transactions || []);
    } catch (error) {
      console.error("Failed to fetch passbook:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPassbook = useMemo(() => {
    if (!searchQuery) return passbook;
    return passbook.filter(entry => 
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.voucherNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.instrumentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.instrumentType?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [passbook, searchQuery]);

  const openingBalance = Array.isArray(passbook) && passbook.length ? passbook[0].balance - passbook[0].creditAmount + passbook[0].debitAmount : 0;

  const handleExportExcel = () => {
    // Basic CSV export logic as placeholder for "Download Excel"
    const headers = ["Voucher ID", "Voucher Date", "Instrument Type", "Instrument No", "Passbook Date", "Amount Credit", "Amount Debit", "Balance"];
    const rows = filteredPassbook.map(e => [
      e.referenceId || "N/A",
      new Date(e.date).toLocaleDateString(),
      e.referenceType,
      e.chequeNumber || "",
      new Date(e.date).toLocaleDateString(),
      e.creditAmount,
      e.debitAmount,
      e.balance
    ]);
    
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bank-passbook-${selectedAccount?.accountNumber}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-blue-900 tracking-tight">Bank/Treasury Passbook</h1>
      </div>

      {/* Filter Header Bar */}
      <Card className="border-none shadow-sm bg-slate-100/50 p-4 rounded-none">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1 min-w-[300px] space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Bank Account</label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="bg-white border-slate-300 h-9">
                <SelectValue placeholder="Choose Bank Account" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bankName.toUpperCase()} - {account.accountNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              From date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border-slate-300 h-9"
            />
          </div>

          <div className="w-40 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              To Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border-slate-300 h-9"
            />
          </div>

          <Button
            onClick={fetchPassbook}
            disabled={!selectedAccountId || loading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white h-9 px-8 font-bold text-xs uppercase tracking-wider"
          >
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex justify-between items-center px-1">
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-20 h-8 text-xs border-slate-300">
              <SelectValue placeholder="all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all</SelectItem>
              <SelectItem value="receipts">receipts</SelectItem>
              <SelectItem value="payments">payments</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleExportExcel}
            className="bg-cyan-700 hover:bg-cyan-800 h-8 px-4 text-[10px] font-bold uppercase tracking-wide"
          >
            Download Excel
          </Button>
        </div>

        <div className="relative w-64">
          <Input 
            placeholder="search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs pr-8 border-slate-300 bg-slate-50/50 focus:bg-white"
          />
          <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.25 text-slate-400" />
        </div>
      </div>

      {/* Main Passbook Table */}
      <div className="border border-slate-200 rounded-sm overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] leading-tight border-collapse">
            <thead>
              <tr className="bg-cyan-500 text-white divide-x divide-cyan-400/50">
                <th className="py-2.5 px-3 text-left font-bold w-32 group cursor-pointer hover:bg-cyan-600">
                  <div className="flex items-center justify-between uppercase">
                    Voucher ID <ArrowUpDown className="w-3 h-3 text-cyan-200" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-left font-bold w-24 group cursor-pointer hover:bg-cyan-600">
                  <div className="flex items-center justify-between uppercase">
                    Voucher Date <ArrowUpDown className="w-3 h-3 text-cyan-200" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-left font-bold group cursor-pointer hover:bg-cyan-600">
                  <div className="flex items-center justify-between uppercase">
                    Instrument Type <ArrowUpDown className="w-3 h-3 text-cyan-200" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-left font-bold w-28 group cursor-pointer hover:bg-cyan-600">
                  <div className="flex items-center justify-between uppercase">
                    Instrument No <ArrowUpDown className="w-3 h-3 text-cyan-200" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-left font-bold w-24 group cursor-pointer hover:bg-cyan-600">
                  <div className="flex items-center justify-between uppercase">
                    Instrument Date <ArrowUpDown className="w-3 h-3 text-cyan-200" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-left font-bold w-24 group cursor-pointer hover:bg-cyan-600">
                  <div className="flex items-center justify-between uppercase">
                    Passbook Date <ArrowUpDown className="w-3 h-3 text-cyan-200" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right font-bold w-28 group cursor-pointer hover:bg-cyan-600">
                  <div className="flex items-center justify-between uppercase">
                    Amount Credit <ArrowUpDown className="w-3 h-3 text-cyan-200" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right font-bold w-28 group cursor-pointer hover:bg-cyan-600">
                  <div className="flex items-center justify-between uppercase">
                    Amount Debit <ArrowUpDown className="w-3 h-3 text-cyan-200" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right font-bold w-32 group cursor-pointer hover:bg-cyan-600">
                  <div className="flex items-center justify-between uppercase">
                    Balance <ArrowUpDown className="w-3 h-3 text-cyan-200" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Opening Balance Row */}
              <tr className="bg-white hover:bg-slate-50 transition-colors divide-x divide-slate-100">
                <td className="py-3 px-3 font-medium text-slate-500 italic">Opening Balance</td>
                <td className="py-3 px-3 text-slate-400 italic text-[10px]">as per Cashbook {new Date(startDate).toLocaleDateString()}</td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-400 text-[9px] font-bold border border-rose-100">N/A</span>
                </td>
                <td className="py-3 px-3 text-right"></td>
                <td className="py-3 px-3 text-right"></td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">{openingBalance.toFixed(2)}</td>
              </tr>

              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                    Retrieving treasury records...
                  </td>
                </tr>
              ) : filteredPassbook.length > 0 ? (
                filteredPassbook.map((entry) => (
                  <tr key={entry.id} className="hover:bg-cyan-50/30 transition-colors divide-x divide-slate-100">
                    <td className="py-2.5 px-3 font-medium text-blue-800">{entry.voucherNumber || entry.referenceId || entry.id.slice(-10).toUpperCase()}</td>
                    <td className="py-2.5 px-3 text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{entry.instrumentType || entry.referenceType}</td>
                    <td className="py-2.5 px-3 text-slate-600">{entry.instrumentNumber || entry.chequeNumber || "—"}</td>
                    <td className="py-2.5 px-3 text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      {entry.creditAmount > 0 ? entry.creditAmount.toFixed(2) : ""}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      {entry.debitAmount > 0 ? entry.debitAmount.toFixed(2) : ""}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 bg-slate-50/30">
                      {entry.balance.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-30">
                      <FileSpreadsheet className="w-10 h-10 text-slate-400" />
                      <p className="text-sm font-medium italic">No treasury records found for this period</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      
    </div>
  );
}
