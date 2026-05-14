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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Eye,
  CheckCircle,
  Clock,
  CheckCircle2,
  Users,
  Wallet,
  CheckCheck,
  Trash2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DonationItem {
  id: string;
  donorName: string;
  amount: number;
  donationType: string;
  weight?: number;
  description?: string;
}

interface DonationCollection {
  id: string;
  collectionDate: string;
  totalAmount: number;
  isVerified: boolean;
  status: string;
  remarks?: string;
  donationItems: DonationItem[];
  collector: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function DonationsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "";

  const {
    data: donations,
    error,
    isLoading,
    mutate,
  } = useSWR<DonationCollection[]>("/api/donations", fetcher);

  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      const res = await fetch(`/api/donations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete donation");
      }
      toast.success("Donation deleted successfully");
      mutate();
    } catch (error: any) {
      toast.error(error.message || "Error deleting donation");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      setIsVerifying(id);
      const res = await fetch(`/api/donations/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verify: true }),
      });
      if (!res.ok) throw new Error("Failed to verify donation");
      toast.success("Donation verified successfully");
      mutate();
    } catch {
      toast.error("Error verifying donation");
    } finally {
      setIsVerifying(null);
    }
  };

  const pendingDonations = donations?.filter((d) => !d.isVerified) || [];
  const pendingByMember = pendingDonations.reduce(
    (acc, donation) => {
      const memberId = donation.collector.id;
      if (!acc[memberId]) {
        acc[memberId] = { member: donation.collector, totalAmount: 0, collections: [] };
      }
      acc[memberId].totalAmount += donation.totalAmount;
      acc[memberId].collections.push(donation);
      return acc;
    },
    {} as Record<
      string,
      {
        member: { id: string; name: string; email: string };
        totalAmount: number;
        collections: DonationCollection[];
      }
    >
  );
  const pendingMembersList = Object.values(pendingByMember);

  const handleVerifyMember = async (
    memberId: string,
    collections: DonationCollection[]
  ) => {
    try {
      setIsVerifying(memberId);
      await Promise.all(
        collections.map((c) =>
          fetch(`/api/donations/${c.id}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ verify: true }),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to verify");
          })
        )
      );
      toast.success(`Verified ${collections.length} collections successfully`);
      mutate();
    } catch {
      toast.error("Error verifying some collections");
    } finally {
      setIsVerifying(null);
    }
  };

  const filteredDonations = donations?.filter((d) => {
    if (filter === "VERIFIED") return d.isVerified;
    if (filter === "PENDING") return !d.isVerified;
    return true;
  });

  const totalCollection =
    filteredDonations?.reduce((sum, item) => sum + item.totalAmount, 0) || 0;

  // ── Column definitions ──────────────────────────────────────────────────────
  const columns: ColumnDef<DonationCollection>[] = [
    {
      id: "collector",
      accessorFn: (row) => row.collector.name,
      header: "Collector",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.collector.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.collector.email}</p>
        </div>
      ),
    },
    {
      id: "collectionDate",
      accessorKey: "collectionDate",
      header: "Date",
      cell: ({ getValue }) =>
        new Date(getValue<string>()).toLocaleDateString("en-IN"),
    },
    {
      id: "totalAmount",
      accessorKey: "totalAmount",
      header: "Total Amount",
      cell: ({ getValue }) => (
        <span className="font-semibold text-foreground">
          ₹{getValue<number>().toLocaleString()}
        </span>
      ),
    },
    {
      id: "items",
      header: "Donors",
      enableSorting: false,
      cell: ({ row }) => {
        const donation = row.original;
        return (
          <Dialog>
            <DialogTrigger asChild>
              <div className="space-y-1 min-w-[200px] cursor-pointer hover:bg-muted/50 p-1.5 rounded-md transition-colors border border-transparent hover:border-amber-200 dark:hover:border-amber-800 group">
                {donation.donationItems.slice(0, 2).map((item) => (
                  <div key={item.id} className="text-xs border rounded px-2 py-1 bg-muted">
                    <div className="font-medium">{item.donorName}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {item.donationType}
                        {item.weight ? ` – ${item.weight}g` : ""}
                      </span>
                      <span className="font-semibold text-amber-600">
                        ₹{item.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground group-hover:text-amber-600 font-medium pt-1 text-center">
                  {donation.donationItems.length > 2
                    ? `+${donation.donationItems.length - 2} more (Click to view)`
                    : "Click to view all details"}
                </p>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Donor Details</DialogTitle>
                <DialogDescription>
                  Collection from{" "}
                  {new Date(donation.collectionDate).toLocaleDateString()} by{" "}
                  {donation.collector.name}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4 mt-2">
                <div className="space-y-3">
                  {donation.donationItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start border p-3 rounded-lg bg-card shadow-sm"
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {item.donorName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium text-amber-700 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded mr-1.5">
                            {item.donationType}
                          </span>
                          {item.weight ? `${item.weight}g` : ""}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground italic mt-2 bg-muted/50 p-2 rounded border-l-2 border-amber-400">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-amber-600">
                        ₹{item.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-end pt-4 border-t mt-4">
                <p className="font-bold text-lg text-foreground">
                  Total:{" "}
                  <span className="text-amber-600">
                    ₹{donation.totalAmount.toLocaleString()}
                  </span>
                </p>
              </div>
            </DialogContent>
          </Dialog>
        );
      },
    },
    {
      id: "status",
      accessorKey: "isVerified",
      header: "Status",
      cell: ({ getValue }) => {
        const verified = getValue<boolean>();
        return (
          <span
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border w-fit ${
              verified
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
            }`}
          >
            {verified ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            {verified ? "Verified" : "Pending"}
          </span>
        );
      },
    },
    {
      id: "remarks",
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ getValue }) => (
        <p className="text-sm text-muted-foreground truncate max-w-[180px]">
          {getValue<string>() || "–"}
        </p>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const donation = row.original;
        return (
          <div className="flex justify-end gap-2">
            {["ADMIN", "ACCOUNTANT"].includes(userRole) && !donation.isVerified && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 h-8 w-8 p-0"
                    disabled={isVerifying === donation.id}
                    title="Verify Collection"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Verify Donation Collection</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to verify this collection? This action will
                      officially register the donations, update balances, and cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleVerify(donation.id)}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {isVerifying === donation.id ? "Verifying…" : "Verify Collection"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Link href={`/dashboard/donations/${donation.id}`}>
              <Button variant="outline" size="sm" className="h-8">
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            </Link>
            {!donation.isVerified &&
              (userRole === "ADMIN" ||
                donation.collector.id === session?.user?.id) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/20 hover:bg-destructive/10 h-8 w-8 p-0"
                      disabled={isDeleting === donation.id}
                      title="Delete Collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Donation Collection</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this collection? This action will
                        permanently remove the donation records and cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(donation.id)}
                        className="bg-destructive hover:bg-destructive/90 text-white"
                      >
                        {isDeleting === donation.id ? "Deleting…" : "Delete Collection"}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donation Collections</h1>
          <p className="text-muted-foreground mt-1">
            Manage and verify donation collections
          </p>
        </div>
        {userRole !== "ADMIN" && (
          <Link href="/dashboard/donations/new">
            <Button className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -z-10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
              ₹{totalCollection.toLocaleString()}
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
              Collected across {filteredDonations?.length || 0} entries
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-16 h-16 bg-muted rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Total Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {filteredDonations?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Verified Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {filteredDonations?.filter((d) => d.isVerified).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Pending Verifications */}
      {["ADMIN", "ACCOUNTANT"].includes(userRole) && pendingMembersList.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Member-wise Pending Verifications
            </CardTitle>
            <CardDescription className="text-amber-700/70 dark:text-amber-500/70">
              Verify all pending collections for a member at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingMembersList.map(({ member, totalAmount, collections }) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between border border-amber-100 dark:border-amber-900/50 rounded-lg p-4 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200 group"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {collections.length} collection(s) pending
                      </p>
                      <p className="font-bold text-amber-600 mt-1">
                        ₹{totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                          disabled={isVerifying === member.id}
                        >
                          {isVerifying === member.id ? (
                            "Verifying…"
                          ) : (
                            <>
                              <CheckCheck className="w-4 h-4 mr-2" />
                              Verify All
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Verify Collections for {member.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Review the {collections.length} collection(s) and all donors
                            before confirming. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <ScrollArea className="flex-1 pr-4 my-2 border rounded-md">
                          <div className="p-4 space-y-6">
                            {collections.map((col, idx) => (
                              <div key={col.id} className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b">
                                  <h4 className="font-semibold text-sm text-foreground">
                                    Collection {idx + 1}
                                  </h4>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(col.collectionDate).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="space-y-2 pl-2 border-l-2 border-amber-200">
                                  {col.donationItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex justify-between items-center text-sm"
                                    >
                                      <div>
                                        <span className="font-medium text-foreground">
                                          {item.donorName}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-2 px-1.5 py-0.5 rounded bg-muted">
                                          {item.donationType}{" "}
                                          {item.weight ? `(${item.weight}g)` : ""}
                                        </span>
                                      </div>
                                      <span className="font-semibold text-amber-600">
                                        ₹{item.amount.toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-end pt-1">
                                  <span className="text-sm font-medium">
                                    Subtotal:{" "}
                                    <span className="text-foreground">
                                      ₹{col.totalAmount.toLocaleString()}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <AlertDialogFooter className="items-center mt-2 border-t pt-4 sm:justify-between flex-row">
                          <div className="text-lg font-bold text-foreground mb-2 sm:mb-0">
                            Total to Verify:{" "}
                            <span className="text-amber-600">
                              ₹{totalAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleVerifyMember(member.id, collections)}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              Verify All
                            </AlertDialogAction>
                          </div>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Donation Collections</CardTitle>
          <CardDescription>All donation collection entries</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">
              Loading donations…
            </div>
          ) : error ? (
            <div className="py-10 text-center text-destructive">
              Error loading donations
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredDonations ?? []}
              searchPlaceholder="Search collector, remarks…"
              toolbarRight={
                <div className="flex flex-wrap gap-2">
                  {["ALL", "VERIFIED", "PENDING"].map((f) => (
                    <Button
                      key={f}
                      variant={filter === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter(f)}
                      className={
                        filter === f ? "bg-amber-600 hover:bg-amber-700 text-white h-9" : "h-9"
                      }
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              }
              emptyState={
                <div className="py-8">
                  <p className="text-muted-foreground">No donation collections found</p>
                  {userRole !== "ADMIN" && (
                    <Link href="/dashboard/donations/new">
                      <Button className="mt-4 bg-amber-600 hover:bg-amber-700 text-white">
                        Create First Collection
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
