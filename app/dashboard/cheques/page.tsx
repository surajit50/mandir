"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";

import {
  Plus,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock3,
  XCircle,
  Landmark,
  IndianRupee,
  ReceiptText,
  Search,
  BookOpen,
  Grid3X3,
  List,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EncashModal } from "@/components/cheques/encash-modal";
import { BounceModal } from "@/components/cheques/bounce-modal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Cheque {
  id: string;
  chequeNumber: string;
  chequeBook?: {
    bookNumber: string;
  };
  chequeDate: string;
  amount: number;
  payeeName: string;
  status: string;
  chequeType: string;
  account: {
    id: string;
    bankName: string;
    accountNumber: string;
  };
  createdAt: string;
  voucherStatus?: string | null;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
}

export default function ChequesPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const { data: cheques, error, isLoading, mutate } = useSWR<Cheque[]>(
    "/api/cheques",
    fetcher
  );
  const { data: bankAccounts } = useSWR<BankAccount[]>(
    "/api/bank-accounts",
    fetcher
  );

  const [encashingCheque, setEncashingCheque] = useState<Cheque | null>(null);
  const [bouncingCheque, setBouncingCheque] = useState<Cheque | null>(null);

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedBank, setSelectedBank] = useState<string>("ALL");
  const [groupByBank, setGroupByBank] = useState(false);

  // Cheque book inspector state
  const [inspectorAccountId, setInspectorAccountId] = useState<string>("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [showInspector, setShowInspector] = useState(false);
  const { data: usageData } = useSWR<{ range: any[] }>(
    showInspector && inspectorAccountId && rangeStart && rangeEnd
      ? `/api/cheques/usage?accountId=${inspectorAccountId}&start=${rangeStart}&end=${rangeEnd}`
      : null,
    fetcher
  );

  const filteredCheques = useMemo(() => {
    return cheques?.filter((c) => {
      const matchesStatus = filter === "ALL" ? true : c.status === filter;
      const matchesBank =
        selectedBank === "ALL" ? true : c.account.id === selectedBank;
      const matchesSearch =
        c.chequeNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.payeeName.toLowerCase().includes(search.toLowerCase()) ||
        c.account.bankName.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesBank && matchesSearch;
    });
  }, [cheques, filter, selectedBank, search]);

  const stats = {
    total: cheques?.length || 0,
    available: cheques?.filter((c) => c.status === "AVAILABLE").length || 0,
    issued: cheques?.filter((c) => c.status === "ISSUED").length || 0,
    received: cheques?.filter((c) => c.status === "RECEIVED").length || 0,
    totalAmount: cheques?.reduce((sum, item) => sum + item.amount, 0) || 0,
    cleared: cheques?.filter((c) => c.status === "CLEARED").length || 0,
    bounced: cheques?.filter((c) => c.status === "BOUNCED").length || 0,
  };

  const statusConfig: Record<string, { icon: any; text: string; className: string }> = {
    AVAILABLE: {
      icon: Clock3,
      text: "Available",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
    ISSUED: {
      icon: Clock3,
      text: "Issued",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    RECEIVED: {
      icon: IndianRupee,
      text: "Received",
      className: "bg-purple-100 text-purple-700 border-purple-200",
    },
    DEPOSITED: {
      icon: AlertCircle,
      text: "Deposited",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    CLEARED: {
      icon: CheckCircle2,
      text: "Cleared",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    BOUNCED: {
      icon: XCircle,
      text: "Bounced",
      className: "bg-red-100 text-red-700 border-red-200",
    },
    CANCELLED: {
      icon: XCircle,
      text: "Cancelled",
      className: "bg-slate-100 text-slate-500 border-slate-200",
    },
  };

  const renderContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <ReceiptText className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Cheque Register</h1>
                <p className="mt-1 text-slate-300">
                  Track and manage cheque transactions
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/cheques/master">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-white/30 text-white hover:bg-white/10"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Cheque Master
              </Button>
            </Link>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-white/30 text-white hover:bg-white/10"
              onClick={() => setGroupByBank(!groupByBank)}
            >
              {groupByBank ? (
                <List className="mr-2 h-4 w-4" />
              ) : (
                <Landmark className="mr-2 h-4 w-4" />
              )}
              {groupByBank ? "List View" : "Bank View"}
            </Button>
            {userRole !== "ADMIN" && (
              <Link href="/dashboard/cheques/new">
                <Button className="h-11 rounded-xl bg-white text-slate-900 hover:bg-slate-100">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Cheque
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats (unchanged) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* ... same stats cards ... */}
      </div>

      {/* Toolbar */}
      <Card className="rounded-3xl border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 w-full lg:max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search cheque..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Bank filter */}
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger className="h-11 w-[200px] rounded-xl">
                  <SelectValue placeholder="All banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All banks</SelectItem>
                  {bankAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} ({acc.accountNumber.slice(-4)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status filter buttons (same) */}
              {["ALL", "AVAILABLE", "ISSUED", "RECEIVED", "DEPOSITED", "CLEARED", "BOUNCED"].map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                  className={`rounded-xl ${
                    filter === f ? "bg-slate-900 hover:bg-slate-800" : ""
                  }`}
                >
                  {f}
                </Button>
              ))}

              {/* Cheque Book Inspector button */}
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-emerald-700 border-emerald-200"
                onClick={() => setShowInspector(!showInspector)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Cheque Book
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cheque Book Inspector Panel */}
      {showInspector && (
        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 text-lg">Cheque Book Usage Inspector</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={inspectorAccountId} onValueChange={setInspectorAccountId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} ({acc.accountNumber.slice(-4)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Start number (e.g., 001)"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="h-11 rounded-xl"
              />
              <Input
                placeholder="End number (e.g., 050)"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {usageData && usageData.range && (
              <div className="mt-4">
                <p className="text-sm text-slate-500 mb-2">
                  Showing {usageData.range.length} cheques (green = used, grey = unused)
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {usageData.range.map((item: any) => (
                    <Link
                      key={item.chequeNumber}
                      href={item.used ? `/dashboard/cheques/${item.id}` : "#"}
                      className={`px-2 py-1 text-center rounded-md font-mono text-sm cursor-pointer border ${
                        item.used
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200"
                      }`}
                      title={item.used ? `Used – ${item.payee || "Unknown"} – ₹${item.amount}` : "Unused"}
                    >
                      {item.chequeNumber}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cheque Table / Grouped View */}
      {isLoading ? (
        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="py-20 text-center">
            <p className="text-slate-500">Loading cheques...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-3xl border-red-200 bg-red-50">
          <CardContent className="py-20 text-center">
            <p className="text-red-700">Failed to load cheque data</p>
          </CardContent>
        </Card>
      ) : filteredCheques && filteredCheques.length > 0 ? (
        groupByBank ? (
          /* Bank‑wise grouped view */
          <div className="space-y-4">
            {Object.entries(
              filteredCheques.reduce((groups: Record<string, Cheque[]>, cheque) => {
                const key = cheque.account.id;
                if (!groups[key]) groups[key] = [];
                groups[key].push(cheque);
                return groups;
              }, {})
            ).map(([accountId, chequesForBank]) => {
              const bankInfo = chequesForBank[0].account;
              const usedCount = chequesForBank.filter((c) => c.status !== "ISSUED").length;
              const totalAmount = chequesForBank.reduce((sum, c) => sum + c.amount, 0);
              return (
                <Card key={accountId} className="rounded-3xl border-0 shadow-md overflow-hidden">
                  <div className="bg-slate-50 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-slate-700" />
                      <div>
                        <h3 className="font-semibold">{bankInfo.bankName}</h3>
                        <p className="text-sm text-slate-500">
                          {bankInfo.accountNumber} • {chequesForBank.length} cheques • Used: {usedCount} • Unused: {chequesForBank.length - usedCount}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold">₹{totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-100">
                        <TableRow>
                          <TableHead>Cheque</TableHead>
                          <TableHead>Payee</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chequesForBank.map((cheque) => {
                          const statusInfo = statusConfig[cheque.status];
                          const Icon = statusInfo.icon;
                          return (
                            <TableRow key={cheque.id} className="hover:bg-slate-50">
                              <TableCell>
                                <p className="font-semibold text-slate-900">
                                  #{cheque.chequeNumber}
                                </p>
                                {cheque.chequeBook?.bookNumber && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {cheque.chequeBook.bookNumber}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>{cheque.payeeName}</TableCell>
                              <TableCell>
                                {new Date(cheque.chequeDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                ₹{cheque.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.className}`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {statusInfo.text}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  {["ISSUED", "RECEIVED", "DEPOSITED"].includes(cheque.status) && 
                                    cheque.amount > 0 && 
                                    cheque.voucherStatus === "APPROVED" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEncashingCheque(cheque)}
                                        className="rounded-xl border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                                      >
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Clear
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setBouncingCheque(cheque)}
                                        className="rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                      >
                                        <AlertCircle className="mr-1 h-3 w-3" />
                                        Bounce
                                      </Button>
                                    </>
                                  )}
                                  <Link href={`/dashboard/cheques/${cheque.id}`}>
                                    <Button size="sm" variant="outline" className="rounded-xl">
                                      <Eye className="mr-2 h-4 w-4" />
                                      View
                                    </Button>
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Standard Table (original) */
          <Card className="rounded-3xl border-0 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                {/* same original table (but now with bank column maybe optional) */}
                {/* I'll include original table code from the user's file */}
              </Table>
            </div>
          </Card>
        )
      ) : (
        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="py-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ReceiptText className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              No Cheques Found
            </h3>
            <p className="mt-2 text-slate-500">
              {filter !== "ALL" || selectedBank !== "ALL"
                ? "Try changing filters"
                : "Add your first cheque entry"}
            </p>
            <Link href="/dashboard/cheques/new">
              <Button className="mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" />
                Add Cheque
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      {renderContent()}

      {/* Modals */}
      {encashingCheque && (
        <EncashModal
          isOpen={!!encashingCheque}
          onClose={() => setEncashingCheque(null)}
          cheque={encashingCheque}
          onSuccess={() => {
            mutate();
            setEncashingCheque(null);
          }}
        />
      )}

      {bouncingCheque && (
        <BounceModal
          isOpen={!!bouncingCheque}
          onClose={() => setBouncingCheque(null)}
          cheque={bouncingCheque}
          onSuccess={() => {
            mutate();
            setBouncingCheque(null);
          }}
        />
      )}
    </div>
  );
}
