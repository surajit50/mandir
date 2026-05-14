"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, Calendar } from "lucide-react";

interface Receipt {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  donorName: string;
  amount: number;
  receiptType: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/receipts");
      if (!res.ok) throw new Error("Failed to fetch receipts");
      const data = await res.json();
      setReceipts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching receipts");
    } finally {
      setLoading(false);
    }
  };

  // ── Column Definitions ───────────────────────────────────────────────────────
  const columns: ColumnDef<Receipt>[] = [
    {
      id: "receiptNumber",
      accessorKey: "receiptNumber",
      header: "Receipt No.",
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
          <FileText className="w-4 h-4 text-amber-500 shrink-0" />
          {getValue<string>()}
        </div>
      ),
    },
    {
      id: "receiptDate",
      accessorKey: "receiptDate",
      header: "Date",
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4 shrink-0" />
          {new Date(getValue<string>()).toLocaleDateString("en-IN")}
        </div>
      ),
    },
    {
      id: "donorName",
      accessorKey: "donorName",
      header: "Donor Name",
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground">{getValue<string>()}</span>
      ),
    },
    {
      id: "receiptType",
      accessorKey: "receiptType",
      header: "Type",
      cell: ({ getValue }) => (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700 text-xs font-medium">
          {getValue<string>()}
        </Badge>
      ),
    },
    {
      id: "amount",
      accessorKey: "amount",
      header: "Amount",
      cell: ({ getValue }) => (
        <span className="font-bold text-amber-600">
          ₹{getValue<number>().toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donation Receipts</h1>
          <p className="text-muted-foreground mt-1">View all generated donation receipts</p>
        </div>
        <Link href="/dashboard/receipts/new">
          <Button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <FileText className="w-4 h-4" />
            Generate Receipt
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">
              Loading receipts…
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={receipts}
              searchPlaceholder="Search by donor name or receipt no…"
              searchKey="donorName"
              emptyState={
                <p className="text-muted-foreground py-4">No receipts found.</p>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
