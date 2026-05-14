"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PaymentVoucher {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: "PAYMENT" | "RECEIPT";
  amount: number;
  description: string;
  paymentMethod: string;
  status: string;
  payee: {
    id: string;
    name: string;
    email: string;
    payeeType?: string;
  };
  createdAt: string;
}

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  DRAFT: {
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
    label: "Draft",
  },
  SUBMITTED: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    label: "Submitted",
  },
  APPROVED: {
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    label: "Approved",
  },
  REJECTED: {
    icon: AlertCircle,
    color: "text-destructive",
    bg: "bg-destructive/5 border-destructive/20",
    label: "Rejected",
  },
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function VouchersPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "";

  const {
    data: vouchers = [],
    error,
    isLoading,
    mutate,
  } = useSWR<PaymentVoucher[]>("/api/vouchers", fetcher);

  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      const res = await fetch(`/api/vouchers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete voucher");
      }
      toast.success("Voucher deleted successfully");
      mutate();
    } catch (error: any) {
      toast.error(error.message || "Error deleting voucher");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setIsVerifying(id);
      const res = await fetch(`/api/vouchers/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve voucher");
      toast.success("Voucher approved successfully");
      mutate();
    } catch {
      toast.error("Error approving voucher");
    } finally {
      setIsVerifying(null);
    }
  };

  const vouchersArray = Array.isArray(vouchers) ? vouchers : [];

  const filteredVouchers = useMemo(() => {
    let result = vouchersArray;
    if (statusFilter !== "ALL") {
      if (statusFilter === "PENDING") {
        result = result.filter((v) => v.status !== "APPROVED");
      } else {
        result = result.filter((v) => v.status === statusFilter);
      }
    }
    if (typeFilter !== "ALL") {
      result = result.filter((v) => v.voucherType === typeFilter);
    }
    return result;
  }, [vouchersArray, statusFilter, typeFilter]);

  // ── Column Definitions ───────────────────────────────────────────────────────
  const columns: ColumnDef<PaymentVoucher>[] = [
    {
      id: "voucherNumber",
      accessorKey: "voucherNumber",
      header: "Voucher No.",
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground font-mono">{getValue<string>()}</span>
      ),
    },
    {
      id: "voucherType",
      accessorKey: "voucherType",
      header: "Type",
      cell: ({ getValue }) => {
        const type = getValue<string>();
        return (
          <Badge
            variant="outline"
            className={`font-medium text-xs ${
              type === "PAYMENT"
                ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
            }`}
          >
            {type}
          </Badge>
        );
      },
    },
    {
      id: "voucherDate",
      accessorKey: "voucherDate",
      header: "Date",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-sm">{formatDate(getValue<string>())}</span>
      ),
    },
    {
      id: "payee",
      accessorFn: (row) => row.payee.name,
      header: "Payee / Payer",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">{row.original.payee.name}</div>
          {row.original.payee.payeeType && (
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-0.5">
              {row.original.payee.payeeType.replace(/_/g, " ")}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-sm max-w-[180px] truncate block">
          {getValue<string>()}
        </span>
      ),
    },
    {
      id: "paymentMethod",
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-sm">{getValue<string>()}</span>
      ),
    },
    {
      id: "amount",
      accessorKey: "amount",
      header: "Amount",
      cell: ({ getValue }) => (
        <span className="font-semibold text-foreground">
          ₹{getValue<number>().toLocaleString()}
        </span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = statusConfig[getValue<string>()] || statusConfig.DRAFT;
        const StatusIcon = status.icon;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const voucher = row.original;
        return (
          <div className="flex justify-end gap-2">
            {["ADMIN", "ACCOUNTANT"].includes(userRole) &&
              voucher.status === "SUBMITTED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 h-8 w-8 p-0"
                  onClick={() => handleApprove(voucher.id)}
                  disabled={isVerifying === voucher.id}
                  title="Approve Voucher"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              )}
            <Link href={`/dashboard/vouchers/${voucher.id}`}>
              <Button variant="outline" size="sm" className="h-8">
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </Link>
            {(voucher.status === "DRAFT" || voucher.status === "REJECTED") &&
              ["ADMIN", "ACCOUNTANT"].includes(userRole) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/20 hover:bg-destructive/10 h-8 w-8 p-0"
                      disabled={isDeleting === voucher.id}
                      title="Delete Voucher"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Voucher</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this voucher? This action will
                        permanently remove the record and cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(voucher.id)}
                        className="bg-destructive hover:bg-destructive/90 text-white"
                      >
                        {isDeleting === voucher.id ? "Deleting…" : "Delete Voucher"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-1 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Vouchers
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create and manage payment and receipt vouchers
          </p>
        </div>
        {userRole !== "ADMIN" && (
          <Link href="/dashboard/vouchers/new">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              New Voucher
            </Button>
          </Link>
        )}
      </div>

      {/* Table / States */}
      {isLoading ? (
        <Card className="border-border shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            Loading vouchers…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-destructive/60 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-destructive mb-1">
              Failed to load vouchers
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 mt-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={filteredVouchers}
              searchPlaceholder="Search voucher no., payee, description…"
              toolbarRight={
                <div className="flex flex-wrap items-center gap-2">
                  {/* Type filter */}
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="PAYMENT">Payment</SelectItem>
                      <SelectItem value="RECEIPT">Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Status filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
              emptyState={
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    No vouchers found
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    {statusFilter !== "ALL" || typeFilter !== "ALL"
                      ? "No vouchers match your current filters."
                      : "Get started by creating your first voucher."}
                  </p>
                  {userRole !== "ADMIN" && (
                    <Link href="/dashboard/vouchers/new">
                      <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Voucher
                      </Button>
                    </Link>
                  )}
                </div>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
