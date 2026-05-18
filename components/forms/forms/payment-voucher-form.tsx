"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";

// ============================================
// TYPES (matching backend responses)
// ============================================

interface Payee {
  id: string;
  name: string;
  email?: string | null;
  payeeType?: string;
}

interface Cheque {
  id: string;
  chequeNumber: string;
  amount: number;
  payeeName: string; // computed by API from linked voucher
  status: string;
  account?: {
    id: string;
    bankName: string;
    accountNumber: string;
  };
}

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  accountHolder: string;
  currentBalance: number;
  pendingPayments: number;
  potentialBalance: number;
}

interface CashBalance {
  balance: number;
  pendingPayments?: number;
}

// ============================================
// CONSTANTS
// ============================================

const RECEIPT_CATEGORIES = [
  { value: "DONATION", label: "Donation" },
  { value: "JEWELLERY_DONATION", label: "Jewellery Donation (Gold/Silver)" },
  { value: "BANK_INTEREST", label: "Bank Interest" },
  { value: "DIRECT_DEPOSIT", label: "Direct Deposit" },
  { value: "CHEQUE_RECEIVED", label: "Cheque Received" },
  { value: "BANK_TRANSFER_RECEIVED", label: "Bank Transfer Received" },
  { value: "ONLINE_RECEIVED", label: "Online Payment Received" },
  { value: "RENT_INCOME", label: "Rent Income" },
  { value: "OTHER_INCOME", label: "Other Income" },
];

const PAYMENT_CATEGORIES = [
  { value: "SALARY_WAGES", label: "Salary / Wages" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "BANK_CHARGES", label: "Bank Charges" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "DONATION_CHARITY", label: "Donation / Charity" },
  { value: "FESTIVAL_EXPENSES", label: "Festival Expenses" },
  { value: "OTHER_EXPENSE", label: "Other Expense" },
];

const INSTANT_POST_CATEGORIES = [
  "DIRECT_DEPOSIT",
  "BANK_INTEREST",
  "BANK_TRANSFER_RECEIVED",
  "ONLINE_RECEIVED",
];

const PAYEE_TYPES = [
  { value: "OTHER", label: "Other / General" },
  { value: "PRIEST", label: "Priest (पूजा/Rituals)" },
  { value: "PUJARI", label: "Pujari (Temple Priest)" },
  { value: "ARCHAKA", label: "Archaka (Sanskrit Priest)" },
  { value: "SEVAK", label: "Sevak (Volunteer/Helper)" },
  { value: "TRUSTEE", label: "Trustee (Trust Member)" },
  { value: "MANAGER", label: "Temple Manager" },
  { value: "DEVOTEE", label: "Devotee (Worshipper)" },
  { value: "LABOUR", label: "Working Labour" },
  { value: "VENDOR", label: "Vendor / Supplier" },
  { value: "STAFF", label: "Temple Staff" },
  { value: "MEMBER", label: "Temple Member" },
];

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
};

// ============================================
// MAIN COMPONENT
// ============================================

export function PaymentVoucherForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [voucherType, setVoucherType] = useState<"PAYMENT" | "RECEIPT">(
    "PAYMENT"
  );
  const [payeeId, setPayeeId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [payeeEmail, setPayeeEmail] = useState("");
  const [payeeType, setPayeeType] = useState("OTHER");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [chequeId, setChequeId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [receivedChequeBank, setReceivedChequeBank] = useState("");
  // Jewellery fields
  const [metalType, setMetalType] = useState("Gold");
  const [weight, setWeight] = useState("");
  const [purity, setPurity] = useState("");

  // Fetch data
  const { data: payees, error: payeesError } = useSWR<Payee[]>(
    "/api/payees",
    fetcher
  );
  const { data: cheques, error: chequesError } = useSWR<Cheque[]>(
    "/api/cheques?includeUnassigned=true",
    fetcher
  );
  const { data: bankAccounts, error: bankAccountsError } = useSWR<
    BankAccount[]
  >("/api/bank-accounts", fetcher);
  const { data: cashBalanceData, error: cashError } = useSWR<CashBalance>(
    "/api/cash-book/balance",
    fetcher
  );

  // Loading / error states
  const isLoadingData = !payees || !cheques || !bankAccounts || !cashBalanceData;
  if (payeesError || chequesError || bankAccountsError || cashError) {
    toast.error("Failed to load required data. Please refresh the page.");
  }

  // Derived values
  const isJewelleryDonation =
    voucherType === "RECEIPT" && category === "JEWELLERY_DONATION";
  const showPaymentMethod = !isJewelleryDonation;
  const requiresBankAccount =
    voucherType === "RECEIPT" && INSTANT_POST_CATEGORIES.includes(category);

  // Auto payment method based on category
  const autoPaymentMethod = (() => {
    if (voucherType !== "RECEIPT") return null;
    if (category === "JEWELLERY_DONATION") return "CASH";
    if (category === "BANK_INTEREST") return "BANK_TRANSFER";
    if (category === "DIRECT_DEPOSIT") return "BANK_TRANSFER";
    if (category === "BANK_TRANSFER_RECEIVED") return "BANK_TRANSFER";
    if (category === "ONLINE_RECEIVED") return "ONLINE";
    if (category === "CHEQUE_RECEIVED") return "CHEQUE";
    return null;
  })();

  // Available cheques (issued only)
  const availableCheques =
    cheques
      ?.filter((cheque) => cheque.status === "ISSUED")
      .sort((a, b) => {
        const numA = parseInt(a.chequeNumber, 10);
        const numB = parseInt(b.chequeNumber, 10);
        if (isNaN(numA) || isNaN(numB)) {
          return a.chequeNumber.localeCompare(b.chequeNumber);
        }
        return numA - numB;
      }) ?? [];

  // Balance display for PAYMENT vouchers
  const currentBalance = (() => {
    if (voucherType === "RECEIPT") return null;
    if (paymentMethod === "CASH") return cashBalanceData?.balance ?? null;
    if (bankAccountId) {
      const acc = bankAccounts?.find((a) => a.id === bankAccountId);
      return acc?.currentBalance ?? null;
    }
    return null;
  })();

  const pendingPayments = (() => {
    if (voucherType === "RECEIPT") return 0;
    if (paymentMethod === "CASH")
      return (cashBalanceData as any)?.pendingPayments ?? 0;
    if (bankAccountId) {
      const acc = bankAccounts?.find((a) => a.id === bankAccountId);
      return acc?.pendingPayments ?? 0;
    }
    return 0;
  })();

  const potentialBalance =
    currentBalance !== null ? currentBalance - pendingPayments : null;

  const amountNumber = parseFloat(amount || "0");
  const exceedsBalance =
    voucherType === "PAYMENT" &&
    currentBalance !== null &&
    amountNumber > currentBalance;
  const exceedsPotential =
    voucherType === "PAYMENT" &&
    potentialBalance !== null &&
    amountNumber > potentialBalance;

  // Effects: auto-set payment method when category changes
  useEffect(() => {
    if (autoPaymentMethod) {
      setPaymentMethod(autoPaymentMethod);
    }
  }, [autoPaymentMethod]);

  // Reset fields when category/voucher type changes
  useEffect(() => {
    if (isJewelleryDonation) {
      setBankAccountId("");
      setChequeId("");
      setReferenceNumber("");
      setReferenceDate("");
      setReceivedChequeBank("");
      setPaymentMethod("CASH");
    }
    if (voucherType === "RECEIPT" && category === "CHEQUE_RECEIVED") {
      setBankAccountId("");
    }
  }, [isJewelleryDonation, category, voucherType]);

  // Reset cheque selection when method changes
  useEffect(() => {
    if (!(voucherType === "PAYMENT" && paymentMethod === "CHEQUE")) {
      setChequeId("");
    }
    if (!(voucherType === "RECEIPT" && paymentMethod === "CHEQUE")) {
      setReferenceNumber("");
      setReferenceDate("");
      setReceivedChequeBank("");
    }
    if (paymentMethod === "CASH" && !requiresBankAccount) {
      setBankAccountId("");
    }
  }, [voucherType, paymentMethod, requiresBankAccount]);

  // When a registered cheque is selected, auto‑fill amount and payee
  const handleChequeSelect = (selectedId: string) => {
    setChequeId(selectedId);
    const selected = availableCheques.find((c) => c.id === selectedId);
    if (selected) {
      setAmount(selected.amount.toString());
      setPayeeName(selected.payeeName); // ← computed payeeName from API
      if (selected.account?.id) {
        setBankAccountId(selected.account.id);
      }
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!voucherDate) {
      toast.error("Voucher date is required");
      return;
    }
    if (!payeeId && !payeeName.trim()) {
      toast.error("Payee is required");
      return;
    }
    if (amountNumber <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (requiresBankAccount && !bankAccountId) {
      toast.error("Bank account is required for this receipt type");
      return;
    }
    if (voucherType === "PAYMENT" && paymentMethod === "CHEQUE" && !chequeId) {
      toast.error("Please select a registered cheque");
      return;
    }
    if (
      voucherType === "RECEIPT" &&
      paymentMethod === "CHEQUE" &&
      !referenceNumber.trim()
    ) {
      toast.error("Cheque number is required for received cheques");
      return;
    }

    setIsSubmitting(true);

    // Build final description
    const selectedBank = bankAccounts?.find((a) => a.id === bankAccountId);
    let finalDescription = description;
    if (paymentMethod !== "CASH" && selectedBank) {
      finalDescription = `${description} [${selectedBank.bankName} — ${selectedBank.accountNumber}]`;
    }
    if (
      voucherType === "RECEIPT" &&
      paymentMethod === "CHEQUE" &&
      referenceNumber
    ) {
      finalDescription = `Cheque #${referenceNumber}${
        receivedChequeBank ? ` from ${receivedChequeBank}` : ""
      } — ${finalDescription}`;
    }
    if (referenceNumber && paymentMethod !== "CHEQUE") {
      finalDescription = `Ref: ${referenceNumber} — ${finalDescription}`;
    }

    try {
      const response = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherDate: new Date(voucherDate).toISOString(),
          voucherType,
          payeeId: payeeId || undefined,
          payeeName: payeeName.trim() || undefined,
          payeeEmail: payeeEmail.trim() || undefined,
          payeeType,
          amount: amountNumber,
          description: finalDescription,
          paymentMethod: isJewelleryDonation ? "CASH" : paymentMethod,
          chequeId: chequeId || undefined,
          bankAccountId: bankAccountId || undefined,
          category: category || undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          referenceDate: referenceDate
            ? new Date(referenceDate).toISOString()
            : undefined,
          metalType: category === "JEWELLERY_DONATION" ? metalType : undefined,
          weight:
            category === "JEWELLERY_DONATION" && weight
              ? parseFloat(weight)
              : undefined,
          purity: category === "JEWELLERY_DONATION" ? purity : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create voucher");
        return;
      }

      const isInstant = data.status === "APPROVED";
      if (isInstant) {
        toast.success("Receipt posted and approved automatically");
      } else {
        toast.success(
          "Voucher saved as Draft — awaiting Admin approval. Balance will be updated on approval."
        );
      }
      router.push("/dashboard/vouchers");
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Loading form data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          New {voucherType === "PAYMENT" ? "Payment" : "Receive"} Voucher
        </h1>
        <p className="text-slate-600 mt-2">
          Create a new {voucherType === "PAYMENT" ? "payment" : "receive"}{" "}
          voucher. Drafts do not affect balances until approved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Voucher Details</CardTitle>
            <CardDescription>Fill in the voucher information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Type, Date, Payment Method */}
            <div
              className={`grid ${
                showPaymentMethod ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
              } gap-4`}
            >
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Voucher Type
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={voucherType}
                  onChange={(e) => {
                    const newType = e.target.value as "PAYMENT" | "RECEIPT";
                    setVoucherType(newType);
                    setCategory("");
                  }}
                >
                  <option value="PAYMENT">Payment Voucher</option>
                  <option value="RECEIPT">Receive Voucher</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Voucher Date
                </label>
                <Input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  required
                />
              </div>

              {showPaymentMethod && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Payment Method
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    value={paymentMethod}
                    disabled={!!autoPaymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value !== "CHEQUE") setChequeId("");
                      if (e.target.value === "CASH" && !requiresBankAccount)
                        setBankAccountId("");
                    }}
                  >
                    {autoPaymentMethod ? (
                      <option value={autoPaymentMethod}>
                        {autoPaymentMethod === "BANK_TRANSFER"
                          ? "Bank Transfer"
                          : autoPaymentMethod === "CHEQUE"
                          ? "Cheque"
                          : autoPaymentMethod === "ONLINE"
                          ? "Online"
                          : autoPaymentMethod}
                      </option>
                    ) : (
                      <>
                        <option value="CASH">Cash</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="ONLINE">Online</option>
                      </>
                    )}
                  </select>
                  {autoPaymentMethod && (
                    <p className="text-xs text-amber-600 mt-1">
                      Method locked for this category.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Category
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={category}
                onChange={(e) => {
                  const cat = e.target.value;
                  setCategory(cat);
                  // Auto‑fill description hints
                  if (cat === "BANK_INTEREST")
                    setDescription("Bank Interest Received");
                  else if (cat === "BANK_CHARGES")
                    setDescription("Bank Charges");
                  else if (cat === "DIRECT_DEPOSIT")
                    setDescription("Direct Deposit");
                  else if (cat === "DONATION") setDescription("Donation");
                  else if (cat === "DONATION_CHARITY")
                    setDescription("Donation / Charity");
                }}
              >
                <option value="">Select category</option>
                {(voucherType === "PAYMENT"
                  ? PAYMENT_CATEGORIES
                  : RECEIPT_CATEGORIES
                ).map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Jewellery Donation Details */}
            {isJewelleryDonation && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800">
                  Jewellery Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Metal Type
                    </label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      value={metalType}
                      onChange={(e) => setMetalType(e.target.value)}
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Weight (Grams)
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="0.000"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Purity (e.g., 22K)
                    </label>
                    <Input
                      value={purity}
                      onChange={(e) => setPurity(e.target.value)}
                      placeholder="e.g., 22K"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bank Account (for non-cash transactions) */}
            {((paymentMethod !== "CASH" && !isJewelleryDonation) ||
              requiresBankAccount) && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Bank Account {requiresBankAccount && <span className="text-red-500">*</span>}
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  required={requiresBankAccount}
                >
                  <option value="">Select bank account</option>
                  {bankAccounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} — {acc.accountNumber} ({acc.accountHolder})
                    </option>
                  ))}
                </select>
                {requiresBankAccount && (
                  <p className="text-xs text-amber-600 mt-1">
                    This receipt will be instantly credited to the passbook.
                  </p>
                )}
              </div>
            )}

            {/* Registered Cheque selector (PAYMENT + CHEQUE) */}
            {voucherType === "PAYMENT" && paymentMethod === "CHEQUE" && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Registered Cheque
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={chequeId}
                  onChange={(e) => handleChequeSelect(e.target.value)}
                >
                  <option value="">Select issued cheque</option>
                  {availableCheques.map((cheque) => (
                    <option key={cheque.id} value={cheque.id}>
                      #{cheque.chequeNumber} — {cheque.payeeName} (₹
                      {cheque.amount.toLocaleString()})
                      {cheque.account ? ` · ${cheque.account.bankName}` : ""}
                    </option>
                  ))}
                </select>
                {availableCheques.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No issued cheques available.{" "}
                    <Link
                      href="/dashboard/cheques/register"
                      className="text-blue-600 hover:underline"
                    >
                      Open Cheque Register
                    </Link>
                  </p>
                )}
              </div>
            )}

            {/* Received Cheque Details (RECEIPT + CHEQUE) */}
            {voucherType === "RECEIPT" && paymentMethod === "CHEQUE" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800">
                  Received Cheque Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Cheque Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter cheque number"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Cheque Date
                    </label>
                    <Input
                      type="date"
                      value={referenceDate}
                      onChange={(e) => setReferenceDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Payer's Bank Name
                  </label>
                  <Input
                    value={receivedChequeBank}
                    onChange={(e) => setReceivedChequeBank(e.target.value)}
                    placeholder="e.g., State Bank of India"
                  />
                </div>
              </div>
            )}

            {/* Reference Number (non-cheque bank transactions) */}
            {(paymentMethod === "BANK_TRANSFER" ||
              paymentMethod === "ONLINE" ||
              category === "BANK_INTEREST" ||
              category === "BANK_CHARGES" ||
              category === "DIRECT_DEPOSIT") &&
              !isJewelleryDonation && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Reference Number / UTR
                  </label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Enter reference number or UTR"
                  />
                </div>
              )}

            {/* Payee Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  {voucherType === "PAYMENT" ? "Payee" : "Payer"} (Select)
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={payeeId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setPayeeId(selectedId);
                    const selected = payees?.find((p) => p.id === selectedId);
                    if (selected) {
                      setPayeeName(selected.name);
                      setPayeeEmail(selected.email || "");
                      setPayeeType(selected.payeeType || "OTHER");
                    }
                  }}
                >
                  <option value="">Select existing (optional)</option>
                  {payees?.map((payee) => (
                    <option key={payee.id} value={payee.id}>
                      {payee.name}
                      {payee.email ? ` (${payee.email})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Or enter a new one below.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    {voucherType === "PAYMENT" ? "Payee" : "Payer"} Name{" "}
                    {!payeeId && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    value={payeeName}
                    onChange={(e) => {
                      setPayeeName(e.target.value);
                      if (payeeId) setPayeeId("");
                    }}
                    placeholder={`Enter ${voucherType === "PAYMENT" ? "payee" : "payer"} name`}
                    required={!payeeId}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Email (Optional)
                  </label>
                  <Input
                    type="email"
                    value={payeeEmail}
                    onChange={(e) => setPayeeEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Payee Type
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={payeeType}
                    onChange={(e) => setPayeeType(e.target.value)}
                  >
                    {PAYEE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Amount (₹)
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                className={
                  exceedsBalance || exceedsPotential
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }
              />
              {voucherType === "PAYMENT" && currentBalance !== null && (
                <div
                  className={`mt-2 text-xs p-2 rounded-md ${
                    exceedsBalance || exceedsPotential
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  }`}
                >
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span className="font-semibold">
                      ₹{currentBalance.toLocaleString()}
                    </span>
                  </div>
                  {pendingPayments > 0 && (
                    <>
                      <div className="flex justify-between mt-1">
                        <span>Pending Approvals:</span>
                        <span className="font-semibold">
                          ₹{pendingPayments.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Potential Balance:</span>
                        <span
                          className={`font-semibold ${
                            potentialBalance !== null && potentialBalance < 0
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          ₹
                          {potentialBalance !== null
                            ? potentialBalance.toLocaleString()
                            : "—"}
                        </span>
                      </div>
                    </>
                  )}
                  {(exceedsBalance || exceedsPotential) && (
                    <div className="flex items-center gap-1 mt-2 text-[11px] font-medium">
                      <AlertCircle className="w-3 h-3" />
                      {exceedsBalance
                        ? "Amount exceeds current available balance."
                        : "Amount exceeds potential balance after pending approvals."}
                    </div>
                  )}
                  <p className="text-[10px] opacity-70 mt-1">
                    Note: Balance is deducted only after Admin approval.
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Description
              </label>
              <textarea
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  voucherType === "PAYMENT"
                    ? "Purpose of the payment..."
                    : "Source / purpose of the receipt..."
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {amountNumber > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <p className="text-lg font-semibold text-slate-900">
                  Total Amount:
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  ₹{amountNumber.toLocaleString()}
                </p>
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
            {isSubmitting ? "Creating..." : "Create Voucher"}
          </Button>
        </div>
      </form>
    </div>
  );
}
