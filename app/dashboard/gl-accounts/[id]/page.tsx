"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, BookOpen, Download } from "lucide-react";
import Link from "next/link";

interface GLPosting {
  id: string;
  postingDate: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  referenceType: string;
}

interface GLAccountDetail {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  subType?: string;
  description?: string;
  openingBalance: number;
  currentBalance: number;
  postings: GLPosting[];
}

export default function GLAccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<GLAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccount();
  }, [accountId]);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/gl-accounts/${accountId}`);
      if (!res.ok) throw new Error("Failed to fetch account details");
      const data = await res.json();
      setAccount(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching account");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );

  if (error || !account)
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error || "Account not found"}</p>
        <Link href="/dashboard/gl-accounts">
          <Button variant="outline">Back to GL Accounts</Button>
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/gl-accounts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{account.accountName}</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <Badge variant="outline">{account.accountCode}</Badge>
              <span className="text-sm font-medium">
                {account.accountType}{" "}
                {account.subType ? `(${account.subType})` : ""}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Ledger
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{account.openingBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{account.currentBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{account.postings.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Ledger</CardTitle>
          <CardDescription>
            Detailed transaction history for this account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit (₹)</TableHead>
                <TableHead className="text-right">Credit (₹)</TableHead>
                <TableHead className="text-right">Balance (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {account.postings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-gray-500"
                  >
                    No postings found for this account
                  </TableCell>
                </TableRow>
              ) : (
                account.postings.map((p, index) => {
                  // This balance calculation is simplified for display
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {new Date(p.postingDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase"
                        >
                          {p.referenceType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {p.debitAmount > 0
                          ? p.debitAmount.toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {p.creditAmount > 0
                          ? p.creditAmount.toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {/* Note: Balance column would ideally be pre-calculated by the API */}
                        ₹
                        {(
                          account.openingBalance +
                          account.postings
                            .slice(0, index + 1)
                            .reduce(
                              (acc, curr) =>
                                acc + curr.creditAmount - curr.debitAmount,
                              0,
                            )
                        ).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
