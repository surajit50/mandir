"use client";

import { useState, useEffect, useCallback } from "react";
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
import { AlertCircle, Loader2, Search, Landmark } from "lucide-react";
import useSWR, { useSWRConfig } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  accountHolder: string;
  currentBalance: number;
}

interface ChequeEntry {
  id: string;
  type: "RECEIVED" | "ISSUED";
  date: string;
  description: string;
  chequeNumber: string | null;
  payeeName: string | null;
  amount: number;
  status: string;
  depositType?: string;
  clearedDate?: string | null;
  encashmentDate?: string | null;
  isAssigned?: boolean;
}

interface ChequesData {
  received: ChequeEntry[];
  issued: ChequeEntry[];
  assignedIssued: ChequeEntry[];
  unassignedIssued: ChequeEntry[];
  totalReceived: number;
  totalIssued: number;
  totalAssignedIssued: number;
}

export function BankReconciliationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [reconciliationDate, setReconciliationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [accountId, setAccountId] = useState("");
  const [bankBalance, setBankBalance] = useState("");
  const [bookBalance, setBookBalance] = useState("");
  const [remarks, setRemarks] = useState("");

  // Cheque encashment dates - map of chequeId -> encashment date string
  const [encashmentDates, setEncashmentDates] = useState<
    Record<string, string>
  >({});
  const [encashingIds, setEncashingIds] = useState<Set<string>>(new Set());

  // Issue form data for unassigned cheque leaves
  const [issueFormData, setIssueFormData] = useState<
    Record<
      string,
      { payeeName: string; amount: string; encashmentDate: string }
    >
  >({});
  const [issuingIds, setIssuingIds] = useState<Set<string>>(new Set());

  const { data: accounts } = useSWR<BankAccount[]>(
    "/api/bank-accounts",
    fetcher,
    { revalidateOnFocus: false },
  );

  const { mutate } = useSWRConfig();
  const selectedAccount = accounts?.find((a) => a.id === accountId);

  // Fetch cheques when account or date changes
  const {
    data: chequesData,
    error: chequesError,
    isValidating: chequesLoading,
  } = useSWR<ChequesData>(
    accountId && reconciliationDate
      ? `/api/bank-reconciliation/cheques?accountId=${accountId}&date=${reconciliationDate}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Initialize encashment dates from existing data when cheques are loaded
  useEffect(() => {
    if (chequesData) {
      const dates: Record<string, string> = {};
      for (const c of chequesData.issued) {
        if (c.encashmentDate) {
          dates[c.id] = new Date(c.encashmentDate).toISOString().split("T")[0];
        }
      }
      setEncashmentDates((prev) => {
        // Only set if not already manually set
        const merged = { ...prev };
        for (const [id, date] of Object.entries(dates)) {
          if (!merged[id]) merged[id] = date;
        }
        return merged;
      });
    }
  }, [chequesData]);

  const difference =
    (parseFloat(bankBalance) || 0) - (parseFloat(bookBalance) || 0);

  const handleEncashmentDateChange = (chequeId: string, date: string) => {
    setEncashmentDates((prev) => ({ ...prev, [chequeId]: date }));
  };

  const handleEncashCheque = async (cheque: ChequeEntry) => {
    const encashDate = encashmentDates[cheque.id];
    if (!encashDate) {
      setError("Please select an encashment date first");
      return;
    }

    setEncashingIds((prev) => new Set(prev).add(cheque.id));
    setError("");

    try {
      const response = await fetch(`/api/cheques/${cheque.id}/encash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearedDate: new Date(encashDate).toISOString(),
          bankAccountId: accountId,
          remarks: `Encashed during reconciliation on ${reconciliationDate}`,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to encash cheque");
      }

      // Revalidate cheques data to reflect updated status
      const cacheKey = `/api/bank-reconciliation/cheques?accountId=${accountId}&date=${reconciliationDate}`;
      mutate(cacheKey);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEncashingIds((prev) => {
        const next = new Set(prev);
        next.delete(cheque.id);
        return next;
      });
    }
  };

  const handleIssueFormChange = (
    chequeId: string,
    field: "payeeName" | "amount" | "encashmentDate",
    value: string,
  ) => {
    setIssueFormData((prev) => ({
      ...prev,
      [chequeId]: {
        payeeName:
          field === "payeeName" ? value : prev[chequeId]?.payeeName || "",
        amount: field === "amount" ? value : prev[chequeId]?.amount || "",
        encashmentDate:
          field === "encashmentDate"
            ? value
            : prev[chequeId]?.encashmentDate || "",
      },
    }));
  };

  const handleIssueAndEncash = async (cheque: ChequeEntry) => {
    const form = issueFormData[cheque.id];
    if (!form?.payeeName?.trim()) {
      setError("Please enter the payee name");
      return;
    }
    if (!form?.amount || parseFloat(form.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!form?.encashmentDate) {
      setError("Please select an encashment date");
      return;
    }

    setIssuingIds((prev) => new Set(prev).add(cheque.id));
    setError("");

    try {
      // First update the cheque with payee, amount, and mark as issued
      const updateRes = await fetch(`/api/cheques/${cheque.id}/issue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payeeName: form.payeeName.trim(),
          amount: parseFloat(form.amount),
        }),
      });

      if (!updateRes.ok) {
        const errData = await updateRes.json();
        throw new Error(errData.error || "Failed to issue cheque");
      }

      // Then encash it
      const encashRes = await fetch(`/api/cheques/${cheque.id}/encash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearedDate: new Date(form.encashmentDate).toISOString(),
          bankAccountId: accountId,
          remarks: `Issued & encashed during reconciliation on ${reconciliationDate}`,
        }),
      });

      if (!encashRes.ok) {
        const errData = await encashRes.json();
        throw new Error(errData.error || "Failed to encash cheque");
      }

      // Clear form for this cheque and refresh data
      setIssueFormData((prev) => {
        const next = { ...prev };
        delete next[cheque.id];
        return next;
      });

      const cacheKey = `/api/bank-reconciliation/cheques?accountId=${accountId}&date=${reconciliationDate}`;
      mutate(cacheKey);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIssuingIds((prev) => {
        const next = new Set(prev);
        next.delete(cheque.id);
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!accountId) {
      setError("Bank account is required");
      return;
    }

    if (!reconciliationDate) {
      setError("Reconciliation date is required");
      return;
    }

    if (!bankBalance) {
      setError("Bank balance is required");
      return;
    }

    if (!bookBalance) {
      setError("Book balance is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build encashment updates: only cheques that have an encashment date set
      const encashmentUpdates = Object.entries(encashmentDates)
        .filter(([, date]) => date && date.trim())
        .map(([chequeId, date]) => ({
          chequeId,
          encashmentDate: new Date(date).toISOString(),
        }));

      const response = await fetch("/api/bank-reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          reconciliationDate: new Date(reconciliationDate).toISOString(),
          bankBalance: parseFloat(bankBalance),
          bookBalance: parseFloat(bookBalance),
          remarks,
          encashmentUpdates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create reconciliation");
        return;
      }

      router.push(`/dashboard/bank-reconciliation/${data.id}`);
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = chequesData
    ? {
        totalCleared: chequesData.assignedIssued.filter(
          (c) => c.status === "CLEARED",
        ).length,
        totalOutstanding: chequesData.assignedIssued.filter(
          (c) => c.status !== "CLEARED" && c.status !== "CANCELLED",
        ).length,
        totalBounced: chequesData.assignedIssued.filter(
          (c) => c.status === "BOUNCED",
        ).length,
        totalUnassigned: chequesData.unassignedIssued.length,
      }
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          New Bank Reconciliation
        </h1>
        <p className="text-muted-foreground mt-2">
          Review received &amp; issued cheques and enter encashment dates
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex gap-2 items-start bg-destructive/5 border border-destructive/30 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Account & Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Account &amp; Date</CardTitle>
            <CardDescription>
              Select the account and reconciliation date to view cheques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="account"
                  className="text-sm font-medium text-foreground block mb-2"
                >
                  Bank Account
                </label>
                <select
                  id="account"
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

              <div>
                <label
                  htmlFor="date"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  Reconciliation Date
                </label>
                <Input
                  id="date"
                  type="date"
                  value={reconciliationDate}
                  onChange={(e) => setReconciliationDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {selectedAccount && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center gap-3">
                <Landmark className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-sm text-emerald-800 dark:text-emerald-300">
                  <span className="font-semibold">
                    {selectedAccount.bankName}
                  </span>
                  {" — "}
                  {selectedAccount.accountNumber}
                  {" · "}
                  <span className="text-emerald-600 font-medium">
                    Current Balance: ₹
                    {selectedAccount.currentBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cheques Overview - only shown when account selected */}
        {accountId && (
          <>
            {/* Received Cheques (Credits) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Cheques Received (Credits)
                    </CardTitle>
                    <CardDescription>
                      Funds deposited into the bank account
                    </CardDescription>
                  </div>
                  {chequesData && (
                    <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-3 py-1 rounded-full">
                      Total: ₹{chequesData.totalReceived.toLocaleString()}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {chequesLoading ? (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading cheques...
                  </div>
                ) : chequesError ? (
                  <div className="text-destructive text-sm py-2">
                    Failed to load cheque data
                  </div>
                ) : chequesData && chequesData.received.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-border">
                          <th className="text-left py-2 px-3 font-semibold text-foreground">
                            Date
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">
                            Description
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">
                            Cheque No.
                          </th>
                          <th className="text-center py-2 px-3 font-semibold text-foreground">
                            Type
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-foreground">
                            Amount (₹)
                          </th>
                          <th className="text-center py-2 px-3 font-semibold text-foreground">
                            Encashment Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {chequesData.received.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-b border-border hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                          >
                            <td className="py-2 px-3 text-foreground font-medium">
                              {new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {entry.description}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {entry.chequeNumber
                                ? `#${entry.chequeNumber}`
                                : "-"}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.depositType === "CHEQUE"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : entry.depositType === "CASH"
                                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                }`}
                              >
                                {entry.depositType}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-600 font-semibold">
                              +₹{entry.amount.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {entry.status === "CLEARED" ||
                                entry.status === "VERIFIED" ? (
                                  <span className="text-xs text-emerald-600 font-medium">
                                    {entry.encashmentDate
                                      ? new Date(
                                          entry.encashmentDate,
                                        ).toLocaleDateString()
                                      : new Date(
                                          entry.date,
                                        ).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <>
                                    <Input
                                      type="date"
                                      value={encashmentDates[entry.id] || ""}
                                      onChange={(e) =>
                                        handleEncashmentDateChange(
                                          entry.id,
                                          e.target.value,
                                        )
                                      }
                                      className="w-32 h-8 text-xs"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2 text-xs whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                      onClick={() => handleEncashCheque(entry)}
                                      disabled={
                                        encashingIds.has(entry.id) ||
                                        !encashmentDates[entry.id]
                                      }
                                    >
                                      {encashingIds.has(entry.id) ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        "Encash"
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 border-t-2 border-emerald-200 dark:border-emerald-800">
                          <td
                            colSpan={5}
                            className="py-2 px-3 text-right font-bold text-emerald-800 dark:text-emerald-300"
                          >
                            Total Received:
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                            ₹{chequesData.totalReceived.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-6 text-muted-foreground justify-center">
                    <Search className="w-4 h-4" />
                    <span className="text-sm">
                      No received cheques found for this period. Select an
                      account and date above.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Issued Cheques — Payment Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Cheques Issued for Payment (Debits)
                    </CardTitle>
                    <CardDescription>
                      Cheques assigned to payees — enter encashment dates and
                      encash them
                    </CardDescription>
                  </div>
                  {chequesData && stats && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
                        {stats.totalCleared} Cleared
                      </span>
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
                        {stats.totalOutstanding} Pending
                      </span>
                      {stats.totalBounced > 0 && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                          {stats.totalBounced} Bounced
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {chequesLoading ? (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading cheques...
                  </div>
                ) : chequesError ? (
                  <div className="text-destructive text-sm py-2">
                    Failed to load cheque data
                  </div>
                ) : chequesData && chequesData.assignedIssued.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-border">
                          <th className="text-left py-2 px-3 font-semibold text-foreground">
                            Cheque No.
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">
                            Payee
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">
                            Date
                          </th>
                          <th className="text-center py-2 px-3 font-semibold text-foreground">
                            Status
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-foreground">
                            Amount (₹)
                          </th>
                          <th className="text-center py-2 px-3 font-semibold text-foreground">
                            Encashment Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {chequesData.assignedIssued.map((entry) => (
                          <tr
                            key={entry.id}
                            className={`border-b border-border hover:bg-muted/50 ${
                              entry.status === "CLEARED"
                                ? "bg-emerald-50/30 dark:bg-emerald-950/10"
                                : ""
                            } ${entry.status === "BOUNCED" ? "bg-destructive/5" : ""}`}
                          >
                            <td className="py-2 px-3 font-medium text-foreground">
                              #{entry.chequeNumber}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {entry.payeeName}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  entry.status === "CLEARED"
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                    : entry.status === "BOUNCED"
                                      ? "bg-destructive/10 text-destructive"
                                      : entry.status === "CANCELLED"
                                        ? "bg-muted text-muted-foreground"
                                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                }`}
                              >
                                {entry.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-destructive font-semibold">
                              -₹{entry.amount.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {entry.status === "CANCELLED" ||
                                entry.status === "BOUNCED" ? (
                                  <span className="text-xs text-muted-foreground">
                                    N/A
                                  </span>
                                ) : entry.status === "CLEARED" ? (
                                  <span className="text-xs text-emerald-600 font-medium">
                                    {entry.clearedDate
                                      ? new Date(
                                          entry.clearedDate,
                                        ).toLocaleDateString()
                                      : new Date(
                                          entry.date,
                                        ).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <>
                                    <Input
                                      type="date"
                                      value={encashmentDates[entry.id] || ""}
                                      onChange={(e) =>
                                        handleEncashmentDateChange(
                                          entry.id,
                                          e.target.value,
                                        )
                                      }
                                      className="w-32 h-8 text-xs"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2 text-xs whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                      onClick={() => handleEncashCheque(entry)}
                                      disabled={
                                        encashingIds.has(entry.id) ||
                                        !encashmentDates[entry.id]
                                      }
                                    >
                                      {encashingIds.has(entry.id) ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        "Encash"
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-destructive/5 border-t-2 border-destructive/30">
                          <td
                            colSpan={4}
                            className="py-2 px-3 text-right font-bold text-destructive"
                          >
                            Total Issued:
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-destructive">
                            ₹{chequesData.totalAssignedIssued.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-6 text-muted-foreground justify-center">
                    <Search className="w-4 h-4" />
                    <span className="text-sm">
                      No cheques issued for payment yet.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Balance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Balance Comparison</CardTitle>
                <CardDescription>
                  Enter the bank statement balance and your cash book balance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="bankBalance"
                      className="text-sm font-medium text-foreground block mb-2"
                    >
                      Bank Balance (as per bank statement)
                    </label>
                    <Input
                      id="bankBalance"
                      type="number"
                      placeholder="0.00"
                      value={bankBalance}
                      onChange={(e) => setBankBalance(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bookBalance"
                      className="text-sm font-medium text-foreground block mb-2"
                    >
                      Cash Book Balance
                    </label>
                    <Input
                      id="bookBalance"
                      type="number"
                      placeholder="0.00"
                      value={bookBalance}
                      onChange={(e) => setBookBalance(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {(parseFloat(bankBalance) || 0) > 0 &&
                  (parseFloat(bookBalance) || 0) > 0 && (
                    <div
                      className={`rounded-lg p-4 ${difference === 0 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          Difference
                        </span>
                        <span
                          className={`text-lg font-bold ${difference === 0 ? "text-emerald-600" : "text-amber-600"}`}
                        >
                          {difference >= 0 ? "+" : ""}₹
                          {difference.toLocaleString()}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 ${difference === 0 ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {difference === 0
                          ? "Balanced! The bank and book balances match."
                          : "There is a difference between bank and book balances. Add reconciliation items to explain the variance."}
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Remarks */}
            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-background"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any notes about this reconciliation..."
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
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
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Creating..." : "Create Reconciliation"}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
