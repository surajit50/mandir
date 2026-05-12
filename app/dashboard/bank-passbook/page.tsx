"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Printer, Filter } from "lucide-react";
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
  debitAmount: number;
  creditAmount: number;
  balance: number;
  referenceType: string;
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

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);

  const fetchPassbook = async () => {
    if (!selectedAccountId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/bank-accounts/${selectedAccountId}/passbook?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      setPassbook(data || []);
    } catch (error) {
      console.error("Failed to fetch passbook:", error);
    } finally {
      setLoading(false);
    }
  };

  const openingBalance = passbook.length ? passbook[0].balance - (passbook[0].debitAmount - passbook[0].creditAmount) : 0;
  const totalDebits = passbook.reduce((sum, e) => sum + e.debitAmount, 0);
  const totalCredits = passbook.reduce((sum, e) => sum + e.creditAmount, 0);
  const closingBalance = passbook.length ? passbook[passbook.length - 1].balance : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bank Passbook</h1>
          <p className="text-slate-600 mt-2">View detailed bank transaction history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Select Account
              </label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchPassbook}
                disabled={!selectedAccountId || loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Loading..." : "View Passbook"}
              </Button>
            </div>
          </div>
        </CardContent>
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
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Total Withdrawals</p>
                    <p className="text-lg font-bold text-red-600">₹{totalDebits.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Net Change</p>
                    <p className={`text-lg font-bold ${totalCredits - totalDebits >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ₹{(totalCredits - totalDebits).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Closing Balance</p>
                    <p className="text-lg font-bold text-blue-600">₹{closingBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedAccount && passbook.length === 0 && !loading && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-amber-700">No transactions found for the selected period.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
