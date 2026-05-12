"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2, Plus, X, Wallet, Building2 } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  currentBalance: number;
}

interface Cheque {
  id: string;
  chequeNumber: string;
  amount: number;
  status: string;
}

export default function NewBankDepositPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [depositDate, setDepositDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [accountId, setAccountId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [depositType, setDepositType] = useState("CASH");
  const [selectedCheques, setSelectedCheques] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  const { data: accounts } = useSWR<BankAccount[]>(
    "/api/bank-accounts",
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: cheques } = useSWR<Cheque[]>("/api/cheques", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: cashBalanceData, isLoading: isLoadingCash } = useSWR(
    "/api/members/me/balance",
    fetcher,
  );

  const availableCash = cashBalanceData?.balance || 0;
  const selectedAccount = accounts?.find((a) => a.id === accountId);

  const chequesTotal = selectedCheques.reduce((sum, id) => {
    const cheque = cheques?.find((c) => c.id === id);
    return sum + (cheque?.amount || 0);
  }, 0);

  const cashPortion = Math.max(
    0,
    parseFloat(totalAmount || "0") - chequesTotal,
  );

  // Filter cheques that are issued and not already deposited
  const availableCheques =
    cheques?.filter(
      (c) => c.status === "ISSUED" && !selectedCheques.includes(c.id),
    ) || [];

  const handleAddCheque = (chequeId: string) => {
    const cheque = cheques?.find((c) => c.id === chequeId);
    if (cheque) {
      setSelectedCheques([...selectedCheques, chequeId]);
      const newTotal = parseFloat(totalAmount || "0") + cheque.amount;
      setTotalAmount(newTotal.toString());
    }
  };

  const handleRemoveCheque = (chequeId: string) => {
    const cheque = cheques?.find((c) => c.id === chequeId);
    if (cheque) {
      setSelectedCheques(selectedCheques.filter((id) => id !== chequeId));
      const newTotal = Math.max(
        0,
        parseFloat(totalAmount || "0") - cheque.amount,
      );
      setTotalAmount(newTotal.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!depositDate) {
      setError("Deposit date is required");
      return;
    }

    if (!accountId) {
      setError("Account is required");
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setError("Total amount must be greater than 0");
      return;
    }

    if (depositType !== "CHEQUE" && cashPortion > availableCash) {
      setError(
        `Cash deposit amount (₹${cashPortion.toLocaleString()}) cannot exceed available cash balance (₹${availableCash.toLocaleString()})`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bank-deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositDate: new Date(depositDate).toISOString(),
          accountId,
          totalAmount: parseFloat(totalAmount),
          depositType,
          chequeIds: selectedCheques,
          remarks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create deposit");
        return;
      }

      router.push(`/dashboard/bank-deposits/${data.id}`);
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">New Bank Deposit</h1>
        <p className="text-slate-600 mt-2">
          Record a cash or cheque deposit to the bank
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Available Cash for Deposit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCash ? (
              <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold text-blue-600">
                ₹{availableCash.toLocaleString()}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Accountant cash in hand
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Selected Account Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accountId ? (
              <p className="text-2xl font-bold text-slate-900">
                ₹{selectedAccount?.currentBalance.toLocaleString()}
              </p>
            ) : (
              <p className="text-2xl font-bold text-slate-400">₹0</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Current balance in bank
            </p>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Deposit Details</CardTitle>
            <CardDescription>Basic deposit information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="date"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  Deposit Date
                </label>
                <Input
                  id="date"
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="account"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  Bank Account
                </label>
                <select
                  id="account"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  <option value="">Select an account</option>
                  {accounts?.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="type"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  Deposit Type
                </label>
                <select
                  id="type"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  Total Amount
                </label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  step="0.01"
                  required
                />
                {(depositType === "MIXED" || depositType === "CASH") && (
                  <p
                    className={`text-xs mt-1 ${cashPortion > availableCash ? "text-red-600 font-medium" : "text-slate-500"}`}
                  >
                    Cash portion: ₹{cashPortion.toLocaleString()}
                    {cashPortion > availableCash &&
                      " (Exceeds available cash!)"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cheques */}
        {(depositType === "CHEQUE" || depositType === "MIXED") && (
          <Card>
            <CardHeader>
              <CardTitle>Include Cheques</CardTitle>
              <CardDescription>
                Add issued cheques to this deposit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCheques.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    Selected Cheques:
                  </p>
                  <div className="space-y-2">
                    {selectedCheques.map((chequeId) => {
                      const cheque = cheques?.find((c) => c.id === chequeId);
                      return cheque ? (
                        <div
                          key={chequeId}
                          className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              Cheque #{cheque.chequeNumber}
                            </p>
                            <p className="text-sm text-slate-600">
                              ₹{cheque.amount.toLocaleString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCheque(chequeId)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {availableCheques.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Available Cheques
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCheque(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">Add a cheque...</option>
                    {availableCheques.map((cheque) => (
                      <option key={cheque.id} value={cheque.id}>
                        {cheque.chequeNumber} - ₹
                        {cheque.amount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating..." : "Create Deposit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
