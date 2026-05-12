"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ReconciliationItem {
  id: string;
  itemType: string;
  amount: number;
  description?: string;
}

interface ChequeTransaction {
  id: string;
  date: string;
  description: string;
  chequeNumber: string | null;
  payeeName: string | null;
  amount: number;
  type: "RECEIVED" | "ISSUED";
  referenceType: string;
  depositType?: string;
  clearedDate?: string;
}

interface OutstandingCheque {
  id: string;
  chequeNumber: string;
  payeeName: string;
  amount: number;
  chequeDate: string;
  status: string;
}

interface ChequeTransactions {
  credits: ChequeTransaction[];
  debits: ChequeTransaction[];
  outstanding: OutstandingCheque[];
  totalCredits: number;
  totalDebits: number;
  netBalance: number;
}

interface ReconciliationDetail {
  id: string;
  reconciliationDate: string;
  bankBalance: number;
  bookBalance: number;
  difference: number;
  status: string;
  remarks?: string;
  account: {
    id: string;
    accountNumber: string;
    bankName: string;
  };
  reconciliationItems: ReconciliationItem[];
  chequeTransactions?: ChequeTransactions;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export default function ReconciliationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reconId = params.id as string;

  const [recon, setRecon] = useState<ReconciliationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    const fetchRecon = async () => {
      try {
        const response = await fetch(`/api/bank-reconciliation/${reconId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch reconciliation");
        }
        const data = await response.json();
        setRecon(data);
      } catch (err) {
        setError("Failed to load reconciliation details");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecon();
  }, [reconId]);

  const handleApprove = async (approve: boolean) => {
    setIsApproving(true);
    try {
      const response = await fetch(
        `/api/bank-reconciliation/${reconId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve reconciliation");
      }

      const updatedRecon = await response.json();
      setRecon(updatedRecon);
    } catch (err) {
      setError("Failed to approve reconciliation");
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading reconciliation details...</p>
      </div>
    );
  }

  if (error || !recon) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/bank-reconciliation">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reconciliations
          </Button>
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDifference = recon.difference !== 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/bank-reconciliation">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">
            Bank Reconciliation
          </h1>
        </div>
        {recon.status !== "APPROVED" && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleApprove(false)}
              variant="outline"
              disabled={isApproving}
            >
              Reject
            </Button>
            <Button
              onClick={() => handleApprove(true)}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isApproving ? "Processing..." : "Approve"}
            </Button>
          </div>
        )}
      </div>

      {/* Status Banner */}
      {recon.status === "APPROVED" && (
        <div className="flex gap-2 items-start bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Approved Reconciliation</p>
            <p className="text-sm text-green-700">
              Approved on {new Date(recon.approvedAt || "").toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Account & Date Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-2">Bank Account</p>
            <p className="font-semibold text-slate-900">{recon.account.bankName}</p>
            <p className="text-xs text-slate-500">{recon.account.accountNumber}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-2">Reconciliation Date</p>
            <p className="font-semibold text-slate-900">
              {new Date(recon.reconciliationDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-2">Status</p>
            <span
              className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                recon.status === "APPROVED"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {recon.status}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Balance Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Bank Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              ₹{recon.bankBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Cash Book Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              ₹{recon.bookBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className={isDifference ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${
              isDifference ? "text-yellow-600" : "text-green-600"
            }`}>
              Difference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              isDifference ? "text-yellow-600" : "text-green-600"
            }`}>
              ₹{recon.difference.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Items */}
      {recon.reconciliationItems && recon.reconciliationItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Items</CardTitle>
            <CardDescription>Items explaining the difference</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-4 font-semibold text-slate-900">Type</th>
                    <th className="text-right py-2 px-4 font-semibold text-slate-900">Amount</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-900">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {recon.reconciliationItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">{item.itemType}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        ₹{item.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.description || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cheque Transactions - Received & Issued */}
      {recon.chequeTransactions && (
        <Card>
          <CardHeader>
            <CardTitle>Cheque Transactions</CardTitle>
            <CardDescription>
              All cheques received and issued with their encashment dates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs text-green-700 uppercase tracking-wide mb-1">Total Received (Credits)</p>
                <p className="text-xl font-bold text-green-700">
                  ₹{recon.chequeTransactions.totalCredits.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">{recon.chequeTransactions.credits.length} transactions</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-xs text-red-700 uppercase tracking-wide mb-1">Total Issued (Debits)</p>
                <p className="text-xl font-bold text-red-700">
                  ₹{recon.chequeTransactions.totalDebits.toLocaleString()}
                </p>
                <p className="text-xs text-red-600 mt-1">{recon.chequeTransactions.debits.length} transactions</p>
              </div>
              <div className={`${recon.chequeTransactions.netBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} rounded-lg p-4`}>
                <p className="text-xs text-slate-700 uppercase tracking-wide mb-1">Net Balance</p>
                <p className={`text-xl font-bold ${recon.chequeTransactions.netBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  ₹{recon.chequeTransactions.netBalance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* All Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Cheque No.</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Payee</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Type</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Encashment Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Credits (Received) */}
                  {recon.chequeTransactions.credits.map((entry) => (
                    <tr
                      key={`credit-${entry.id}`}
                      className="border-b border-slate-100 hover:bg-green-50"
                    >
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{entry.description}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {entry.chequeNumber ? `#${entry.chequeNumber}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {entry.payeeName || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Received
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {entry.date ? new Date(entry.date).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-semibold">
                        +₹{entry.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {/* Debits (Issued) */}
                  {recon.chequeTransactions.debits.map((entry) => (
                    <tr
                      key={`debit-${entry.id}`}
                      className="border-b border-slate-100 hover:bg-red-50"
                    >
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {entry.clearedDate ? new Date(entry.clearedDate).toLocaleDateString() : new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{entry.description}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {entry.chequeNumber ? `#${entry.chequeNumber}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {entry.payeeName || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Issued
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {entry.clearedDate ? new Date(entry.clearedDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600 font-semibold">
                        -₹{entry.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {/* Empty state */}
                  {recon.chequeTransactions.credits.length === 0 && recon.chequeTransactions.debits.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No cheque transactions found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* Total row */}
                {(recon.chequeTransactions.credits.length > 0 || recon.chequeTransactions.debits.length > 0) && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td colSpan={6} className="py-3 px-4 text-right font-bold text-slate-900">
                        Net Balance:
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        recon.chequeTransactions.netBalance >= 0 ? "text-blue-600" : "text-red-600"
                      }`}>
                        ₹{recon.chequeTransactions.netBalance.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Outstanding Cheques */}
            {recon.chequeTransactions.outstanding.length > 0 && (
              <div className="space-y-3">
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                    Outstanding Cheques (Not Yet Cleared) - {recon.chequeTransactions.outstanding.length}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">Cheque No.</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">Payee</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">Date</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">Amount</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recon.chequeTransactions.outstanding.map((chq) => (
                          <tr key={chq.id} className="border-b border-slate-100 hover:bg-amber-50">
                            <td className="py-2 px-3 font-medium text-slate-900">#{chq.chequeNumber}</td>
                            <td className="py-2 px-3 text-slate-700">{chq.payeeName}</td>
                            <td className="py-2 px-3 text-slate-600">{new Date(chq.chequeDate).toLocaleDateString()}</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">₹{chq.amount.toLocaleString()}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                chq.status === "ISSUED" 
                                  ? "bg-yellow-100 text-yellow-700" 
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {chq.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-amber-50/50">
                          <td colSpan={3} className="py-2 px-3 text-right font-bold text-amber-800">
                            Total Outstanding:
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-amber-800">
                            ₹{recon.chequeTransactions.outstanding.reduce((s, c) => s + c.amount, 0).toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Remarks */}
      {recon.remarks && (
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">{recon.remarks}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
