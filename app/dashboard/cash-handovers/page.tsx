"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Wallet,
  Users,
  CheckCircle2,
  Building2,
} from "lucide-react";

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
  bankDepositId?: string;
}

interface MemberBalance {
  id: string;
  name: string;
  email: string;
  balance: number;
}

const statusConfig: Record<string, { icon: any; color: string; badgeCls: string }> = {
  DRAFT: {
    icon: Clock,
    color: "text-muted-foreground",
    badgeCls: "bg-muted text-muted-foreground border-border",
  },
  SUBMITTED: {
    icon: AlertCircle,
    color: "text-amber-600",
    badgeCls:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  APPROVED: {
    icon: CheckCircle,
    color: "text-emerald-600",
    badgeCls:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  REJECTED: {
    icon: AlertCircle,
    color: "text-destructive",
    badgeCls: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

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
  const [filter, setFilter] = useState("APPROVED");

  const handleApprove = async (id: string) => {
    try {
      setIsVerifying(id);
      const res = await fetch(`/api/cash-handovers/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve handover");
      toast.success("Handover approved successfully");
      mutate();
    } catch {
      toast.error("Error approving handover");
    } finally {
      setIsVerifying(null);
    }
  };

  const { data: memberBalances, isLoading: isLoadingBalances } = useSWR<MemberBalance[]>(
    ["ADMIN", "ACCOUNTANT"].includes(userRole) ? "/api/members/balances" : null,
    fetcher
  );

  const pendingBalances = memberBalances?.filter((m) => m.balance > 0) || [];
  const totalPendingCash = pendingBalances.reduce((sum, m) => sum + m.balance, 0);

  const filteredHandovers = handovers?.filter((h) => {
    if (filter === "APPROVED") return h.status === "APPROVED";
    if (filter === "PENDING") return ["DRAFT", "SUBMITTED"].includes(h.status);
    if (filter === "REJECTED") return h.status === "REJECTED";
    return true;
  });

  // ── Column Definitions ───────────────────────────────────────────────────────
  const columns: ColumnDef<CashHandover>[] = [
    {
      id: "member",
      accessorFn: (row) => row.handoverFromUser.name,
      header: "Member",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">
            {row.original.handoverFromUser.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.handoverFromUser.email}
          </p>
        </div>
      ),
    },
    {
      id: "handoverDate",
      accessorKey: "handoverDate",
      header: "Handover Date",
      cell: ({ getValue }) =>
        new Date(getValue<string>()).toLocaleDateString("en-IN"),
    },
    {
      id: "totalAmount",
      accessorKey: "totalAmount",
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
        const status = getValue<string>();
        const cfg = statusConfig[status] || statusConfig.DRAFT;
        const Icon = cfg.icon;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badgeCls}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) =>
        new Date(getValue<string>()).toLocaleDateString("en-IN"),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const handover = row.original;
        return (
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
            {["ADMIN", "ACCOUNTANT"].includes(userRole) &&
              handover.status === "APPROVED" && !handover.bankDepositId && (
                <Link href={`/dashboard/bank-deposits/new?handoverId=${handover.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 h-8"
                    title="Deposit to Bank"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Deposit
                  </Button>
                </Link>
              )}
            <Link href={`/dashboard/cash-handovers/${handover.id}`}>
              <Button variant="outline" size="sm" className="h-8">
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Handovers</h1>
          <p className="text-muted-foreground mt-1">Manage cash handover approvals</p>
        </div>
        {userRole !== "ADMIN" && (
          <Link href="/dashboard/cash-handovers/new">
            <Button className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Handover
            </Button>
          </Link>
        )}
      </div>

      {/* Balance Summary */}
      {["ADMIN", "ACCOUNTANT"].includes(userRole) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                </div>
              ) : pendingBalances.length > 0 ? (
                <ScrollArea className="h-[200px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pendingBalances.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between border rounded-lg p-3 bg-muted/50"
                      >
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {member.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <p className="font-bold text-emerald-600">
                          ₹{member.balance.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  All collected cash has been handed over.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Handover List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">
              Loading handovers…
            </div>
          ) : error ? (
            <div className="py-10 text-center text-destructive">
              Error loading cash handovers
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredHandovers ?? []}
              searchPlaceholder="Search member, status…"
              toolbarRight={
                <div className="flex flex-wrap gap-2">
                  {["ALL", "APPROVED", "PENDING", "REJECTED"].map((f) => (
                    <Button
                      key={f}
                      variant={filter === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter(f)}
                      className={
                        filter === f
                          ? "bg-amber-600 hover:bg-amber-700 text-white h-9"
                          : "h-9"
                      }
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              }
              emptyState={
                <div className="py-8">
                  <p className="text-muted-foreground">No cash handovers found</p>
                  {userRole !== "ADMIN" && (
                    <Link href="/dashboard/cash-handovers/new">
                      <Button className="mt-4 bg-amber-600 hover:bg-amber-700 text-white">
                        Create First Handover
                      </Button>
                    </Link>
                  )}
                </div>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
