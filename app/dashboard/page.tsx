"use client";

import { useEffect, useState } from "react";
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
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  FileText,
  Archive,
  HandCoins,
  BookOpen,
  CreditCard,
  BarChart3,
  FolderOpen,
  Landmark,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DashboardStats {
  totalDonations: number;
  totalMembers: number;
  totalBankBalance: number;
  totalCashOnHand: number;
  totalDocuments: number;
  pendingApprovals: number;
  recentDonations: any[];
  currentFY: { id: string; yearCode: string } | null;
  // Member specific
  totalHandovers?: number;
  memberBalance?: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "";

  const [stats, setStats] = useState<DashboardStats>({
    totalDonations: 0,
    totalMembers: 0,
    totalBankBalance: 0,
    totalCashOnHand: 0,
    totalDocuments: 0,
    pendingApprovals: 0,
    recentDonations: [],
    currentFY: null,
    totalHandovers: 0,
    memberBalance: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get current financial year first
        const currentFY = await fetch(
          "/api/financial-years?isCurrent=true",
        ).then((r) => r.json());
        const fyId = currentFY?.id;

        // Fetch required data based on role
        if (["ADMIN", "ACCOUNTANT"].includes(userRole)) {
          const [donations, members, accounts, vouchers, documents, glAccounts] =
            await Promise.all([
              fetch(
                `/api/donations${fyId ? `?financialYearId=${fyId}` : ""}`,
              ).then((r) => r.json()),
              fetch("/api/users").then((r) => r.json()),
              fetch("/api/bank-accounts").then((r) => r.json()),
              fetch("/api/vouchers").then((r) => r.json()),
              fetch("/api/filing")
                .then((r) => r.json())
                .catch(() => []),
              fetch("/api/gl-accounts")
                .then((r) => r.json())
                .catch(() => []),
            ]);

          const totalDonations = donations.reduce(
            (sum: number, d: any) => sum + d.totalAmount,
            0,
          );
          const totalBankBalance = accounts.reduce(
            (sum: number, a: any) => sum + a.currentBalance,
            0,
          );
          const pendingVouchers = vouchers.filter(
            (v: any) => v.status !== "APPROVED",
          ).length;

          const cashAccount = (glAccounts || []).find((a: any) => a.accountCode === "1001" || a.accountName === "Cash Account");
          const totalCashOnHand = cashAccount ? cashAccount.currentBalance : 0;

          setStats({
            totalDonations,
            totalMembers: members.length,
            totalBankBalance,
            totalCashOnHand,
            totalDocuments: documents.length || 0,
            pendingApprovals: pendingVouchers,
            recentDonations: donations.slice(0, 5),
            currentFY: currentFY && !currentFY.error ? currentFY : null,
          });
        } else if (userRole === "MEMBER") {
          const [donations, handovers, balanceData] = await Promise.all([
            fetch(
              `/api/donations${fyId ? `?financialYearId=${fyId}` : ""}`,
            ).then((r) => r.json()),
            fetch("/api/cash-handovers").then((r) => r.json()),
            fetch("/api/members/me/balance").then((r) => r.json()),
          ]);

          const totalDonations = donations.reduce(
            (sum: number, d: any) => sum + d.totalAmount,
            0,
          );
          const totalHandovers = handovers
            .filter((h: any) => h.status === "APPROVED")
            .reduce((sum: number, h: any) => sum + h.amount, 0);

          const pendingVerification = donations
            .filter((d: any) => !d.isVerified)
            .reduce((sum: number, d: any) => sum + d.totalAmount, 0);

          setStats({
            totalDonations,
            totalMembers: 0,
            totalBankBalance: 0,
            totalCashOnHand: 0,
            totalDocuments: 0,
            pendingApprovals: pendingVerification,
            recentDonations: donations.slice(0, 5),
            currentFY: currentFY && !currentFY.error ? currentFY : null,
            totalHandovers: balanceData.totalHandedOver || totalHandovers,
            memberBalance: balanceData.balance || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userRole) {
      fetchStats();
    }
  }, [userRole]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {session?.user?.name || "User"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Donations Metric - Visible to all but label changes */}
        <Card className="hover:shadow-md transition-shadow border-t-2 border-t-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {userRole === "MEMBER" ? "My Collections" : "Total Donations"}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ₹{stats.totalDonations.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.currentFY
                    ? `FY ${stats.currentFY.yearCode} collection`
                    : "Total collection"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Second Metric - Role based */}
        {["ADMIN", "ACCOUNTANT"].includes(userRole) ? (
          <Card className="hover:shadow-md transition-shadow border-t-2 border-t-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Members
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stats.totalMembers}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active members
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover:shadow-md transition-shadow border-t-2 border-t-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Handovers
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    ₹{(stats.totalHandovers || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verified handovers
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <HandCoins className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Third Metric - Role based */}
        {["ADMIN", "ACCOUNTANT"].includes(userRole) ? (
          <Card className="hover:shadow-md transition-shadow border-t-2 border-t-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Bank Balance
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    ₹{stats.totalBankBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current balance
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover:shadow-md transition-shadow border-t-2 border-t-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Cash in Hand
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    ₹{(stats.memberBalance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    To be handed over
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fourth Metric - Role based */}
        {["ADMIN", "ACCOUNTANT"].includes(userRole) ? (
          <Card className="hover:shadow-md transition-shadow border-t-2 border-t-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Cash on Hand
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    ₹{stats.totalCashOnHand.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    GL Account Balance
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover:shadow-md transition-shadow border-t-2 border-t-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Verification
                  </p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    ₹{(stats.pendingApprovals || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Collections awaiting check
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {["ADMIN", "ACCOUNTANT"].includes(userRole) && (
          <Card className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Approvals
                  </p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {stats.pendingApprovals}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Awaiting action
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["ADMIN", "ACCOUNTANT", "MEMBER"].includes(userRole) && (
            <Link href="/dashboard/donations/new" className="group">
              <Card className="hover:shadow-md hover:border-primary/40 transition-all border-b-2 border-b-transparent hover:border-b-primary">
                <CardContent className="pt-5 flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <HandCoins className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    New Collection
                  </span>
                </CardContent>
              </Card>
            </Link>
          )}

          {["ADMIN", "ACCOUNTANT"].includes(userRole) && (
            <>
              <Link href="/dashboard/vouchers/new" className="group">
                <Card className="hover:shadow-md hover:border-primary/40 transition-all border-b-2 border-b-transparent hover:border-b-primary">
                  <CardContent className="pt-5 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      New Voucher
                    </span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/cheques/new" className="group">
                <Card className="hover:shadow-md hover:border-amber-400 transition-all border-b-2 border-b-transparent hover:border-b-amber-500">
                  <CardContent className="pt-5 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                      <BookOpen className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      Register Cheque
                    </span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/reports" className="group">
                <Card className="hover:shadow-md hover:border-primary/40 transition-all border-b-2 border-b-transparent hover:border-b-primary">
                  <CardContent className="pt-5 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      Reports
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}

          {userRole === "MEMBER" && (
            <>
              <Link href="/dashboard/cash-ledger" className="group">
                <Card className="hover:shadow-md hover:border-primary/40 transition-all border-b-2 border-b-transparent hover:border-b-primary">
                  <CardContent className="pt-5 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      My Ledger
                    </span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/cash-handovers/new" className="group">
                <Card className="hover:shadow-md hover:border-amber-400 transition-all border-b-2 border-b-transparent hover:border-b-amber-500">
                  <CardContent className="pt-5 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      Cash Handover
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}

          <Link href="/dashboard/donations" className="group">
            <Card className="hover:shadow-md hover:border-primary/40 transition-all border-b-2 border-b-transparent hover:border-b-primary">
              <CardContent className="pt-5 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground">
                  View History
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Donations */}
      {stats.recentDonations.length > 0 && (
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader>
            <CardTitle>Recent Donations</CardTitle>
            <CardDescription>Latest donation entries across the trust</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentDonations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {(
                        donation.donationItems[0]?.donorName ||
                        donation.collector?.name ||
                        "?"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">
                        {donation.donationItems[0]?.donorName ||
                          donation.collector?.name}
                        {donation.donationItems.length > 1 &&
                          ` + ${donation.donationItems.length - 1} more`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(donation.collectionDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-lg">
                      ₹{Number(donation.totalAmount).toFixed()}
                    </p>
                    <Badge variant={donation.isVerified ? "default" : "outline"} className={donation.isVerified ? "bg-primary/10 text-primary border-none" : "text-amber-600 border-amber-200"}>
                      {donation.isVerified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/donations" className="mt-6 block">
              <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5 text-primary font-semibold">
                View All Donations
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Role-specific Information */}
      {userRole === "MEMBER" && (
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              Member Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              Welcome to your personal dashboard. From here, you can track your donation collections, 
              view your cash ledger balance, and initiate cash handovers to the trust management.
            </p>
            <div className="flex gap-3">
              <Link href="/dashboard/donations">
                <Button className="bg-primary hover:bg-primary/90">
                  My Donations
                </Button>
              </Link>
              <Link href="/dashboard/cash-ledger">
                <Button variant="outline" className="bg-background border-primary/20 text-primary">
                  Cash Ledger
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
