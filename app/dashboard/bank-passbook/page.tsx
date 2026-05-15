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

  const openingBalance = Array.isArray(passbook) && passbook.length ? passbook[0].balance - (passbook[0].debitAmount - passbook[0].creditAmount) : 0;
  const totalDebits = Array.isArray(passbook) ? passbook.reduce((sum, e) => sum + (e.debitAmount || 0), 0) : 0;
  const totalCredits = Array.isArray(passbook) ? passbook.reduce((sum, e) => sum + (e.creditAmount || 0), 0) : 0;
  const closingBalance = Array.isArray(passbook) && passbook.length ? passbook[passbook.length - 1].balance : 0;

  const handlePrint = () => {
    window.print();
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

      {selectedAccount && passbook.length > 0 && (
        <>
          {/* Account Header */}
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Bank Name</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedAccount.bankName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Account Number</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedAccount.accountNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Account Holder</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedAccount.accountHolder}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Period</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Opening Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">₹{openingBalance.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">₹{totalCredits.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Withdrawals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">₹{totalDebits.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Closing Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">₹{closingBalance.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Passbook Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>{passbook.length} transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Cheque/Ref</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Deposit (₹)</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Withdrawal (₹)</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passbook.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50"
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-900 font-medium">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{entry.description}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {entry.chequeNumber || entry.referenceType.substring(0, 3).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600 font-medium">
                          {entry.creditAmount > 0 ? `₹${entry.creditAmount.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600 font-medium">
                          {entry.debitAmount > 0 ? `₹${entry.debitAmount.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 font-bold">
                          ₹{entry.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="mt-6 pt-4 border-t-2 border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Total Deposits</p>
                    <p className="text-lg font-bold text-green-600">₹{totalCredits.toLocaleString()}</p>
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
