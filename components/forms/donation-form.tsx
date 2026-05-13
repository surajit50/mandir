"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Coins, Gem, Banknote, Smartphone } from "lucide-react";
import { toast } from "sonner";

export function DonationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [collectionDate, setCollectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState("");

  // Single item state – no array
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [donationType, setDonationType] = useState<"Cash" | "UPI" | "Gold" | "Silver">("Cash");
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [purity, setPurity] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");

  const isPrecious = donationType === "Gold" || donationType === "Silver";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collectionDate) {
      toast.error("Collection date is required");
      return;
    }

    // Validation: donor name required, weight required for metals, amount required for cash/upi
    if (!donorName.trim()) {
      toast.error("Donor name is required");
      return;
    }

    if (isPrecious) {
      if (!weight || weight <= 0) {
        toast.error("Weight is required for gold/silver donations");
        return;
      }
    } else {
      if (amount <= 0) {
        toast.error("Amount is required for cash/UPI donations");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionDate: new Date(collectionDate).toISOString(),
          donationItems: [
            {
              donorName: donorName.trim(),
              amount: isPrecious ? amount || 0 : amount,
              donationType,
              weight: isPrecious ? weight : undefined,
              purity: purity || undefined,
              description: description.trim() || undefined,
            },
          ],
          remarks: remarks.trim() || undefined,
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          New Donation Collection
        </h1>
        <p className="text-slate-500">Record a single donation entry</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Collection Details */}
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

        {/* Single Donation Item */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="w-5 h-5 text-emerald-600" />
              Donation Entry
            </CardTitle>
            <CardDescription>Donor and donation details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Donor & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="donorName" className="text-xs font-medium text-slate-500">
                  Donor Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="donorName"
                  placeholder="e.g. Ramesh Kumar"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="amount" className="text-xs font-medium text-slate-500">
                  Amount (₹)
                  {isPrecious ? (
                    <span className="text-slate-400 ml-1">(optional)</span>
                  ) : (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount || ""}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  required={!isPrecious}
                />
              </div>
            </div>

            {/* Row 2: Donation Type Segmented Control */}
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
                    aria-checked={donationType === type}
                    onClick={() => {
                      setDonationType(type);
                      // Reset weight/purity if switching away from metals
                      if (type !== "Gold" && type !== "Silver") {
                        setWeight(undefined);
                        setPurity(undefined);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      donationType === type
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

            {/* Row 3: Weight & Purity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="weight" className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  Weight (grams)
                  {isPrecious && <span className="text-red-500">*</span>}
                  {!isPrecious && <span className="text-slate-400">(not applicable)</span>}
                </label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="grams"
                  value={weight || ""}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || undefined)}
                  disabled={!isPrecious}
                  className={!isPrecious ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}
                  required={isPrecious}
                />
              </div>

              {isPrecious ? (
                <div className="space-y-1.5">
                  <label htmlFor="purity" className="text-xs font-medium text-slate-500">
                    Purity <span className="text-slate-400">(optional)</span>
                  </label>
                  <select
                    id="purity"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={purity || ""}
                    onChange={(e) => setPurity(e.target.value || undefined)}
                  >
                    <option value="">Select purity</option>
                    {donationType === "Gold" ? (
                      <>
                        <option value="22K">22K</option>
                        <option value="24K">24K</option>
                        <option value="18K">18K</option>
                      </>
                    ) : (
                      <>
                        <option value="925">925 (Sterling)</option>
                        <option value="999">999 (Fine)</option>
                        <option value="800">800</option>
                      </>
                    )}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="description" className="text-xs font-medium text-slate-500">
                    Description
                  </label>
                  <Input
                    id="description"
                    placeholder="e.g. Special occasion"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Row 4: Jewellery Name / Description (metals only) */}
            {isPrecious && (
              <div className="space-y-1.5">
                <label htmlFor="jewelleryDesc" className="text-xs font-medium text-slate-500">
                  Jewellery Name / Description{" "}
                  <span className="text-slate-400">(optional)</span>
                </label>
                <Input
                  id="jewelleryDesc"
                  placeholder="e.g. Ring, chain, necklace"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg transition-all duration-300 hover:shadow-xl">
          <CardContent className="flex items-center justify-between py-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Total Amount</p>
              <p className="text-4xl font-bold text-blue-700">
                ₹{(amount || 0).toLocaleString()}
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="rounded-full bg-blue-100 p-3">
                <Coins className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
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
