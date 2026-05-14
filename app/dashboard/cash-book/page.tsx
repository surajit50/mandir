"use client";

import { useState } from "react";
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
import { Printer, Download, TrendingUp, TrendingDown } from "lucide-react";
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
  referenceId?: string;
}

export default function CashBookPage() {
  const { data: entries } = useSWR<CashBookEntry[]>("/api/cash-book", fetcher);

  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
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

  const totalDebits =
    filteredEntries?.reduce((sum, entry) => sum + entry.debitAmount, 0) || 0;

  const totalCredits =
    filteredEntries?.reduce((sum, entry) => sum + entry.creditAmount, 0) || 0;

  const closingBalance = filteredEntries?.length
    ? filteredEntries[filteredEntries.length - 1].balance
    : openingBalance;

  const uniqueTypes = Array.from(
    new Set(entries?.map((e) => e.referenceType) || []),
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    if (!filteredEntries) return;

    const csv = [
      ["Date", "Description", "Debit (₹)", "Credit (₹)", "Balance (₹)", "Type"],
      ...filteredEntries.map((entry) => [
        new Date(entry.date).toLocaleDateString(),
        entry.description,
        entry.debitAmount || "",
        entry.creditAmount || "",
        entry.balance,
        entry.referenceType,
      ]),
      ["", "", "", "", "", ""],
      ["Summary", "", totalDebits, totalCredits, closingBalance, ""],
    ];

    const csvContent = csv.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-book-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Book</h1>
          <p className="text-muted-foreground mt-2">
            Complete cash transaction ledger with running balance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Transaction Type
              </label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-slate-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              ₹{openingBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Receipts (In)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              ₹{totalCredits.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Total Payments (Out)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ₹{totalDebits.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closing Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              ₹{closingBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Book Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            {filteredEntries?.length || 0} transactions | Period:{" "}
            {new Date(startDate).toLocaleDateString()} to{" "}
            {new Date(endDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-50">
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">
                    Date
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">
                    Particulars
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">
                    Reference
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-slate-900">
                    In (Receipts)
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-slate-900">
                    Out (Payments)
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-slate-900">
                    Balance (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row */}
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td
                    colSpan={2}
                    className="py-3 px-4 font-semibold text-slate-900"
                  >
                    Opening Balance
                  </td>
                  <td className="py-3 px-4"></td>
                  <td className="text-right py-3 px-4"></td>
                  <td className="text-right py-3 px-4"></td>
                  <td className="text-right py-3 px-4 font-bold text-slate-900">
                    ₹{openingBalance.toLocaleString()}
                  </td>
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
                    <td className="py-3 px-4 text-slate-700">
                      {entry.description}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      {entry.referenceType}
                    </td>
                    <td className="text-right py-3 px-4 text-green-600 font-medium">
                      {entry.creditAmount > 0
                        ? `₹${entry.creditAmount.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="text-right py-3 px-4 text-red-600 font-medium">
                      {entry.debitAmount > 0
                        ? `₹${entry.debitAmount.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-900 font-bold">
                      ₹{entry.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* Summary Row */}
                <tr className="border-t-2 border-slate-300 bg-slate-100">
                  <td
                    colSpan={3}
                    className="py-4 px-4 font-bold text-slate-900"
                  >
                    Total
                  </td>
                  <td className="text-right py-4 px-4 font-bold text-green-600">
                    ₹{totalCredits.toLocaleString()}
                  </td>
                  <td className="text-right py-4 px-4 font-bold text-red-600">
                    ₹{totalDebits.toLocaleString()}
                  </td>
                  <td className="text-right py-4 px-4 font-bold text-blue-600">
                    ₹{closingBalance.toLocaleString()}
                  </td>
                </tr>

                {/* Closing Balance Row */}
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td
                    colSpan={2}
                    className="py-4 px-4 font-bold text-slate-900"
                  >
                    Closing Balance
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="text-right py-4 px-4 font-bold text-blue-600 text-lg">
                    ₹{closingBalance.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded">
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
                Total In (Receipts)
              </p>
              <p className="text-xl font-bold text-green-600">
                ₹{totalCredits.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
                Total Out (Payments)
              </p>
              <p className="text-xl font-bold text-red-600">
                ₹{totalDebits.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
                Net Cash Flow
              </p>
              <p
                className={`text-xl font-bold ${totalCredits - totalDebits >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                ₹{(totalCredits - totalDebits).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
                Closing Balance
              </p>
              <p className="text-xl font-bold text-blue-600">
                ₹{closingBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
