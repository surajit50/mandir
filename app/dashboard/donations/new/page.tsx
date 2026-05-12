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
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface DonationItem {
  id: string;
  donorName: string;
  amount: number;
  donationType: string;
  weight?: number;
  description: string;
}

export default function NewDonationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [collectionDate, setCollectionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
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
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!collectionDate) {
      toast.error("Collection date is required");
      return;
    }

    const validItems = items.filter(
      (item) => item.donorName && item.amount > 0,
    );
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          New Donation Collection
        </h1>
        <p className="text-slate-600 mt-2">
          Create and record a new donation collection
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Details</CardTitle>
            <CardDescription>
              Basic information about the collection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="date"
                className="text-sm font-medium text-slate-700 block mb-2"
              >
                Collection Date
              </label>
              <Input
                id="date"
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="remarks"
                className="text-sm font-medium text-slate-700 block mb-2"
              >
                Remarks (Optional)
              </label>
              <textarea
                id="remarks"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any additional notes..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Donation Items */}
        <Card>
          <CardHeader>
            <CardTitle>Donation Items</CardTitle>
            <CardDescription>Add individual donation entries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="space-y-3 pb-4 border-b border-slate-200 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-700">Item {index + 1}</p>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Donor Name"
                    value={item.donorName}
                    onChange={(e) =>
                      handleItemChange(item.id, "donorName", e.target.value)
                    }
                    required
                  />
                  <Input
                    placeholder="Amount"
                    type="number"
                    value={item.amount}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        "amount",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">
                      Donation Type
                    </label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={item.donationType}
                      onChange={(e) =>
                        handleItemChange(
                          item.id,
                          "donationType",
                          e.target.value,
                        )
                      }
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                    </select>
                  </div>
                  {item.donationType === "Gold" ||
                  item.donationType === "Silver" ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">
                        Weight (Grams)
                      </label>
                      <Input
                        placeholder="Weight in grams"
                        type="number"
                        value={item.weight || ""}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "weight",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">
                        Description
                      </label>
                      <Input
                        placeholder="Description (optional)"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "description",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  )}
                </div>
                {(item.donationType === "Gold" ||
                  item.donationType === "Silver") && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">
                      Description
                    </label>
                    <Input
                      placeholder="Description (optional)"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(item.id, "description", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>
            ))}

            <Button
              type="button"
              onClick={handleAddItem}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <p className="text-lg font-semibold text-slate-900">
                Total Amount:
              </p>
              <p className="text-3xl font-bold text-blue-600">
                ₹{totalAmount.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
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
