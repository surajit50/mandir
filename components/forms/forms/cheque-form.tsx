"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
}

export function ChequeForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"SINGLE" | "BOOK">("SINGLE");

  const [formData, setFormData] = useState({
    chequeNumber: "",
    chequeBookNumber: "",
    chequeDate: new Date().toISOString().split("T")[0],
    amount: "",
    drawee: "",
    payee: "",
    accountId: "",
    status: "ISSUED",
    remarks: "",
  });

  const [bookData, setBookData] = useState({
    accountId: "",
    chequeBookNumber: "",
    startChequeNumber: "",
    leafCount: "20",
    chequeDate: new Date().toISOString().split("T")[0],
  });

  const { data: accounts } = useSWR<BankAccount[]>(
    "/api/bank-accounts",
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBookChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setBookData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "BOOK") {
      if (!bookData.accountId) {
        setError("Account is required");
        return;
      }

      if (!bookData.startChequeNumber) {
        setError("Start cheque number is required");
        return;
      }

      if (!/^\d+$/.test(bookData.startChequeNumber)) {
        setError("Start cheque number must be numeric");
        return;
      }

      const leafCount = parseInt(bookData.leafCount, 10);
      if (Number.isNaN(leafCount) || leafCount < 20) {
        setError("Cheque book must have at least 20 leaves");
        return;
      }
    }

    if (mode === "SINGLE" && !formData.chequeNumber) {
      setError("Cheque number is required");
      return;
    }

    if (mode === "SINGLE" && !formData.chequeDate) {
      setError("Cheque date is required");
      return;
    }

    if (mode === "SINGLE" && (!formData.amount || parseFloat(formData.amount) <= 0)) {
      setError("Amount must be greater than 0");
      return;
    }

    if (mode === "SINGLE" && !formData.drawee) {
      setError("Drawee is required");
      return;
    }

    if (mode === "SINGLE" && !formData.payee) {
      setError("Payee is required");
      return;
    }

    if (mode === "SINGLE" && !formData.accountId) {
      setError("Account is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cheques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "BOOK"
            ? {
                mode: "BOOK",
                accountId: bookData.accountId,
                chequeBookNumber: bookData.chequeBookNumber,
                startChequeNumber: bookData.startChequeNumber,
                leafCount: parseInt(bookData.leafCount, 10),
                chequeDate: new Date(bookData.chequeDate).toISOString(),
              }
            : {
                chequeNumber: formData.chequeNumber,
                chequeBookNumber: formData.chequeBookNumber,
                chequeDate: new Date(formData.chequeDate).toISOString(),
                amount: parseFloat(formData.amount),
                payeeName: formData.payee,
                accountId: formData.accountId,
                status: formData.status,
              },
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create cheque");
        return;
      }

      if (mode === "BOOK") {
        router.push("/dashboard/cheques/register");
      } else {
        router.push(`/dashboard/cheques/${data.id}`);
      }
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
        <h1 className="text-3xl font-bold text-slate-900">Register New Cheque</h1>
        <p className="text-slate-600 mt-2">
          Add a single cheque or register a full cheque book (20+ leaves)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "SINGLE" ? "default" : "outline"}
              onClick={() => setMode("SINGLE")}
            >
              Single Cheque
            </Button>
            <Button
              type="button"
              variant={mode === "BOOK" ? "default" : "outline"}
              onClick={() => setMode("BOOK")}
            >
              Cheque Book (20+)
            </Button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {mode === "SINGLE" ? (
          <Card>
            <CardHeader>
              <CardTitle>Cheque Details</CardTitle>
              <CardDescription>Enter the cheque information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="chequeNumber" className="text-sm font-medium text-slate-700 block mb-2">
                  Cheque Number
                </label>
                <Input
                  id="chequeNumber"
                  name="chequeNumber"
                  placeholder="000123456"
                  value={formData.chequeNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="chequeBookNumber" className="text-sm font-medium text-slate-700 block mb-2">
                  Cheque Book Number (Optional)
                </label>
                <Input
                  id="chequeBookNumber"
                  name="chequeBookNumber"
                  placeholder="e.g. CB-001"
                  value={formData.chequeBookNumber}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="chequeDate" className="text-sm font-medium text-slate-700 block mb-2">
                  Cheque Date
                </label>
                <Input
                  id="chequeDate"
                  name="chequeDate"
                  type="date"
                  value={formData.chequeDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="amount" className="text-sm font-medium text-slate-700 block mb-2">
                Amount
              </label>
              <Input
                id="amount"
                name="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label htmlFor="payee" className="text-sm font-medium text-slate-700 block mb-2">
                Payee
              </label>
              <Input
                id="payee"
                name="payee"
                placeholder="Payee name"
                value={formData.payee}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="accountId" className="text-sm font-medium text-slate-700 block mb-2">
                Bank Account
              </label>
              <select
                id="accountId"
                name="accountId"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.accountId}
                onChange={handleChange}
                required
              >
                <option value="">Select an account</option>
                {accounts?.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} - {account.accountNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="text-sm font-medium text-slate-700 block mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="ISSUED">Issued</option>
                <option value="DEPOSITED">Deposited</option>
                <option value="CLEARED">Cleared</option>
                <option value="BOUNCED">Bounced</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label htmlFor="remarks" className="text-sm font-medium text-slate-700 block mb-2">
                Remarks (Optional)
              </label>
              <textarea
                id="remarks"
                name="remarks"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Add any notes..."
              />
            </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Cheque Book Details</CardTitle>
              <CardDescription>
                Register a sequence of cheque leaves for bank account usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="accountId" className="text-sm font-medium text-slate-700 block mb-2">
                  Bank Account
                </label>
                <select
                  id="accountId"
                  name="accountId"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={bookData.accountId}
                  onChange={handleBookChange}
                  required
                >
                  <option value="">Select an account</option>
                  {accounts?.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="chequeBookNumberBook" className="text-sm font-medium text-slate-700 block mb-2">
                    Cheque Book Number (Optional)
                  </label>
                  <Input
                    id="chequeBookNumberBook"
                    name="chequeBookNumber"
                    placeholder="e.g. CB-001"
                    value={bookData.chequeBookNumber}
                    onChange={handleBookChange}
                  />
                </div>
                <div>
                  <label htmlFor="startChequeNumber" className="text-sm font-medium text-slate-700 block mb-2">
                    Start Cheque Number
                  </label>
                  <Input
                    id="startChequeNumber"
                    name="startChequeNumber"
                    placeholder="000001"
                    value={bookData.startChequeNumber}
                    onChange={handleBookChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="leafCount" className="text-sm font-medium text-slate-700 block mb-2">
                    Number of Leaves
                  </label>
                  <Input
                    id="leafCount"
                    name="leafCount"
                    type="number"
                    min="20"
                    value={bookData.leafCount}
                    onChange={handleBookChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="bookChequeDate" className="text-sm font-medium text-slate-700 block mb-2">
                    Issue Date
                  </label>
                  <Input
                    id="bookChequeDate"
                    name="chequeDate"
                    type="date"
                    value={bookData.chequeDate}
                    onChange={handleBookChange}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
            {isSubmitting
              ? "Creating..."
              : mode === "BOOK"
                ? "Register Cheque Book"
                : "Register Cheque"}
          </Button>
        </div>
      </form>
    </div>
  );
}
