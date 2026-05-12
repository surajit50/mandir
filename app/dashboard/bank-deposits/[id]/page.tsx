"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { ArrowLeft, Building2, Calendar, Hash, StickyNote, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const error = new Error(payload?.error || "Failed to fetch deposit");
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return res.json();
};

interface BankDepositDetail {
  id: string;
  depositNumber: string;
  depositDate: string;
  totalAmount: number;
  depositType: "CASH" | "CHEQUE" | "MIXED";
  status: "PENDING" | "VERIFIED" | "REJECTED";
  remarks?: string | null;
  verifiedByBank: boolean;
  account: {
    bankName: string;
    accountNumber: string;
  };
  cheques: Array<{
    id: string;
    chequeNumber: string;
    amount: number;
    status: string;
  }>;
}

export default function BankDepositDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const { mutate } = useSWRConfig();
  const [isVerifying, setIsVerifying] = useState(false);
  const [actionError, setActionError] = useState("");

  const {
    data: deposit,
    error,
    isLoading,
  } = useSWR<BankDepositDetail>(id ? `/api/bank-deposits/${id}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const statusColor =
    deposit?.status === "VERIFIED"
      ? "bg-green-100 text-green-700"
      : deposit?.status === "REJECTED"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700";

  const handleVerify = async (newStatus: "VERIFIED" | "REJECTED") => {
    if (!deposit) return;
    setIsVerifying(true);
    setActionError("");
    try {
      const response = await fetch(`/api/bank-deposits/${deposit.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to verify deposit");
      }
      mutate(`/api/bank-deposits/${deposit.id}`);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <p className="text-slate-600">Loading deposit details...</p>
      </div>
    );
  }

  if (error) {
    const isNotFound = (error as Error & { status?: number }).status === 404;
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">
          {isNotFound ? "Deposit not found" : "Unable to load deposit"}
        </h1>
        <p className="text-slate-600">
          {isNotFound
            ? "The requested bank deposit record does not exist."
            : "Please try again in a moment."}
        </p>
        <Link href="/dashboard/bank-deposits">
          <Button variant="outline">Back to Deposits</Button>
        </Link>
      </div>
    );
  }

  if (!deposit) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bank Deposit Details</h1>
          <p className="text-slate-600 mt-1">{deposit.depositNumber}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {deposit.status === "PENDING" && (
          <div className="flex gap-2">
            {actionError && (
              <p className="text-xs text-red-600 self-center">{actionError}</p>
            )}
            <Button
              variant="outline"
              onClick={() => handleVerify("REJECTED")}
              disabled={isVerifying}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              <span className="ml-1">Reject</span>
            </Button>
            <Button
              onClick={() => handleVerify("VERIFIED")}
              disabled={isVerifying}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span className="ml-1">Verify Deposit</span>
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Deposit Number
            </p>
            <p className="font-medium">{deposit.depositNumber}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Deposit Date
            </p>
            <p className="font-medium">
              {new Date(deposit.depositDate).toLocaleDateString()}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Bank Account
            </p>
            <p className="font-medium">
              {deposit.account.bankName} - {deposit.account.accountNumber}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Status</p>
            <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor}`}>
              {deposit.status}
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Total Amount</p>
            <p className="text-2xl font-bold text-slate-900">
              ₹{deposit.totalAmount.toLocaleString()}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Type</p>
            <p className="font-medium">{deposit.depositType}</p>
          </div>
          {deposit.remarks && (
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Remarks
              </p>
              <p className="font-medium">{deposit.remarks}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Cheques</CardTitle>
        </CardHeader>
        <CardContent>
          {deposit.cheques.length === 0 ? (
            <p className="text-slate-600">No cheques linked to this deposit.</p>
          ) : (
            <div className="space-y-3">
              {deposit.cheques.map((cheque) => (
                <div
                  key={cheque.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">Cheque #{cheque.chequeNumber}</p>
                    <p className="text-sm text-slate-600">Status: {cheque.status}</p>
                  </div>
                  <p className="font-semibold">₹{cheque.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
