"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
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

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      const res = await fetch(`/api/vouchers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete voucher");
      }

      toast.success("Voucher deleted successfully");
      mutate();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error deleting voucher");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setIsVerifying(id);
      const res = await fetch(`/api/vouchers/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to approve voucher");
      }

      toast.success("Voucher approved successfully");
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Error approving voucher");
    } finally {
      setIsVerifying(null);
    }
  };

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.description?.toLowerCase().includes(query) ||
          v.payee?.name?.toLowerCase().includes(query) ||
          v.voucherNumber?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [vouchersArray, statusFilter, typeFilter, searchQuery]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6 p-1 sm:p-0">
      {/* Page Header */}
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
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Voucher
            </Button>
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by description, payee, or voucher #"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              {["ALL", "PAYMENT", "RECEIPT"].map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                    typeFilter === type
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === "ALL"
                    ? "All Types"
                    : type === "PAYMENT"
                      ? "Payment"
                      : "Receipt"}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-1.5">
            {["ALL", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    statusFilter === status
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:border-foreground/20"
                  }`}
                >
                  {status === "ALL"
                    ? "All Statuses"
                    : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ),
            )}
          </div>

          {filteredVouchers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredVouchers.length} voucher
              {filteredVouchers.length !== 1 && "s"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Table Content */}
      {isLoading ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payee / Payer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-destructive/60 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-destructive mb-1">
              Failed to load vouchers
            </h3>
            <p className="text-destructive/80 text-sm mb-4">
              There was an error connecting to the server.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredVouchers.length > 0 ? (
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Voucher No</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Payee / Payer</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Method</TableHead>
                  <TableHead className="text-right font-semibold">
                    Amount
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => {
                  const status =
                    statusConfig[voucher.status] || statusConfig.DRAFT;
                  const StatusIcon = status.icon;

                  return (
                    <TableRow
                      key={voucher.id}
                      className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors"
                    >
                      <TableCell className="font-medium text-foreground">
                        {voucher.voucherNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-medium ${
                            voucher.voucherType === "PAYMENT"
                              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                              : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                          }
                          }`}
                        >
                          {voucher.voucherType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(voucher.voucherDate)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="font-medium">{voucher.payee.name}</div>
                        {voucher.payee.payeeType && (
                          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-0.5">
                            {voucher.payee.payeeType.replace(/_/g, " ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate text-sm">
                        {voucher.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {voucher.paymentMethod}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        ₹{voucher.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="shadow-sm h-8"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>

                          {(voucher.status === "DRAFT" || voucher.status === "REJECTED") &&
                            (userRole === "ADMIN" || userRole === "ACCOUNTANT") && (
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
                                      Are you sure you want to delete this voucher? This action will permanently remove the record and cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(voucher.id)} 
                                      className="bg-destructive hover:bg-destructive/90 text-white"
                                    >
                                      {isDeleting === voucher.id ? "Deleting..." : "Delete Voucher"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No vouchers found
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              {searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? "No vouchers match your current filters. Try adjusting your search or filters."
                : "Get started by creating your first payment or receipt voucher."}
            </p>
            {userRole !== "ADMIN" && (
              <Link href="/dashboard/vouchers/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Voucher
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
