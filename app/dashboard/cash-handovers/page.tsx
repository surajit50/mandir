"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";

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

import {
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Wallet,
  Users,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CashHandover {
  id: string;
  handoverDate: string;
  totalAmount: number;
  status: string;
  remarks?: string;

  handoverFromUser: {
    id: string;
    name: string;
    email: string;
  };

  createdAt: string;
}

interface MemberBalance {
  id: string;
  name: string;
  email: string;
  balance: number;
}

export default function CashHandoversPage() {
  const { data: session } = useSession();

  const userRole = session?.user?.role || "";

  const {
    data: handovers,
    error,
    isLoading,
    mutate,
  } = useSWR<CashHandover[]>("/api/cash-handovers", fetcher);

  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    try {
      setIsVerifying(id);
      const res = await fetch(`/api/cash-handovers/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to approve handover");
      }

      toast.success("Handover approved successfully");
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Error approving handover");
    } finally {
      setIsVerifying(null);
    }
  };

  const { data: memberBalances, isLoading: isLoadingBalances } = useSWR<
    MemberBalance[]
  >(
    ["ADMIN", "ACCOUNTANT"].includes(userRole) ? "/api/members/balances" : null,
    fetcher,
  );

  const [filter, setFilter] = useState("ALL");

  const pendingBalances = memberBalances?.filter((m) => m.balance > 0) || [];

  const totalPendingCash = pendingBalances.reduce(
    (sum, m) => sum + m.balance,
    0,
  );

  const filteredHandovers = handovers?.filter((h) => {
    if (filter === "APPROVED") return h.status === "APPROVED";

    if (filter === "PENDING") return ["DRAFT", "SUBMITTED"].includes(h.status);

    if (filter === "REJECTED") return h.status === "REJECTED";

    return true;
  });

  const statusConfig: Record<string, { icon: any; color: string }> = {
    DRAFT: {
      icon: Clock,
      color: "text-muted-foreground",
    },

    SUBMITTED: {
      icon: AlertCircle,
      color: "text-amber-600",
    },

    APPROVED: {
      icon: CheckCircle,
      color: "text-emerald-600",
    },

    REJECTED: {
      icon: AlertCircle,
      color: "text-destructive",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Handovers</h1>

          <p className="text-muted-foreground mt-1">
            Manage cash handover approvals
          </p>
        </div>

        {userRole !== "ADMIN" && (
          <Link href="/dashboard/cash-handovers/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Handover
            </Button>
          </Link>
        )}
      </div>

      {/* Balance Summary */}
      {["ADMIN", "ACCOUNTANT"].includes(userRole) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Total Pending Cash */}
          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Total Pending Cash
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-300">
                ₹{totalPendingCash.toLocaleString()}
              </p>

              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                Total cash with all members
              </p>
            </CardContent>
          </Card>

          {/* Member Balances */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Member Pending Balances
              </CardTitle>
            </CardHeader>

            <CardContent>
              {isLoadingBalances ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                </div>
              ) : pendingBalances.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-44 overflow-y-auto pr-2">
                  {pendingBalances.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between border rounded-lg p-3 bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {member.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>

                      <p className="font-bold text-emerald-600">
                        ₹{member.balance.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  All collected cash has been handed over.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "APPROVED", "PENDING", "REJECTED"].map((f) => (
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

      {/* Loading */}
      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Loading handovers...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Error loading cash handovers</p>
          </CardContent>
        </Card>
      ) : filteredHandovers && filteredHandovers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cash Handover List</CardTitle>

            <CardDescription>View and manage all handovers</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>

                    <TableHead>Handover Date</TableHead>

                    <TableHead>Amount</TableHead>

                    <TableHead>Status</TableHead>

                    <TableHead>Created</TableHead>

                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredHandovers.map((handover) => {
                    const statusInfo =
                      statusConfig[handover.status] || statusConfig.DRAFT;

                    const Icon = statusInfo.icon;

                    return (
                      <TableRow key={handover.id}>
                        {/* Member */}
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {handover.handoverFromUser.name}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {handover.handoverFromUser.email}
                            </p>
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          {new Date(handover.handoverDate).toLocaleDateString()}
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="font-semibold text-foreground">
                          ₹{handover.totalAmount.toLocaleString()}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${statusInfo.color}`} />

                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium
                              ${
                                handover.status === "APPROVED"
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                  : handover.status === "REJECTED"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              }`}
                            >
                              {handover.status}
                            </span>
                          </div>
                        </TableCell>

                        {/* Created */}
                        <TableCell>
                          {new Date(handover.createdAt).toLocaleDateString()}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {["ADMIN", "ACCOUNTANT"].includes(userRole) &&
                              handover.status === "SUBMITTED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 h-8 w-8 p-0"
                                  onClick={() => handleApprove(handover.id)}
                                  disabled={isVerifying === handover.id}
                                  title="Approve Handover"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                            <Link
                              href={`/dashboard/cash-handovers/${handover.id}`}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No cash handovers found</p>

            {userRole !== "ADMIN" && (
              <Link href="/dashboard/cash-handovers/new">
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  Create First Handover
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
