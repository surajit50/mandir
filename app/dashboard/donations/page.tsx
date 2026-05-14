"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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
import { Plus, Eye, CheckCircle, Clock, CheckCircle2 } from "lucide-react";
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

  const handleVerify = async (id: string) => {
    try {
      setIsVerifying(id);
      const res = await fetch(`/api/donations/${id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verify: true }),
      });
      if (!res.ok) throw new Error("Failed to verify donation");
      toast.success("Donation verified successfully");
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Error verifying donation");
    } finally {
      setIsVerifying(null);
    }
  };

  const [filter, setFilter] = useState("ALL");

  const filteredDonations = donations?.filter((d) => {
    if (filter === "VERIFIED") return d.isVerified;
    if (filter === "PENDING") return !d.isVerified;
    return true;
  });

  const totalCollection =
    filteredDonations?.reduce((sum, item) => sum + item.totalAmount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Donation Collections
          </h1>
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {filteredDonations?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              ₹{totalCollection.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Verified Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {filteredDonations?.filter((d) => d.isVerified).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "VERIFIED", "PENDING"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className={filter === f ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Loading donations...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Error loading donations</p>
          </CardContent>
        </Card>
      ) : filteredDonations && filteredDonations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Donation Collections</CardTitle>
            <CardDescription>All donation collection entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collector</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {donation.collector.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {donation.collector.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(donation.collectionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        ₹{donation.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[220px]">
                          {donation.donationItems.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="text-xs border rounded px-2 py-1 bg-muted"
                            >
                              <div className="font-medium">{item.donorName}</div>
                              <div className="text-muted-foreground">
                                {item.donationType}
                                {item.weight ? ` - ${item.weight}g` : ""}
                              </div>
                              <div className="font-semibold text-amber-600">
                                ₹{item.amount.toLocaleString()}
                              </div>
                            </div>
                          ))}
                          {donation.donationItems.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{donation.donationItems.length - 3} more items
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {donation.isVerified ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              donation.isVerified
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {donation.isVerified ? "Verified" : "Pending"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate">
                          {donation.remarks || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {["ADMIN", "ACCOUNTANT"].includes(userRole) &&
                            !donation.isVerified && (
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
                                      Are you sure you want to verify this collection? This action will officially register the donations, update balances, and cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleVerify(donation.id)} className="bg-amber-600 hover:bg-amber-700 text-white">
                                      {isVerifying === donation.id ? "Verifying..." : "Verify Collection"}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No donation collections found</p>
            {userRole !== "ADMIN" && (
              <Link href="/dashboard/donations/new">
                <Button className="mt-4 bg-amber-600 hover:bg-amber-700 text-white">
                  Create First Collection
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
