"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, Plus, Trash2, Coins, Gem, Banknote, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface DonationItem {
  id: string;
  donorName: string;
  amount: number;
  donationType: "Cash" | "UPI" | "Gold" | "Silver";
  weight?: number;
  description: string;
}

export default function NewDonationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<DonationItem[]>([
    {
      id: "1",
      donorName: "",
      amount: 0,
      donationType: "Cash",
      description: "",
    },
  ]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        donorName: "",
        amount: 0,
        donationType: "Cash",
        description: "",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionDate) {
      toast.error("Collection date is required");
      return;
    }
    const validItems = items.filter((item) => item.donorName && item.amount > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one donation item");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionDate: new Date(collectionDate).toISOString(),
          donationItems: validItems.map(({ id, ...item }) => item),
          remarks,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to create donation collection");
        return;
      }
      toast.success("Donation collection created successfully");
      router.push(`/dashboard/donations/${data.id}`);
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const itemCount = items.filter((i) => i.donorName && i.amount > 0).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          New Donation Collection
        </h1>
        <p className="text-slate-500">Record a new collection with multiple donors</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="w-5 h-5 text-blue-600" />
              Collection Details
            </CardTitle>
            <CardDescription>Date and optional remarks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium text-slate-700">
                Collection Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="date"
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label htmlFor="remarks" className="text-sm font-medium text-slate-700">
                Remarks
              </label>
              <textarea
                id="remarks"
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes about this collection..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Donation Items */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="w-5 h-5 text-emerald-600" />
                Donation Items
              </CardTitle>
              <CardDescription>Add one entry per donor / instrument</CardDescription>
            </div>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => {
              const isPrecious = item.donationType === "Gold" || item.donationType === "Silver";
              return (
                <div
                  key={item.id}
                  className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  {/* Header badge */}
                  <div className="absolute -top-3 left-4 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 px-3 py-1 text-xs font-semibold text-white shadow">
                    <span>Item {index + 1}</span>
                  </div>

                  {/* Remove button */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute -top-3 right-4 flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition"
                      aria-label="Remove this item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="mt-2 space-y-4">
                    {/* Row 1: Donor & Amount */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">
                          Donor Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Ramesh Kumar"
                          value={item.donorName}
                          onChange={(e) => handleItemChange(item.id, "donorName", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">
                          Amount (₹) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={item.amount || ""}
                          onChange={(e) =>
                            handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Row 2: Donation Type as Segmented Control */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">
                        Donation Type
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup">
                        {(["Cash", "UPI", "Gold", "Silver"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={item.donationType === type}
                            onClick={() => handleItemChange(item.id, "donationType", type)}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                              item.donationType === type
                                ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {type === "Cash" && <Banknote className="w-4 h-4" />}
                            {type === "UPI" && <Smartphone className="w-4 h-4" />}
                            {type === "Gold" && <Coins className="w-4 h-4" />}
                            {type === "Silver" && <Gem className="w-4 h-4" />}
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 3: Weight & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          Weight (grams)
                          {isPrecious && <span className="text-red-500">*</span>}
                          {!isPrecious && <span className="text-slate-400">(auto for cash)</span>}
                        </label>
                        <Input
                          type="number"
                          placeholder="grams"
                          value={item.weight || ""}
                          onChange={(e) =>
                            handleItemChange(item.id, "weight", parseFloat(e.target.value) || 0)
                          }
                          disabled={!isPrecious}
                          className={!isPrecious ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}
                          required={isPrecious}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Description</label>
                        <Input
                          placeholder="e.g. Ring, necklace, special occasion"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-4 text-sm font-medium text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Another Donor
            </button>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg transition-all duration-300 hover:shadow-xl">
          <CardContent className="flex items-center justify-between py-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Total Collection</p>
              <p className="text-4xl font-bold text-blue-700">
                ₹{totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">
                {itemCount} valid {itemCount === 1 ? "entry" : "entries"}
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="rounded-full bg-blue-100 p-3">
                <Coins className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 transition-all hover:shadow-xl hover:shadow-blue-200/70"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating..." : "Create Collection"}
          </Button>
        </div>
      </form>
    </div>
  );
}
