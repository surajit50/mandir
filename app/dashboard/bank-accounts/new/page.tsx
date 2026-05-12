"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

export default function NewBankAccountPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    accountNumber: "",
    bankName: "",
    accountHolder: "",
    accountType: "Savings",
    openingBalance: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.accountNumber) {
      setError("Account number is required");
      return;
    }

    if (!formData.bankName) {
      setError("Bank name is required");
      return;
    }

    if (!formData.accountHolder) {
      setError("Account holder is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: formData.accountNumber,
          bankName: formData.bankName,
          accountHolder: formData.accountHolder,
          accountType: formData.accountType,
          openingBalance: parseFloat(formData.openingBalance) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create bank account");
        return;
      }

      router.push(`/dashboard/bank-accounts/${data.id}`);
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Add New Bank Account</h1>
        <p className="text-slate-600 mt-2">Register a new bank account for the temple</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Enter bank account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="bankName" className="text-sm font-medium text-slate-700 block mb-2">
                Bank Name
              </label>
              <Input
                id="bankName"
                name="bankName"
                placeholder="State Bank of India"
                value={formData.bankName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="accountNumber" className="text-sm font-medium text-slate-700 block mb-2">
                Account Number
              </label>
              <Input
                id="accountNumber"
                name="accountNumber"
                placeholder="1234567890123456"
                value={formData.accountNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="accountHolder" className="text-sm font-medium text-slate-700 block mb-2">
                  Account Holder
                </label>
                <Input
                  id="accountHolder"
                  name="accountHolder"
                  placeholder="Temple Name"
                  value={formData.accountHolder}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="accountType" className="text-sm font-medium text-slate-700 block mb-2">
                  Account Type
                </label>
                <select
                  id="accountType"
                  name="accountType"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.accountType}
                  onChange={handleChange}
                >
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Operating">Operating</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="openingBalance" className="text-sm font-medium text-slate-700 block mb-2">
                Opening Balance (Optional)
              </label>
              <Input
                id="openingBalance"
                name="openingBalance"
                type="number"
                placeholder="0.00"
                value={formData.openingBalance}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
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
            {isSubmitting ? "Creating..." : "Create Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}
