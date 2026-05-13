"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  accountHolder: string;
  currentBalance: number;
}

interface BankTransaction {
  id: string;
  amount: number;
  type: string; // "CREDIT" | "DEBIT"
  description: string | null;
  transactionDate: string;
  paymentVoucher?: {
    voucherNumber: string;
  } | null;
  createdAt: string;
}

export default function PassbookPage() {
  const { id } = useParams<{ id: string }>();

  const { data, error, isLoading } = useSWR<{
    account: BankAccount;
    transactions: BankTransaction[];
  }>(id ? `/api/bank-accounts/${id}/passbook` : null, fetcher);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading passbook...</div>;
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading passbook</p>
          <Link href="/dashboard/bank-accounts">
            <Button variant="outline" className="mt-4">Back to Accounts</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { account, transactions } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Passbook</h1>
          <p className="text-muted-foreground mt-1">
            {account.bankName} — {account.accountNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/bank-accounts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          {/* You can add a download/export feature later */}
        </div>
      </div>

      {/* Current Balance Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-600">
            ₹{account.currentBalance.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Holder: {account.accountHolder}
          </p>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Description</th>
                    <th className="py-2 pr-4 font-medium">Voucher</th>
                    <th className="py-2 pr-4 font-medium text-right">Amount</th>
                    <th className="py-2 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => {
                    // Running balance for display (we can compute from the bottom or just leave blank)
                    // Simpler: show the transaction amount only, balance can be derived but we need order.
                    // We'll compute cumulative balance assuming ascending order of date, but the data is descending.
                    // For simplicity, we'll reverse the array to compute from oldest to newest.
                    // But that would require calculation. We'll just show amount and "type".
                    const isCredit = tx.type === "CREDIT";
                    const amountFormatted = (isCredit ? "+" : "-") + "₹" + tx.amount.toLocaleString();
                    const date = new Date(tx.transactionDate).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-2 pr-4 whitespace-nowrap">{date}</td>
                        <td className="py-2 pr-4">{tx.description || "—"}</td>
                        <td className="py-2 pr-4">
                          {tx.paymentVoucher ? (
                            <Link
                              href={`/dashboard/vouchers/${tx.paymentVoucher.voucherNumber}`}
                              className="text-blue-600 hover:underline"
                            >
                              {tx.paymentVoucher.voucherNumber}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={`py-2 pr-4 text-right font-medium ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                          {amountFormatted}
                        </td>
                        <td className="py-2 text-right font-mono">
                          {/* Balance would be computed if we had order. For now we skip or use placeholder */}
                          {/* We can add a running balance column later if desired */}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
