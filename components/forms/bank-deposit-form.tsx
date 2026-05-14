"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2, X, Wallet, Building2, Users, ShieldCheck, TrendingUp, TrendingDown, Info } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";

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

interface CashBalanceResponse {
  balance: number;
  totalReceipts: number;
  totalPayments: number;
  handoverCashIn: number;
  pendingPayments: number;
  potentialBalance: number;
}

interface MemberBalance {
  id: string;
  name: string;
  email: string;
  balance: number;
}

interface CashHandover {
  id: string;
  handoverDate: string;
  totalAmount: number;
  handoverFromUser: {
    name: string;
  };
}

export function BankDepositForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedHandoverId = searchParams.get("handoverId");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [depositDate, setDepositDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [accountId, setAccountId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [depositType, setDepositType] = useState("CASH");
  const [selectedCheques, setSelectedCheques] = useState<string[]>([]);
  const [selectedHandovers, setSelectedHandovers] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  const { data: accounts } = useSWR<BankAccount[]>(
    "/api/bank-accounts",
    fetcher,
    { revalidateOnFocus: false },
  );

  // Cash book balance (approved handovers → cash book)
  const { data: cashBalanceData, isLoading: isLoadingCash } = useSWR<CashBalanceResponse>(
    "/api/cash-book/balance",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Per-cashier balances (collected but not yet handed over)
  const { data: memberBalances, isLoading: isLoadingMembers } = useSWR<MemberBalance[]>(
    "/api/members/balances",
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: cheques } = useSWR<Cheque[]>("/api/cheques", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: handovers } = useSWR<CashHandover[]>(
    "/api/cash-handovers?status=APPROVED&undepositedOnly=true",
    fetcher,
    { revalidateOnFocus: false }
  );

  const availableCash = cashBalanceData?.balance || 0;
  const handoverCashIn = cashBalanceData?.handoverCashIn || 0;
  const totalPayments = cashBalanceData?.totalPayments || 0;

  // The actual physical cash available in the main cash book
  const depositableCash = availableCash;

  const pendingCashiers = memberBalances?.filter((m) => m.balance > 0) || [];
  const totalPendingWithCashiers = pendingCashiers.reduce((s, m) => s + m.balance, 0);

  const selectedAccount = accounts?.find((a) => a.id === accountId);

  const chequesTotal = selectedCheques.reduce((sum, id) => {
    const cheque = cheques?.find((c) => c.id === id);
    return sum + (cheque?.amount || 0);
  }, 0);

  const handoversTotal = Array.isArray(handovers)
    ? selectedHandovers.reduce((sum, id) => {
        const handover = handovers.find((h) => h.id === id);
        return sum + (handover?.totalAmount || 0);
      }, 0)
    : 0;

  const cashPortion = Math.max(
    0,
    parseFloat(totalAmount || "0") - chequesTotal,
  );

  // Sync totalAmount with selections
  // No longer using an effect to sync totalAmount to avoid overwriting manual input.
  // Amount is now updated explicitly in handAdd/Remove functions.

  // Reset selections when depositType changes
  useEffect(() => {
    if (depositType === "CASH") {
      setSelectedCheques([]);
    } else if (depositType === "CHEQUE") {
      setSelectedHandovers([]);
    }
    setTotalAmount("");
  }, [depositType]);

  // Auto-select handover from query param
  useEffect(() => {
    if (preSelectedHandoverId && Array.isArray(handovers) && handovers.length > 0) {
      if (!selectedHandovers.includes(preSelectedHandoverId)) {
        setSelectedHandovers([preSelectedHandoverId]);
      }
    }
  }, [preSelectedHandoverId, handovers]);

  // Filter cheques that are issued and not already deposited
  const availableCheques =
    cheques?.filter(
      (c) => c.status === "ISSUED" && !selectedCheques.includes(c.id),
    ) || [];

  const handleAddCheque = (chequeId: string) => {
    if (!selectedCheques.includes(chequeId)) {
      setSelectedCheques([...selectedCheques, chequeId]);
    }
  };

  const handleRemoveCheque = (chequeId: string) => {
    setSelectedCheques(selectedCheques.filter((id) => id !== chequeId));
  };

  const handleAddHandover = (handoverId: string) => {
    if (!selectedHandovers.includes(handoverId) && Array.isArray(handovers)) {
      const handover = handovers.find(h => h.id === handoverId);
      if (handover) {
        const newHandovers = [...selectedHandovers, handoverId];
        setSelectedHandovers(newHandovers);
        
        // Update total amount: sum of all selected handovers + all selected cheques
        const newHandoversTotal = newHandovers.reduce((sum, id) => {
          const h = handovers.find(item => item.id === id);
          return sum + (h?.totalAmount || 0);
        }, 0);
        setTotalAmount((newHandoversTotal + chequesTotal).toString());
      }
    }
  };

  const handleRemoveHandover = (handoverId: string) => {
    const newHandovers = selectedHandovers.filter((id) => id !== handoverId);
    setSelectedHandovers(newHandovers);
    
    const newHandoversTotal = Array.isArray(handovers) 
      ? newHandovers.reduce((sum, id) => {
          const h = handovers.find(item => item.id === id);
          return sum + (h?.totalAmount || 0);
        }, 0)
      : 0;
    setTotalAmount((newHandoversTotal + chequesTotal).toString());
  };

  const handleSelectAllHandovers = () => {
    if (Array.isArray(handovers)) {
      const allIds = handovers.map(h => h.id);
      setSelectedHandovers(allIds);
      const total = handovers.reduce((sum, h) => sum + h.totalAmount, 0);
      setTotalAmount((total + chequesTotal).toString());
    }
  };

  const handleClearHandovers = () => {
    setSelectedHandovers([]);
    setTotalAmount(chequesTotal > 0 ? chequesTotal.toString() : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!depositDate) {
      toast.error("Deposit date is required");
      return;
    }

    if (!accountId) {
      toast.error("Account is required");
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error("Total amount must be greater than 0");
      return;
    }

    // Cash portion cannot exceed what custodian physically holds (approved handovers − payments)
    if (depositType !== "CHEQUE" && cashPortion > depositableCash) {
      toast.error(
        `Cash deposit (₹${cashPortion.toLocaleString()}) exceeds cash in custodian's hand (₹${depositableCash.toLocaleString()}). Only approved hand-over amounts can be deposited.`,
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
          handoverIds: selectedHandovers,
          remarks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create deposit");
        return;
      }

      toast.success("Deposit created successfully");
      router.push(`/dashboard/bank-deposits/${data.id}`);
    } catch (err) {
      toast.error("An error occurred");
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Cash in Cash Book */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Available Cash for Deposit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCash ? (
              <div className="h-8 w-28 bg-amber-100 animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold text-amber-700">
                ₹{availableCash.toLocaleString()}
              </p>
            )}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> Handovers approved</span>
                <span className="font-medium text-green-700">₹{handoverCashIn.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-400" /> Payments made</span>
                <span className="font-medium text-red-600">₹{totalPayments.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending with Cashiers */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pending with Cashiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="h-8 w-28 bg-blue-100 animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold text-blue-700">
                ₹{totalPendingWithCashiers.toLocaleString()}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {pendingCashiers.length} cashier{pendingCashiers.length !== 1 ? "s" : ""} yet to hand over
            </p>
          </CardContent>
        </Card>

        {/* Selected Bank Account */}
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

      {/* ── Cashier Cash Breakdown ── */}
      {!isLoadingMembers && pendingCashiers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Cash with Cashiers — Verify Before Depositing
            </CardTitle>
            <CardDescription className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
              <Info className="w-3 h-3" />
              These amounts are collected but not yet approved &amp; entered in the cash book.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingCashiers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-white border border-blue-100 rounded-lg px-3 py-2.5 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-700 ml-2 whitespace-nowrap">
                    ₹{m.balance.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">Total pending collection</span>
              <span className="font-bold text-blue-800">₹{totalPendingWithCashiers.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No pending cashiers */}
      {!isLoadingMembers && pendingCashiers.length === 0 && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="py-3 flex items-center gap-2 text-green-700 text-sm">
            <ShieldCheck className="w-4 h-4" />
            All cashiers have handed over their collected cash. Cash book is fully reconciled.
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="text-sm font-semibold text-slate-700 block mb-2"
                >
                  Deposit Amount
                </label>
                <div className="relative group transition-all">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Block entry exceeding verified cash in hand
                      if (depositType !== "CHEQUE" && parseFloat(val || "0") - chequesTotal > depositableCash) {
                        toast.warning(`Cannot exceed verified cash in hand (₹${depositableCash.toLocaleString()})`);
                        return;
                      }
                      setTotalAmount(val);
                    }}
                    className={`text-2xl font-bold h-14 pl-10 pr-4 rounded-xl border-2 transition-all ${
                      cashPortion > depositableCash && depositType !== "CHEQUE"
                        ? "border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500"
                        : "border-amber-200 bg-amber-50/50 text-amber-900 focus-visible:ring-amber-500 focus-visible:border-amber-400"
                    }`}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="text-xl font-bold">₹</span>
                  </div>
                  
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {cashPortion <= depositableCash ? (
                      <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-200 animate-pulse">
                        <AlertCircle className="w-3 h-3" />
                        Limit Exceeded
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-[10px] text-slate-500 font-medium">
                    {depositType === "CASH" ? "Cash" : depositType === "CHEQUE" ? "Cheque" : "Combined"} Deposit
                  </p>
                  <p className={`text-[10px] font-bold ${cashPortion > availableCash ? "text-red-600" : "text-amber-600"}`}>
                    Physical Cash Limit: ₹{availableCash.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Handovers Selection */}
        {(depositType === "CASH" || depositType === "MIXED") && (
          <Card className="border-amber-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Select Approved Handovers
                </CardTitle>
                {Array.isArray(handovers) && handovers.length > 0 && (
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                      onClick={handleSelectAllHandovers}
                    >
                      Select All
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] text-red-700 hover:text-red-800 hover:bg-red-50"
                      onClick={handleClearHandovers}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription className="text-xs text-amber-600">
                Only approved and undeposited cash handovers are shown.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedHandovers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    Selected Handovers ({selectedHandovers.length}):
                  </p>
                  <div className="space-y-2">
                    {selectedHandovers.map((handoverId) => {
                      const handover = Array.isArray(handovers) ? handovers.find((h) => h.id === handoverId) : null;
                      return handover ? (
                        <div
                          key={handoverId}
                          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              ₹{handover.totalAmount.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-600">
                              From {handover.handoverFromUser.name} on {new Date(handover.handoverDate).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveHandover(handoverId)}
                            className="text-red-600 hover:bg-red-100 p-1.5 rounded-full transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="text-sm font-bold text-amber-700 pt-2 border-t border-amber-200 flex justify-between">
                    <span>Selected Cash Total:</span>
                    <span>₹{handoversTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {Array.isArray(handovers) && handovers.filter(h => !selectedHandovers.includes(h.id)).length > 0 ? (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Available Handovers to Add
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddHandover(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">+ Add a cash handover...</option>
                    {handovers.filter(h => !selectedHandovers.includes(h.id)).map((handover) => (
                      <option key={handover.id} value={handover.id}>
                        ₹{handover.totalAmount.toLocaleString()} - {handover.handoverFromUser.name} ({new Date(handover.handoverDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (Array.isArray(handovers) && selectedHandovers.length === 0) || !Array.isArray(handovers) ? (
                <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No approved handovers available for deposit.</p>
                  <p className="text-xs text-slate-400 mt-1">Please approve pending handovers first.</p>
                </div>
              ) : null}

            </CardContent>
          </Card>
        )}

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
                    Selected Cheques ({selectedCheques.length}):
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
                  <div className="text-sm text-slate-700 pt-2 border-t">
                    Cheques total: ₹{chequesTotal.toLocaleString()}
                  </div>
                </div>
              )}

              {availableCheques.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Available Cheques to Add
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCheque(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">+ Add a cheque...</option>
                    {availableCheques.map((cheque) => (
                      <option key={cheque.id} value={cheque.id}>
                        #{cheque.chequeNumber} - ₹
                        {cheque.amount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {availableCheques.length === 0 && selectedCheques.length === 0 && (
                <p className="text-sm text-slate-500 py-3">
                  No available cheques. All issued cheques have been deposited.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Remarks (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this deposit..."
            />
          </CardContent>
        </Card>

        {/* Summary */}
        {totalAmount && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Cheques:</span>
                <span className="font-medium">₹{chequesTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Cash:</span>
                <span className="font-medium">₹{cashPortion.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total Deposit:</span>
                <span className="text-lg font-bold text-blue-600">
                  ₹{parseFloat(totalAmount || "0").toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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