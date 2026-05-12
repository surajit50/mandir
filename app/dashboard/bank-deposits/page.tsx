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
  Loader2,
  CheckCircle2,
} from "lucide-react";
import useSWR, { useSWRConfig } from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BankDeposit {
  id: string;
  depositNumber: string;
  depositDate: string;
  totalAmount: number;
  depositType: string;
  status: string;
  remarks?: string;
  account: {
    id: string;
    bankName: string;
    accountNumber: string;
  };
  cheques: any[];
  createdAt: string;
}

export default function BankDepositsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "";

  const {
    data: deposits,
    error,
    isLoading,
    mutate,
  } = useSWR<BankDeposit[]>("/api/bank-deposits", fetcher);

  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const handleVerify = async (id: string) => {
    try {
      setIsVerifying(id);
      const res = await fetch(`/api/bank-deposits/${id}/verify`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to verify deposit");
      }

      toast.success("Deposit verified successfully");
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Error verifying deposit");
    } finally {
      setIsVerifying(null);
    }
  };

  const [filter, setFilter] = useState("ALL");

  const filteredDeposits = deposits?.filter((d) => {
    if (filter === "ALL") return true;
    return d.status === filter;
  });

  const totalAmount = deposits?.reduce((sum, d) => sum + d.totalAmount, 0) || 0;

  const statusConfig: Record<string, { icon: any; color: string }> = {
    PENDING: { icon: Clock, color: "text-amber-600" },
    VERIFIED: { icon: CheckCircle, color: "text-emerald-600" },
    REJECTED: { icon: AlertCircle, color: "text-red-600" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Deposits</h1>
          <p className="text-muted-foreground mt-2">
            Record and manage cash and cheque deposits
          </p>
        </div>
        <Link href="/dashboard/bank-deposits/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            New Deposit
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Deposits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">
            ₹{totalAmount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {deposits?.length || 0} deposits recorded
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "PENDING", "VERIFIED", "REJECTED"].map((f) => (
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

      {/* Deposits List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading deposits...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading deposits</p>
          </CardContent>
        </Card>
      ) : filteredDeposits && filteredDeposits.length > 0 ? (
        <div className="space-y-4">
          {filteredDeposits.map((deposit) => {
            const statusInfo =
              statusConfig[deposit.status] || statusConfig.PENDING;
            const Icon = statusInfo.icon;

            return (
              <Card
                key={deposit.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {deposit.depositNumber}
                        </h3>
                        <Icon className={`w-5 h-5 ${statusInfo.color}`} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {deposit.account.bankName} •{" "}
                        {deposit.account.accountNumber}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(deposit.depositDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">
                        ₹{deposit.totalAmount.toLocaleString()}
                      </p>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded inline-block mt-2 ${
                          deposit.status === "VERIFIED"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : deposit.status === "REJECTED"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {deposit.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 items-center text-sm text-muted-foreground mb-3">
                    <span className="font-medium">Type:</span>
                    <span>{deposit.depositType}</span>
                    {deposit.cheques && deposit.cheques.length > 0 && (
                      <>
                        <span className="text-muted-foreground">\u2022</span>
                        <span>{deposit.cheques.length} cheque(s)</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {["ADMIN", "ACCOUNTANT"].includes(userRole) &&
                      deposit.status === "PENDING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 h-8 w-8 p-0"
                          onClick={() => handleVerify(deposit.id)}
                          disabled={isVerifying === deposit.id}
                          title="Verify Deposit"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    <Link href={`/dashboard/bank-deposits/${deposit.id}`}>
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
            <p className="text-muted-foreground">No deposits found</p>
            <Link href="/dashboard/bank-deposits/new">
              <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                Create First Deposit
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
