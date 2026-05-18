"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

interface BounceModalProps {
  cheque: {
    id: string;
    chequeNumber: string;
    amount: number;
    payeeName: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BounceModal({ cheque, isOpen, onClose, onSuccess }: BounceModalProps) {
  const [bounceDate, setBounceDate] = useState(new Date().toISOString().split("T")[0]);
  const [bounceReason, setBounceReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const bounceReasons = [
    "Insufficient Funds",
    "Cheque Number Mismatch",
    "Signature Mismatch",
    "Account Closed",
    "Post-Dated Cheque",
    "Stale Cheque",
    "Invalid Account Number",
    "Other",
  ];

  const handleBounce = async () => {
    if (!bounceReason) {
      setError("Please select or enter a bounce reason");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/cheques/${cheque.id}/bounce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bounceDate: new Date(bounceDate).toISOString(),
          bounceReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to record cheque bounce");
      }

      setError("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Mark Cheque as Bounced
          </CardTitle>
          <CardDescription>Record cheque bounce for #{cheque.chequeNumber}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cheque Details */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Cheque Number</p>
              <p className="font-bold">{cheque.chequeNumber}</p>

              <p className="text-sm text-slate-600 mt-3">Amount</p>
              <p className="font-bold text-lg">₹{cheque.amount.toLocaleString()}</p>

              <p className="text-sm text-slate-600 mt-3">Payee</p>
              <p className="font-medium">{cheque.payeeName}</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded p-3">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Bounce Date */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Bounce Date
            </label>
            <input
              type="date"
              value={bounceDate}
              onChange={(e) => setBounceDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          {/* Bounce Reason */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Bounce Reason
            </label>
            <select
              value={bounceReason}
              onChange={(e) => setBounceReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-2"
            >
              <option value="">Select a reason...</option>
              {bounceReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
            {bounceReason === "Other" && (
              <textarea
                placeholder="Please specify the bounce reason..."
                onChange={(e) => setBounceReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm min-h-20 resize-none"
              />
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This action will reverse the cheque amount in the cash book.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBounce}
              disabled={isLoading || !bounceReason}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Processing..." : "Record Bounce"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
