"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Gem,
  Coins,
  Banknote,
} from "lucide-react";
import Link from "next/link";

interface DonationItem {
  id: string;
  donorName: string;
  amount: number;
  donationType: string;
  weight?: number;
  description?: string;
}

interface JewelleryAsset {
  id: string;
  jewelleryCode: string;
  jewelleryName: string;
  metalType: string;
  purity?: string;
  weight: number;
  quantity: number;
  estimatedValue: number;
  receivedDate?: string;
  donorName?: string;
}

interface DonationDetail {
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
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  jewelleryAssets?: JewelleryAsset[];
}

export default function DonationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const donationId = params.id as string;

  const [donation, setDonation] = useState<DonationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const fetchDonation = async () => {
      try {
        const response = await fetch(`/api/donations/${donationId}`);
        if (!response.ok) throw new Error("Failed to fetch donation");
        const data = await response.json();
        setDonation(data);
      } catch (err) {
        setError("Failed to load donation details");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDonation();
  }, [donationId]);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/donations/${donationId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verify: !donation?.isVerified }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to verify donation");
      setDonation(data);
    } catch (err: any) {
      setError(err.message || "Failed to verify donation");
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  // ---- Computed values for better display ----
  const cashItems = useMemo(
    () => donation?.donationItems.filter((i) => i.donationType === "Cash" || i.donationType === "UPI") ?? [],
    [donation]
  );
  const metalItems = useMemo(
    () => donation?.donationItems.filter((i) => i.donationType === "Gold" || i.donationType === "Silver") ?? [],
    [donation]
  );
  const cashTotal = useMemo(() => cashItems.reduce((sum, i) => sum + i.amount, 0), [cashItems]);

  const jewelleryAssets = donation?.jewelleryAssets || [];

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading donation details...</p>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/donations">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Donations
          </Button>
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/donations">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Donation Collection Details</h1>
        </div>
        {!donation.isVerified && (
          <Button onClick={handleVerify} disabled={isVerifying} className="bg-green-600 hover:bg-green-700">
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isVerifying ? "Verifying..." : "Verify Collection"}
          </Button>
        )}
      </div>

      {/* Status Banner */}
      {donation.isVerified && (
        <div className="flex gap-2 items-start bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Verified Collection</p>
            <p className="text-sm text-green-700">
              Verified on {donation.verifiedAt ? new Date(donation.verifiedAt).toLocaleDateString() : ""}
            </p>
          </div>
        </div>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Collection Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">Collector</p>
              <p className="font-medium text-slate-900">{donation.collector.name}</p>
              <p className="text-sm text-slate-500">{donation.collector.email}</p>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Collection Date</p>
              <p className="font-medium text-slate-900">
                {new Date(donation.collectionDate).toLocaleDateString()}
              </p>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Cash / UPI Total</p>
              <p className="text-3xl font-bold text-blue-600">
                ₹{cashTotal.toLocaleString()}
              </p>
              {metalItems.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  (+ {metalItems.reduce((sum, i) => sum + (i.weight || 0), 0)}g of precious metals)
                </p>
              )}
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Status</p>
              <span
                className={`text-sm font-medium px-3 py-1 rounded inline-block ${
                  donation.isVerified
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {donation.isVerified ? "Verified" : "Pending Verification"}
              </span>
            </div>
          </CardContent>
        </Card>

        {donation.remarks && (
          <Card>
            <CardHeader>
              <CardTitle>Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">{donation.remarks}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Donation Items – split into Cash & Metals for clarity */}
      {cashItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" /> Cash / UPI Donations
            </CardTitle>
            <CardDescription>{cashItems.length} cash/UPI item(s) recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Donor Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {cashItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{item.donorName}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">
                          {item.donationType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        ₹{item.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.description || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
              <div>
                <p className="text-sm text-slate-600 mb-1">Cash / UPI Total</p>
                <p className="text-2xl font-bold text-slate-900">₹{cashTotal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {metalItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-amber-600" /> Precious Metals (Gold / Silver)
            </CardTitle>
            <CardDescription>{metalItems.length} metal item(s) donated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Donor Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Metal</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Weight (g)</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Est. Value</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {metalItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{item.donorName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-800">
                          {item.donationType === "Gold" ? <Coins className="w-3 h-3" /> : <Gem className="w-3 h-3" />}
                          {item.donationType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{item.weight ?? "-"}g</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                        ₹{(item.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.description || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Weight</p>
                <p className="text-2xl font-bold text-slate-900">
                  {metalItems.reduce((sum, i) => sum + (i.weight || 0), 0)}g
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jewellery Assets (only after verification) */}
      {jewelleryAssets.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-amber-600" /> Linked Jewellery Assets
            </CardTitle>
            <CardDescription>Inventory records automatically created after verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Code</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Metal</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Purity</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Weight</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Est. Value</th>
                  </tr>
                </thead>
                <tbody>
                  {jewelleryAssets.map((asset) => (
                    <tr key={asset.id} className="border-b border-amber-100 hover:bg-amber-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{asset.jewelleryCode}</td>
                      <td className="py-3 px-4">{asset.jewelleryName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-800">
                          {asset.metalType === "Gold" ? <Coins className="w-3 h-3" /> : <Gem className="w-3 h-3" />}
                          {asset.metalType}
                        </span>
                      </td>
                      <td className="py-3 px-4">{asset.purity || "-"}</td>
                      <td className="py-3 px-4 text-right font-semibold">{asset.weight}g</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                        ₹{asset.estimatedValue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
