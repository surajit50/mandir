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
import useSWR from "swr";

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
    ? "/api/cash-book"
    : "/api/members/me/ledger";

  const {
    data: entries,
    error,
    isLoading,
    mutate,
  } = useSWR<CashBookEntry[]>(userRole ? apiUrl : null, fetcher);

  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const filteredEntries = entries?.filter((entry) => {
    const entryDate = new Date(entry.date).toISOString().split("T")[0];
    return entryDate >= startDate && entryDate <= endDate;
  });

  const totalDebits =
    filteredEntries?.reduce((sum, entry) => sum + entry.debitAmount, 0) || 0;

  const totalCredits =
    filteredEntries?.reduce((sum, entry) => sum + entry.creditAmount, 0) || 0;

  const currentBalance = filteredEntries?.length
    ? filteredEntries[filteredEntries.length - 1].balance
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {["ADMIN", "ACCOUNTANT"].includes(userRole)
            ? "Cash Book"
            : "My Cash Ledger"}
        </h1>
        <p className="text-slate-600 mt-2">
          {["ADMIN", "ACCOUNTANT"].includes(userRole)
            ? "Monitor all cash transactions and ledger entries"
            : "Track your collected donations and cash handovers"}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {["ADMIN", "ACCOUNTANT"].includes(userRole)
                ? "Total Payments (Debits)"
                : "Total Handed Over"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ₹{totalDebits.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {["ADMIN", "ACCOUNTANT"].includes(userRole)
                ? "Total Receipts (Credits)"
                : "Total Collected"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ₹{totalCredits.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {["ADMIN", "ACCOUNTANT"].includes(userRole)
                ? "Closing Balance"
                : "Cash in Hand"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              ₹{currentBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Book Table */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">Loading ledger...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">Error loading cash book</p>
          </CardContent>
        </Card>
      ) : filteredEntries && filteredEntries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ledger Entries</CardTitle>
            <CardDescription>Detailed cash transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">
                      {["ADMIN", "ACCOUNTANT"].includes(userRole)
                        ? "Debit (Out)"
                        : "Handed Over"}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">
                      {["ADMIN", "ACCOUNTANT"].includes(userRole)
                        ? "Credit (In)"
                        : "Collected"}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">
                      Balance
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">{entry.description}</td>
                      <td className="py-3 px-4 text-right text-red-600">
                        {entry.debitAmount > 0
                          ? `₹${entry.debitAmount.toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600">
                        {entry.creditAmount > 0
                          ? `₹${entry.creditAmount.toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        ₹{entry.balance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">
                          {entry.referenceType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">
              No ledger entries found for the selected period
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
