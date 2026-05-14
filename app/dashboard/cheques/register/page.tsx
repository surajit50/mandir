"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, CheckCircle, AlertCircle, Clock, XCircle, TrendingUp, Ban } from "lucide-react";
import useSWR from "swr";
import { EncashModal } from "@/components/cheques/encash-modal";
import { BounceModal } from "@/components/cheques/bounce-modal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Cheque {
  id: string;
  chequeNumber: string;
  chequeDate: string;
  amount: number;
  status: string;
  payeeName: string;
  clearedDate?: string;
  bounceDate?: string;
  bounceReason?: string;
  account: {
    id: string;
    bankName: string;
    accountNumber: string;
  };
  createdAt: string;
}

export default function ChequeRegisterPage() {
  const { data: cheques, error, isLoading, mutate } = useSWR<Cheque[]>(
    "/api/cheques",
    fetcher
  );

  const [filter, setFilter] = useState("ALL");
  const [encashingCheque, setEncashingCheque] = useState<Cheque | null>(null);
  const [bouncingCheque, setBouncingCheque] = useState<Cheque | null>(null);
  const [cancellingChequeId, setCancellingChequeId] = useState<string | null>(null);

  const filteredCheques = cheques?.filter((c) => {
    if (filter === "ALL") return true;
    return c.status === filter;
  });

  const sortedCheques = [...(filteredCheques || [])].sort((a, b) => {
    const numA = Number.parseInt(a.chequeNumber, 10);
    const numB = Number.parseInt(b.chequeNumber, 10);
    if (Number.isNaN(numA) || Number.isNaN(numB)) {
      return a.chequeNumber.localeCompare(b.chequeNumber);
    }
    return numA - numB;
  });

  const statusConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
    ISSUED: { icon: Clock, color: "text-yellow-600", bgColor: "bg-yellow-100" },
    DEPOSITED: { icon: AlertCircle, color: "text-blue-600", bgColor: "bg-blue-100" },
    CLEARED: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
    BOUNCED: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100" },
    CANCELLED: { icon: Ban, color: "text-slate-600", bgColor: "bg-slate-200" },
  };

  const stats = {
    total: cheques?.length || 0,
    issued: cheques?.filter((c) => c.status === "ISSUED").length || 0,
    deposited: cheques?.filter((c) => c.status === "DEPOSITED").length || 0,
    cleared: cheques?.filter((c) => c.status === "CLEARED").length || 0,
    bounced: cheques?.filter((c) => c.status === "BOUNCED").length || 0,
    cancelled: cheques?.filter((c) => c.status === "CANCELLED").length || 0,
  };

  const totalClearedAmount = cheques
    ?.filter((c) => c.status === "CLEARED")
    .reduce((sum, c) => sum + c.amount, 0) || 0;

  const handleEncashSuccess = () => {
    mutate();
    setEncashingCheque(null);
  };

  const handleBounceSuccess = () => {
    mutate();
    setBouncingCheque(null);
  };

  const handleCancelCheque = async (chequeId: string) => {
    const confirmed = window.confirm("Cancel this cheque? This cannot be used for voucher payment.");
    if (!confirmed) return;

    setCancellingChequeId(chequeId);
    try {
      const response = await fetch(`/api/cheques/${chequeId}`, {
        method: "PATCH",
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.error || "Failed to cancel cheque");
        return;
      }
      mutate();
    } catch (error) {
      console.error(error);
      alert("Failed to cancel cheque");
    } finally {
      setCancellingChequeId(null);
    }
  };

  const getPayeeName = (cheque: Cheque): string => {
    if (cheque.amount === 0) return "Unassigned Leaf";
    return cheque.payeeName;
  };

  const isBlankLeaf = (cheque: Cheque): boolean => {
    return cheque.amount === 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cheque Register</h1>
          <p className="text-slate-600 mt-1">Track all issued and cleared cheques</p>
        </div>
        <Link href="/dashboard/cheques/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Cheque
          </Button>
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-600">Total Cheques</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-600">Issued</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.issued}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-600">Deposited</p>
              <p className="text-2xl font-bold text-blue-600">{stats.deposited}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-600">Cleared</p>
              <p className="text-2xl font-bold text-green-600">{stats.cleared}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-600">Bounced</p>
              <p className="text-2xl font-bold text-red-600">{stats.bounced}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-slate-600">Cancelled</p>
              <p className="text-2xl font-bold text-slate-700">{stats.cancelled}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Cleared Amount */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-slate-600">Total Cleared Amount</p>
              <p className="text-3xl font-bold text-green-700">₹{totalClearedAmount.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "ISSUED", "DEPOSITED", "CLEARED", "BOUNCED", "CANCELLED"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            onClick={() => setFilter(status)}
            size="sm"
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Cheques Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cheque Records</CardTitle>
          <CardDescription>
            Showing {sortedCheques.length} of {stats.total} cheques
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-slate-600">Loading cheques...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load cheques</p>
            </div>
          ) : sortedCheques.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Cheque #</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Payee</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Bank</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">Amount</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-900">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedCheques.map((cheque) => {
                    const isBlank = isBlankLeaf(cheque);
                    const config = statusConfig[cheque.status] || statusConfig.ISSUED;
                    const StatusIcon = config.icon;
                    const payeeName = getPayeeName(cheque);

                    return (
                      <tr key={cheque.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {cheque.chequeNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {new Date(cheque.chequeDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {isBlank ? (
                            <span className="text-slate-500 italic">{payeeName}</span>
                          ) : (
                            payeeName
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="text-sm">
                            <p className="font-medium">{cheque.account.bankName}</p>
                            <p className="text-slate-500">{cheque.account.accountNumber}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {isBlank ? "—" : `₹${cheque.amount.toLocaleString()}`}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor}`}>
                            <StatusIcon className={`w-4 h-4 ${config.color}`} />
                            <span className={`text-sm font-medium ${config.color}`}>
                              {cheque.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            {cheque.status === "ISSUED" && !isBlank && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEncashingCheque(cheque)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Encash
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setBouncingCheque(cheque)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Bounce
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelCheque(cheque.id)}
                                  className="text-slate-600 hover:text-slate-700"
                                  disabled={cancellingChequeId === cheque.id}
                                >
                                  {cancellingChequeId === cheque.id ? "Cancelling..." : "Cancel"}
                                </Button>
                              </>
                            )}
                            {cheque.status === "ISSUED" && isBlank && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelCheque(cheque.id)}
                                className="text-slate-600 hover:text-slate-700"
                                disabled={cancellingChequeId === cheque.id}
                              >
                                {cancellingChequeId === cheque.id ? "Cancelling..." : "Cancel"}
                              </Button>
                            )}
                            {cheque.status === "DEPOSITED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEncashingCheque(cheque)}
                                className="text-green-600 hover:text-green-700"
                              >
                                Clear
                              </Button>
                            )}
                            {cheque.status === "CLEARED" && (
                              <Link href={`/dashboard/cheques/${cheque.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600">No cheques found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {encashingCheque && (
        <EncashModal
          cheque={encashingCheque}
          isOpen={!!encashingCheque}
          onClose={() => setEncashingCheque(null)}
          onSuccess={handleEncashSuccess}
        />
      )}

      {bouncingCheque && (
        <BounceModal
          cheque={bouncingCheque}
          isOpen={!!bouncingCheque}
          onClose={() => setBouncingCheque(null)}
          onSuccess={handleBounceSuccess}
        />
      )}
    </div>
  );
}
