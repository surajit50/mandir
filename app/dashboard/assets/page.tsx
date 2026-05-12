"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Plus, Package, MapPin } from "lucide-react";
import { toast } from "sonner";

interface MandirAsset {
  id: string;
  assetCode: string;
  assetName: string;
  category: string;
  description: string | null;
  purchaseDate: string | null;
  purchaseValue: number;
  location: string | null;
  condition: string | null;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<MandirAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/assets");

      if (!res.ok) {
        if (res.status === 404) {
          setAssets([]);
          return;
        }
        throw new Error("Failed to fetch assets");
      }

      const data = await res.json();
      setAssets(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error fetching assets";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = assets.reduce(
    (sum, asset) => sum + asset.purchaseValue,
    0,
  );
  const categories = Array.from(new Set(assets.map((a) => a.category)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Mandir Asset Register
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage temple fixed assets
          </p>
        </div>
        <Link href="/dashboard/assets/new">
          <Button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" />
            New Asset
          </Button>
        </Link>
      </div>

      {!loading && assets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assets.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Book Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalValue.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fixed Asset Register</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading asset register...
            </div>
          ) : assets.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">
                No assets found in the register
              </p>
              <Link href="/dashboard/assets/new" className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  Add your first asset
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Code
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Asset Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Condition
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      Purchase Date
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      Book Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr
                      key={asset.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {asset.assetCode}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/assets/${asset.id}`}
                          className="font-medium text-emerald-600 hover:underline"
                        >
                          {asset.assetName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                          {asset.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {asset.location || "N/A"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            asset.condition === "Good"
                              ? "bg-emerald-100 text-emerald-800"
                              : asset.condition === "Needs Repair"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {asset.condition || "Unknown"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {asset.purchaseDate
                          ? new Date(asset.purchaseDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {asset.purchaseValue.toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
