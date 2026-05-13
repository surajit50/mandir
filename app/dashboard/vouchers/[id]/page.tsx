"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Printer,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface VoucherDetail {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: "PAYMENT" | "RECEIPT";
  amount: number;
  description: string;
  paymentMethod: string;
  status: string;
  payee: {
    id: string;
    name: string;
    email: string;
  };
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export default function VoucherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params.id as string;

  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        const response = await fetch(`/api/vouchers/${voucherId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch voucher");
        }
        const data = await response.json();
        setVoucher(data);
      } catch (err) {
        setError("Failed to load voucher details");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoucher();
  }, [voucherId]);

  const handlePrint = async () => {
    try {
      const printWindow = window.open(
        `/api/vouchers/${voucherId}/print`,
        "VoucherPrint",
        "width=900,height=700",
      );

      if (printWindow) {
        printWindow.addEventListener("load", () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        });
      }
    } catch (err) {
      setError("Failed to print voucher");
      console.error(err);
    }
  };

  const handleApprove = async (approve: boolean) => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/vouchers/${voucherId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve voucher");
      }

      const updatedVoucher = await response.json();
      setVoucher(updatedVoucher);
    } catch (err: any) {
      setError(err.message || "Failed to approve voucher");
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading voucher details...</p>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/vouchers">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vouchers
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

  const paymentMethodColors: Record<string, string> = {
    CASH: "bg-blue-100 text-blue-700",
    CHEQUE: "bg-purple-100 text-purple-700",
    BANK_TRANSFER: "bg-green-100 text-green-700",
    ONLINE: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/vouchers">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">
            {voucher.voucherType === "PAYMENT" ? "Payment" : "Receive"} Voucher
            Details
          </h1>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>

          {/* Admin Actions: Approve/Reject */}
          {userRole === "ADMIN" && (voucher.status === "SUBMITTED" || voucher.status === "DRAFT") && (
            <>
              <Button
                onClick={() => handleApprove(false)}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={isApproving}
              >
                Reject
              </Button>
              <Button
                onClick={() => handleApprove(true)}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isApproving ? "Processing..." : "Approve"}
              </Button>
            </>
          )}

          {/* Accountant Actions: Edit/Delete for Draft or Rejected */}
          {userRole !== "ADMIN" &&
            (voucher.status === "DRAFT" || voucher.status === "REJECTED") && (
              <div className="flex gap-2">
                <Link href={`/dashboard/vouchers/${voucher.id}/edit`}>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                </Link>
              </div>
            )}
        </div>
      </div>

      {/* Status Banners */}
      {voucher.status === "APPROVED" && (
        <div className="flex gap-2 items-start bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Approved Voucher</p>
            <p className="text-sm text-green-700">
              Approved on{" "}
              {new Date(voucher.approvedAt || "").toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {voucher.status === "REJECTED" && (
        <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Voucher Rejected</p>
            <p className="text-sm text-red-700">
              This voucher was rejected and needs revision.
            </p>
          </div>
        </div>
      )}

      {voucher.status === "SUBMITTED" && (
        <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg p-4">
          <Loader2 className="w-5 h-5 text-amber-600 mt-0.5 animate-spin flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Pending Approval</p>
            <p className="text-sm text-amber-700">
              This voucher has been submitted and is waiting for review.
            </p>
          </div>
        </div>
      )}

      {voucher.status === "DRAFT" && (
        <div className="flex gap-2 items-start bg-slate-50 border border-slate-200 rounded-lg p-4">
          <Clock className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-slate-800">Draft Voucher</p>
            <p className="text-sm text-slate-700">
              This voucher is currently in draft. Admins can review and approve it.
            </p>
          </div>
        </div>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Voucher Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">Voucher Number</p>
              <p className="font-bold text-lg text-slate-900">
                {voucher.voucherNumber}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Voucher Date</p>
              <p className="font-medium text-slate-900">
                {new Date(voucher.voucherDate).toLocaleDateString()}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">
                {voucher.voucherType === "PAYMENT" ? "Payee" : "Payer"}
              </p>
              <p className="font-medium text-slate-900">{voucher.payee.name}</p>
              <p className="text-sm text-slate-500">{voucher.payee.email}</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Amount</p>
              <p className="text-3xl font-bold text-blue-600">
                ₹{voucher.amount.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voucher Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">Voucher Type</p>
              <span
                className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                  voucher.voucherType === "PAYMENT"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {voucher.voucherType === "PAYMENT"
                  ? "Payment"
                  : "Receipt (Receive)"}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Payment Method</p>
              <span
                className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                  paymentMethodColors[voucher.paymentMethod]
                }`}
              >
                {voucher.paymentMethod.replace("_", " ")}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Status</p>
              <span
                className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                  voucher.status === "APPROVED"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {voucher.status}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Created</p>
              <p className="font-medium text-slate-900">
                {new Date(voucher.createdAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 whitespace-pre-wrap">
            {voucher.description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
