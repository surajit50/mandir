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
  // Strictly CASH now as cheques are handled via encashment clearing
  const [depositType] = useState("CASH");
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

  const handoversTotal = Array.isArray(handovers)
    ? selectedHandovers.reduce((sum, id) => {
        const handover = handovers.find((h) => h.id === id);
        return sum + (handover?.totalAmount || 0);
      }, 0)
    : 0;

  const cashPortion = parseFloat(totalAmount || "0");

  // Auto-select handover from query param
  useEffect(() => {
    if (preSelectedHandoverId && Array.isArray(handovers) && handovers.length > 0) {
      if (!selectedHandovers.includes(preSelectedHandoverId)) {
        setSelectedHandovers([preSelectedHandoverId]);
      }
    }
  }, [preSelectedHandoverId, handovers]);

  const handleAddHandover = (handoverId: string) => {
    if (!selectedHandovers.includes(handoverId) && Array.isArray(handovers)) {
      const handover = handovers.find(h => h.id === handoverId);
      if (handover) {
        const newHandovers = [...selectedHandovers, handoverId];
        setSelectedHandovers(newHandovers);
        
        // Update total amount: sum of all selected handovers
        const newHandoversTotal = newHandovers.reduce((sum, id) => {
          const h = handovers.find(item => item.id === id);
          return sum + (h?.totalAmount || 0);
        }, 0);
        setTotalAmount(newHandoversTotal.toString());
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
    setTotalAmount(newHandoversTotal > 0 ? newHandoversTotal.toString() : "");
  };

  const handleSelectAllHandovers = () => {
    if (Array.isArray(handovers)) {
      const allIds = handovers.map(h => h.id);
      setSelectedHandovers(allIds);
      const total = handovers.reduce((sum, h) => sum + h.totalAmount, 0);
      setTotalAmount(total.toString());
    }
  };

  const handleClearHandovers = () => {
    setSelectedHandovers([]);
    setTotalAmount("");
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
    if (cashPortion > depositableCash) {
      toast.error(
        `Deposit amount (₹${cashPortion.toLocaleString()}) exceeds cash in hand (₹${depositableCash.toLocaleString()}). Only approved hand-over amounts can be deposited.`,
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
          depositType: "CASH",
          chequeIds: [],
          handoverIds: selectedHandovers,
          remarks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create deposit");
        return;
      }

      toast.success("Cash deposit created successfully");
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
        <h1 className="text-3xl font-bold text-slate-900">New Cash Deposit</h1>
        <p className="text-slate-600 mt-2">
          Record a physical cash deposit from handovers to the bank
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Cash in Cash Book */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Cash in Hand
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
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-green-500" /> Approved Handovers</span>
                <span className="font-medium text-green-700">₹{handoverCashIn.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-400" /> Cash Payments</span>
                <span className="font-medium text-red-600">₹{totalPayments.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending with Cashiers */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              With Cashiers
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
            <p className="text-[10px] text-slate-500 mt-1">
              {pendingCashiers.length} cashier{pendingCashiers.length !== 1 ? "s" : ""} pending handover
            </p>
          </CardContent>
        </Card>

        {/* Selected Bank Account */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Bank Balance
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
            <p className="text-[10px] text-slate-500 mt-1">
              Current balance in selected bank
            </p>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Deposit Details</CardTitle>
            <CardDescription>Basic cash deposit information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="rounded-lg border-slate-300"
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

            <div className="pt-2">
              <label
                className="text-sm font-semibold text-slate-700 block mb-2"
              >
                Cash Deposit Amount
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
                    if (parseFloat(val || "0") > depositableCash) {
                      toast.warning(`Cannot exceed available cash in hand (₹${depositableCash.toLocaleString()})`);
                      return;
                    }
                    setTotalAmount(val);
                  }}
                  className={`text-2xl font-bold h-14 pl-10 pr-4 rounded-xl border-2 transition-all ${
                    cashPortion > depositableCash
                      ? "border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500"
                      : "border-amber-200 bg-amber-50/50 text-amber-900 focus-visible:ring-amber-500 focus-visible:border-amber-400"
                  }`}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="text-xl font-bold">₹</span>
                </div>
                
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {cashPortion <= depositableCash && cashPortion > 0 ? (
                    <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </div>
                  ) : cashPortion > depositableCash ? (
                    <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-red-200 animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      Over Limit
                    </div>
                  ) : null}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[10px] text-slate-500 font-medium">
                  Physical cash available for deposit: ₹{availableCash.toLocaleString()}
                </p>
                {cashPortion > 0 && (
                   <p className="text-[10px] font-bold text-amber-600">
                     Ready for Deposit
                   </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Handovers Selection */}
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
              Link this deposit to specific cash handovers from cashiers.
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
                  <span>Linked Cash Total:</span>
                  <span>₹{handoversTotal.toLocaleString()}</span>
                </div>
              </div>
            )}

            {Array.isArray(handovers) && handovers.filter(h => !selectedHandovers.includes(h.id)).length > 0 ? (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Add Handover to this Deposit
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
                <p className="text-xs text-slate-400 mt-1">All cashier cash has already been deposited.</p>
              </div>
            ) : null}

          </CardContent>
        </Card>

        {/* Remarks */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Remarks (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this cash deposit..."
            />
          </CardContent>
        </Card>

        {/* Summary */}
        {totalAmount && (
          <Card className="bg-slate-900 text-white border-none shadow-lg overflow-hidden">
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Linked Handover Amount:</span>
                <span className="font-medium">₹{handoversTotal.toLocaleString()}</span>
              </div>
              <div className="h-px bg-white/10 w-full" />
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Total Cash Deposit</p>
                  <p className="text-3xl font-black text-white mt-1">
                    ₹{parseFloat(totalAmount || "0").toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-slate-400">Accountant Signature</p>
                   <div className="h-6 w-24 border-b border-slate-700 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-11 rounded-xl font-bold transition-all active:scale-95"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Processing..." : "Confirm & Create Deposit"}
          </Button>
        </div>
      </form>
    </div>
  );
}