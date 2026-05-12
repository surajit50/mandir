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
import {
  ArrowLeft,
  Loader2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FestivalTransaction {
  id: string;
  transactionDate: string;
  description: string;
  transactionType: string;
  amount: number;
  remarks?: string;
}

interface FestivalDetail {
  id: string;
  festivalName: string;
  festivalDate: string;
  description?: string;
  budgetAmount: number;
  festivalTransactions: FestivalTransaction[];
}

export default function FestivalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const festivalId = params.id as string;

  const [festival, setFestival] = useState<FestivalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFestival();
  }, [festivalId]);

  const fetchFestival = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/festivals/${festivalId}`);
      if (!res.ok) throw new Error("Failed to fetch festival details");
      const data = await res.json();
      setFestival(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching festival");
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

  if (error || !festival)
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error || "Festival not found"}</p>
        <Link href="/dashboard/festivals">
          <Button variant="outline">Back to Festivals</Button>
        </Link>
      </div>
    );

  const totalIncome = festival.festivalTransactions
    .filter((t) => t.transactionType === "Income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = festival.festivalTransactions
    .filter((t) => t.transactionType === "Expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/festivals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{festival.festivalName}</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              {new Date(festival.festivalDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit Festival</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{festival.budgetAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{totalIncome.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{totalExpense.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${netBalance >= 0 ? "text-blue-600" : "text-orange-600"}`}
            >
              ₹{netBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Income and expenditure for this festival
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {festival.festivalTransactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-10 text-gray-500"
                  >
                    No transactions recorded for this festival yet
                  </TableCell>
                </TableRow>
              ) : (
                festival.festivalTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {new Date(t.transactionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{t.description}</div>
                      {t.remarks && (
                        <div className="text-xs text-gray-500">{t.remarks}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.transactionType === "Income"
                            ? "success"
                            : ("destructive" as any)
                        }
                      >
                        {t.transactionType === "Income" ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {t.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${t.transactionType === "Income" ? "text-green-600" : "text-red-600"}`}
                    >
                      ₹{t.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
