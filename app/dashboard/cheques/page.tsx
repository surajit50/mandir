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
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Cheque {
  id: string;
  registerNo: string;
  chequeNumber: string;
  chequeDate: string;
  amount: number;
  drawee: string;
  payee: string;
  status: string;
  remarks?: string;

  account: {
    id: string;
    bankName: string;
    accountNumber: string;
  };

  createdAt: string;
}

export default function ChequesPage() {
  const {
    data: cheques,
    error,
    isLoading,
  } = useSWR<Cheque[]>("/api/cheques", fetcher);

  const [filter, setFilter] = useState("ALL");

  const [search, setSearch] = useState("");

  const filteredCheques = useMemo(() => {
    return cheques?.filter((c) => {
      const matchesFilter = filter === "ALL" ? true : c.status === filter;

      const matchesSearch =
        c.chequeNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.payee.toLowerCase().includes(search.toLowerCase()) ||
        c.account.bankName.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [cheques, filter, search]);

  const stats = {
    total: cheques?.length || 0,

    totalAmount: cheques?.reduce((sum, item) => sum + item.amount, 0) || 0,

    cleared: cheques?.filter((c) => c.status === "CLEARED").length || 0,

    bounced: cheques?.filter((c) => c.status === "BOUNCED").length || 0,
  };

  const statusConfig: Record<
    string,
    {
      icon: any;
      text: string;
      className: string;
    }
  > = {
    ISSUED: {
      icon: Clock3,
      text: "Issued",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
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
  };

  return (
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

          <Link href="/dashboard/cheques/new">
            <Button className="h-11 rounded-xl bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="mr-2 h-4 w-4" />
              Add New Cheque
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-0 shadow-md rounded-3xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Cheques</p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  {stats.total}
                </h2>
              </div>

              <div className="rounded-2xl bg-slate-100 p-3">
                <ReceiptText className="h-6 w-6 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-3xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Amount</p>

                <h2 className="mt-2 text-3xl font-bold text-green-600">
                  ₹{stats.totalAmount.toLocaleString()}
                </h2>
              </div>

              <div className="rounded-2xl bg-green-100 p-3">
                <IndianRupee className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-3xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Cleared</p>

                <h2 className="mt-2 text-3xl font-bold text-blue-600">
                  {stats.cleared}
                </h2>
              </div>

              <div className="rounded-2xl bg-blue-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-3xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Bounced</p>

                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {stats.bounced}
                </h2>
              </div>

              <div className="rounded-2xl bg-red-100 p-3">
                <XCircle className="h-6 w-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="rounded-3xl border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <Input
                placeholder="Search cheque..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {["ALL", "ISSUED", "DEPOSITED", "CLEARED", "BOUNCED"].map((f) => (
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
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
        <Card className="rounded-3xl border-0 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead>Cheque</TableHead>

                  <TableHead>Payee</TableHead>

                  <TableHead>Bank</TableHead>

                  <TableHead>Date</TableHead>

                  <TableHead className="text-right">Amount</TableHead>

                  <TableHead>Status</TableHead>

                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredCheques.map((cheque) => {
                  const statusInfo = statusConfig[cheque.status];

                  const Icon = statusInfo.icon;

                  return (
                    <TableRow key={cheque.id} className="hover:bg-slate-50">
                      {/* Cheque */}
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">
                            #{cheque.chequeNumber}
                          </p>

                          <p className="text-xs text-slate-500">
                            Reg:
                            {cheque.registerNo}
                          </p>
                        </div>
                      </TableCell>

                      {/* Payee */}
                      <TableCell>
                        <div>
                          <p className="font-medium">{cheque.payee}</p>

                          <p className="text-xs text-slate-500">
                            {cheque.drawee}
                          </p>
                        </div>
                      </TableCell>

                      {/* Bank */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-slate-100 p-2">
                            <Landmark className="h-4 w-4 text-slate-600" />
                          </div>

                          <div>
                            <p className="font-medium">
                              {cheque.account.bankName}
                            </p>

                            <p className="text-xs text-slate-500">
                              A/C ••••
                              {cheque.account.accountNumber.slice(-4)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        {new Date(cheque.chequeDate).toLocaleDateString()}
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="text-right font-bold text-slate-900">
                        ₹{cheque.amount.toLocaleString()}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.className}`}
                        >
                          <Icon className="h-3.5 w-3.5" />

                          {statusInfo.text}
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Link href={`/dashboard/cheques/${cheque.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="py-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ReceiptText className="h-8 w-8 text-slate-500" />
            </div>

            <h3 className="text-lg font-semibold text-slate-900">
              No Cheques Found
            </h3>

            <p className="mt-2 text-slate-500">Add your first cheque entry</p>

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
}
