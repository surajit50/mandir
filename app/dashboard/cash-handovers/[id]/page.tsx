"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CashHandoverDetail {
  id: string;
  handoverDate: string;
  totalAmount: number;
  numberOfNotes?: Record<string, number>;
  status: string;
  remarks?: string;
  handoverFromUser: {
    id: string;
    name: string;
    email: string;
  };
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export default function CashHandoverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const handoverId = params.id as string;

  const [handover, setHandover] = useState<CashHandoverDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    const fetchHandover = async () => {
      try {
        const response = await fetch(`/api/cash-handovers/${handoverId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch handover");
        }
        const data = await response.json();
        setHandover(data);
      } catch (err) {
        setError("Failed to load handover details");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHandover();
  }, [handoverId]);

  const handleApprove = async (approve: boolean) => {
    setIsApproving(true);
    try {
      const response = await fetch(
        `/api/cash-handovers/${handoverId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve handover");
      }

      const updatedHandover = await response.json();
      setHandover(updatedHandover);
    } catch (err) {
      setError("Failed to approve handover");
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading handover details...</p>
      </div>
    );
  }

  if (error || !handover) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/cash-handovers">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Handovers
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/cash-handovers">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">
            Cash Handover Details
          </h1>
        </div>
        {handover.status !== "APPROVED" && (
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
      {handover.status === "APPROVED" && (
        <div className="flex gap-2 items-start bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Approved Handover</p>
            <p className="text-sm text-green-700">
              Approved on {new Date(handover.approvedAt || "").toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Handover Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">From</p>
              <p className="font-medium text-slate-900">{handover.handoverFromUser.name}</p>
              <p className="text-sm text-slate-500">{handover.handoverFromUser.email}</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Handover Date</p>
              <p className="font-medium text-slate-900">
                {new Date(handover.handoverDate).toLocaleDateString()}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Total Amount</p>
              <p className="text-3xl font-bold text-blue-600">
                ₹{handover.totalAmount.toLocaleString()}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Status</p>
              <span
                className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                  handover.status === "APPROVED"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {handover.status}
              </span>
            </div>
          </CardContent>
        </Card>

        {handover.remarks && (
          <Card>
            <CardHeader>
              <CardTitle>Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">{handover.remarks}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Denominations */}
      {handover.numberOfNotes && Object.keys(handover.numberOfNotes).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Currency Denominations</CardTitle>
            <CardDescription>Breakdown of notes in this handover</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(handover.numberOfNotes)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([denomination, count]) =>
                  count > 0 ? (
                    <div key={denomination} className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600">₹{denomination}</p>
                      <p className="text-2xl font-bold text-slate-900">{count}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        ₹{(parseInt(denomination) * count).toLocaleString()}
                      </p>
                    </div>
                  ) : null
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-slate-900">Total:</p>
                <p className="text-2xl font-bold text-slate-900">
                  ₹{handover.totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
