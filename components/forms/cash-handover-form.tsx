"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Loader2,
  Wallet,
  User,
  Calendar,
  FileText,
  Coins,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CashHandoverForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const { data: members } = useSWR<any[]>(
    ["ADMIN", "ACCOUNTANT"].includes(userRole) ? "/api/users" : null,
    fetcher,
  );

  const targetUserId = selectedMemberId || session?.user?.id;

  const { data: balanceData, isLoading: isLoadingBalance } = useSWR(
    targetUserId ? `/api/members/me/balance?userId=${targetUserId}` : null,
    fetcher,
  );

  const availableBalance = balanceData?.balance || 0;
  const totalCollected = balanceData?.totalCollected || 0;
  const totalHandedOver = balanceData?.totalHandedOver || 0;
  const targetUserName = balanceData?.userName || "Member";

  const [handoverDate, setHandoverDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [remarks, setRemarks] = useState("");
  const [notes, setNotes] = useState<Record<string, number>>(
    DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: 0 }), {}),
  );

  const totalAmount = Object.entries(notes).reduce(
    (sum, [denom, count]) => sum + parseInt(denom) * count,
    0,
  );

  const handleNoteChange = (denomination: number, count: string) => {
    const value = parseInt(count) || 0;
    setNotes({
      ...notes,
      [denomination]: value >= 0 ? value : 0,
    });
  };

  const handleQuickAdd = (denomination: number, increment: number) => {
    const newCount = Math.max(0, (notes[denomination] || 0) + increment);
    setNotes({ ...notes, [denomination]: newCount });
  };

  const handleResetDenominations = () => {
    setNotes(DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: 0 }), {}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!handoverDate) {
      toast.error("Handover date is required");
      return;
    }

    if (totalAmount <= 0) {
      toast.error("Please add at least one denomination");
      return;
    }

    if (totalAmount > availableBalance) {
      toast.error(
        `Handover amount (₹${totalAmount.toLocaleString()}) cannot exceed available balance (₹${availableBalance.toLocaleString()})`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cash-handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handoverDate: new Date(handoverDate).toISOString(),
          totalAmount,
          numberOfNotes: notes,
          remarks,
          handoverFrom: selectedMemberId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create cash handover");
        return;
      }

      toast.success("Cash handover created successfully");
      router.push(`/dashboard/cash-handovers/${data.id}`);
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingBalance = availableBalance - totalAmount;
  const isOverLimit = totalAmount > availableBalance;
  const hasValidAmount = totalAmount > 0 && !isOverLimit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Wallet className="w-6 h-6 text-blue-700" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">
                New Cash Handover
              </h1>
            </div>
            <p className="text-slate-600 ml-11">
              Record a cash handover for approval and tracking
            </p>
          </div>
          {hasValidAmount && !isSubmitting && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Ready to submit
              </span>
            </div>
          )}
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Balance Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                {["ADMIN", "ACCOUNTANT"].includes(userRole)
                  ? "Selected Member Balance"
                  : "Your Collected Balance"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <div className="space-y-2">
                  <div className="h-8 w-32 bg-slate-200 animate-pulse rounded" />
                  <div className="h-4 w-24 bg-slate-100 animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-blue-600">
                    ₹{availableBalance.toLocaleString()}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Total Collected
                      </p>
                      <p className="text-lg font-semibold text-slate-800">
                        ₹{totalCollected.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Total Handed Over
                      </p>
                      <p className="text-lg font-semibold text-slate-800">
                        ₹{totalHandedOver.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 pt-1 border-t border-slate-100">
                    Balance for {targetUserName}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Handover Summary Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Handover Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                ₹{totalAmount.toLocaleString()}
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Available balance:</span>
                  <span className="font-medium">
                    ₹{availableBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">
                    Remaining after handover:
                  </span>
                  <span
                    className={`font-medium ${isOverLimit ? "text-red-600" : "text-green-600"}`}
                  >
                    ₹{Math.max(0, remainingBalance).toLocaleString()}
                  </span>
                </div>
                {isOverLimit && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded mt-2">
                    <p className="text-xs text-red-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Exceeds available
                      balance
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Member Selection for Admin/Accountant */}
          {["ADMIN", "ACCOUNTANT"].includes(userRole) && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-600" />
                  <CardTitle>Member Selection</CardTitle>
                </div>
                <CardDescription>
                  Select the member handing over cash
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="member-select">Handover From</Label>
                  <Select
                    value={selectedMemberId}
                    onValueChange={setSelectedMemberId}
                  >
                    <SelectTrigger id="member-select" className="w-full">
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{member.name}</span>
                            <span className="text-xs text-slate-400">
                              ({member.role})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Handover Details Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                <CardTitle>Handover Details</CardTitle>
              </div>
              <CardDescription>
                Basic information about the handover
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Handover Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={handoverDate}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  required
                  className="w-full transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Remarks (Optional)
                </Label>
                <Textarea
                  id="remarks"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any additional notes about this handover..."
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Currency Denominations Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-slate-600" />
                  <CardTitle>Currency Denominations</CardTitle>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDenominations}
                  className="text-xs"
                >
                  Reset counts
                </Button>
              </div>
              <CardDescription>
                Enter the count of each denomination or use the quick buttons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {DENOMINATIONS.map((denom) => {
                  const count = notes[denom];
                  const subtotal = denom * count;
                  return (
                    <div
                      key={denom}
                      className="bg-slate-50 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <Label
                          htmlFor={`denom-${denom}`}
                          className="text-base font-bold text-slate-700"
                        >
                          ₹{denom}
                        </Label>
                        <span className="text-xs text-slate-500">
                          Subtotal: ₹{subtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 flex-shrink-0"
                          onClick={() => handleQuickAdd(denom, -1)}
                          disabled={count <= 0}
                        >
                          -
                        </Button>
                        <Input
                          id={`denom-${denom}`}
                          type="number"
                          min="0"
                          value={count}
                          onChange={(e) =>
                            handleNoteChange(denom, e.target.value)
                          }
                          className="text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 flex-shrink-0"
                          onClick={() => handleQuickAdd(denom, 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Summary & Actions */}
          <div className="sticky bottom-4 z-10">
            <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardContent className="py-5 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-100">
                      Total Handover Amount
                    </p>
                    <p className="text-3xl font-bold">
                      ₹{totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-200 mt-1">
                      {
                        Object.entries(notes).filter(([_, count]) => count > 0)
                          .length
                      }{" "}
                      denomination
                      {Object.entries(notes).filter(([_, count]) => count > 0)
                        .length !== 1
                        ? "s"
                        : ""}{" "}
                      selected
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isSubmitting}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !hasValidAmount}
                      className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isSubmitting
                        ? "Creating Handover..."
                        : "Create Handover"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
