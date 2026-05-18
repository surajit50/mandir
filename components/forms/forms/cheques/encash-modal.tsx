"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

interface EncashModalProps {
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

export function EncashModal({ cheque, isOpen, onClose, onSuccess }: EncashModalProps) {
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [clearedDate, setClearedDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchBankAccounts();
    }
  }, [isOpen]);

  const fetchBankAccounts = async () => {
    try {
      setIsFetchingAccounts(true);
      const response = await fetch("/api/bank-accounts");
      if (!response.ok) throw new Error("Failed to fetch bank accounts");
      const data = await response.json();
      setBankAccounts(data);
      if (data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err: any) {
      setError("Failed to load bank accounts");
      console.error(err);
    } finally {
      setIsFetchingAccounts(false);
    }
  };

  const handleEncash = async () => {
    if (!selectedAccountId) {
      setError("Please select a bank account");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/cheques/${cheque.id}/encash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearedDate: new Date(clearedDate).toISOString(),
          bankAccountId: selectedAccountId,
          remarks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to encash cheque");
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
          <CardTitle>Encash Cheque</CardTitle>
          <CardDescription>Process cheque #{cheque.chequeNumber}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cheque Details */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
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

          {/* Bank Account Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Deposit to Bank Account
            </label>
            {isFetchingAccounts ? (
              <div className="text-sm text-slate-600">Loading bank accounts...</div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-sm text-red-600">No bank accounts found</div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} - {account.accountNumber}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cleared Date */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Cleared Date
            </label>
            <input
              type="date"
              value={clearedDate}
              onChange={(e) => setClearedDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this cheque encashment..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm min-h-20 resize-none"
            />
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
              onClick={handleEncash}
              disabled={isLoading || bankAccounts.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Processing..." : "Encash Cheque"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
