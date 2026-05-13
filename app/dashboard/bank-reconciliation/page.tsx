"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BankReconciliation {
  id: string;
  reconciliationDate: string;
  bankBalance: number;
  bookBalance: number;
  difference: number;
  status: string;
  remarks?: string;
  account: {
    id: string;
    accountNumber: string;
    bankName: string;
  };
  createdAt: string;
}

export default function BankReconciliationPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "";

  const {
    data: reconciliations,
    error,
    isLoading,
    mutate,
  } = useSWR<BankReconciliation[]>("/api/bank-reconciliation", fetcher);

  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    try {
      setIsVerifying(id);
      const res = await fetch(`/api/bank-reconciliation/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to approve reconciliation");
      }

      toast.success("Reconciliation approved successfully");
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Error approving reconciliation");
    } finally {
      setIsVerifying(null);
    }
  };

  const [filter, setFilter] = useState("ALL");

  const filteredReconciliations = reconciliations?.filter((r) => {
    if (filter === "APPROVED") return r.status === "APPROVED";
    if (filter === "PENDING") return r.status !== "APPROVED";
    return true;
  });

  const statusConfig: Record<string, { icon: any; color: string }> = {
    PENDING: { icon: Clock, color: "text-amber-600" },
    APPROVED: { icon: CheckCircle, color: "text-emerald-600" },
    REJECTED: { icon: AlertCircle, color: "text-destructive" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bank Reconciliation
          </h1>
          <p className="text-muted-foreground mt-2">
            Reconcile bank accounts with cash book
          </p>
        </div>
        {userRole !== "ADMIN" && (
          <Link href="/dashboard/bank-reconciliation/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              New Reconciliation
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "PENDING", "APPROVED"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className={
              filter === f ? "bg-emerald-600 hover:bg-emerald-700" : ""
            }
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Reconciliations List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading reconciliations...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading reconciliations</p>
          </CardContent>
        </Card>
      ) : filteredReconciliations && filteredReconciliations.length > 0 ? (
        <div className="space-y-4">
          {filteredReconciliations.map((recon) => {
            const statusInfo =
              statusConfig[recon.status] || statusConfig.PENDING;
            const Icon = statusInfo.icon;
            const isDifference = recon.difference !== 0;

            return (
              <Card
                key={recon.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {recon.account.bankName}
                        </h3>
                        <Icon className={`w-5 h-5 ${statusInfo.color}`} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {recon.account.accountNumber} •{" "}
                        {new Date(
                          recon.reconciliationDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded inline-block ${
                          recon.status === "APPROVED"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {recon.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Bank Balance
                      </p>
                      <p className="font-semibold text-foreground">
                        ₹{recon.bankBalance.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Book Balance
                      </p>
                      <p className="font-semibold text-foreground">
                        ₹{recon.bookBalance.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Difference
                      </p>
                      <p
                        className={`font-semibold ${
                          isDifference ? "text-destructive" : "text-emerald-600"
                        }`}
                      >
                        ₹{recon.difference.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {["ADMIN", "ACCOUNTANT"].includes(userRole) &&
                      recon.status === "PENDING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 h-8 w-8 p-0"
                          onClick={() => handleApprove(recon.id)}
                          disabled={isVerifying === recon.id}
                          title="Approve Reconciliation"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    <Link href={`/dashboard/bank-reconciliation/${recon.id}`}>
                      <Button variant="outline" size="sm" className="h-8">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No reconciliations found</p>
            {userRole !== "ADMIN" && (
              <Link href="/dashboard/bank-reconciliation/new">
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  Start Reconciliation
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
