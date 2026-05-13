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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Payee {
  id: string;
  name: string;
  email?: string | null;
}

interface Cheque {
  id: string;
  chequeNumber: string;
  amount: number;
  payeeName: string;
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
}

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

export default function NewVoucherPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [voucherType, setVoucherType] = useState<"PAYMENT" | "RECEIPT">(
    "PAYMENT",
  );
  const [payeeId, setPayeeId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [payeeEmail, setPayeeEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [chequeId, setChequeId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [receivedChequeBank, setReceivedChequeBank] = useState("");
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);

  // New fields for Jewellery Donation
  const [metalType, setMetalType] = useState("Gold");
  const [weight, setWeight] = useState("");
  const [purity, setPurity] = useState("");

  // Fetch saved payees for quick reuse
  const { data: payees } = useSWR<Payee[]>("/api/payees", fetcher, {
    revalidateOnFocus: false,
  });
  const { data: cheques } = useSWR<Cheque[]>(
    "/api/cheques?includeUnassigned=true",
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );
  const { data: bankAccounts } = useSWR<BankAccount[]>(
    "/api/bank-accounts",
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  // Fetch current cash balance
  const { data: cashBalanceData } = useSWR<{ balance: number }>(
    "/api/cash-book/balance",
    fetcher,
  );

  // Determine the forced payment method based on category (null = user choice)
  const autoPaymentMethod = (() => {
    if (voucherType !== "RECEIPT") return null; // only for receipts
    if (category === "JEWELLERY_DONATION") return "CASH"; // placeholder, not shown
    if (category === "BANK_INTEREST") return "BANK_TRANSFER";
    if (category === "DIRECT_DEPOSIT") return "BANK_TRANSFER";
    if (category === "BANK_TRANSFER_RECEIVED") return "BANK_TRANSFER";
    if (category === "ONLINE_RECEIVED") return "ONLINE";
    if (category === "CHEQUE_RECEIVED") return "CHEQUE";
    return null; // DONATION, RENT_INCOME, OTHER_INCOME – free choice
  })();

  // Derived booleans for showing/hiding sections
  const isJewelleryDonation =
    voucherType === "RECEIPT" && category === "JEWELLERY_DONATION";
  const showPaymentMethod = !isJewelleryDonation; // hide for jewellery
  const requiresBankAccount =
    voucherType === "RECEIPT" && INSTANT_POST_CATEGORIES.includes(category);

  // Auto‑set payment method when category changes
  useEffect(() => {
    if (autoPaymentMethod) {
      setPaymentMethod(autoPaymentMethod);
    }
  }, [autoPaymentMethod]);

  // Reset fields that don't apply when category changes
  useEffect(() => {
    if (isJewelleryDonation) {
      // Clear bank/cheque related fields
      setBankAccountId("");
      setChequeId("");
      setReferenceNumber("");
      setReferenceDate("");
      setReceivedChequeBank("");
      setPaymentMethod("CASH"); // placeholder
    }
    if (voucherType === "RECEIPT" && category === "CHEQUE_RECEIVED") {
      // Ensure cheque fields are visible and bank account is cleared (cheque has its own)
      setBankAccountId("");
    }
  }, [isJewelleryDonation, category, voucherType]);

  // Update available balance logic (unchanged)
  useEffect(() => {
    if (voucherType === "RECEIPT") {
      setAvailableBalance(null);
      return;
    }

    if (paymentMethod === "CASH") {
      setAvailableBalance(cashBalanceData?.balance ?? null);
    } else if (bankAccountId) {
      const selectedAccount = bankAccounts?.find((a) => a.id === bankAccountId);
      const accountWithBalance = selectedAccount as any;
      setAvailableBalance(accountWithBalance?.currentBalance ?? 0);
    } else {
      setAvailableBalance(null);
    }
  }, [
    voucherType,
    paymentMethod,
    bankAccountId,
    cashBalanceData,
    bankAccounts,
  ]);

  const availableCheques =
    cheques
      ?.filter((cheque) => cheque.status === "ISSUED")
      .sort((a, b) => {
        const numA = Number.parseInt(a.chequeNumber, 10);
        const numB = Number.parseInt(b.chequeNumber, 10);
        if (Number.isNaN(numA) || Number.isNaN(numB)) {
          return a.chequeNumber.localeCompare(b.chequeNumber);
        }
        return numA - numB;
      }) ?? [];

  // Side effects when method/voucher type change
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!voucherDate) {
      toast.error("Voucher date is required");
      return;
    }

    if (!payeeId && !payeeName.trim()) {
      toast.error("Payee is required");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (
      voucherType === "PAYMENT" &&
      availableBalance !== null &&
      parseFloat(amount) > availableBalance
    ) {
      toast.error(
        `Insufficient balance. Available: ₹${availableBalance.toLocaleString()}`,
      );
      return;
    }

    if (!description) {
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
      finalDescription = `Cheque #${referenceNumber}${receivedChequeBank ? ` from ${receivedChequeBank}` : ""} — ${finalDescription}`;
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
          amount: parseFloat(amount),
          description: finalDescription,
          paymentMethod: isJewelleryDonation ? "CASH" : paymentMethod, // always CASH for jewellery
          chequeId: chequeId || undefined,
          bankAccountId: bankAccountId || undefined,
          category: category || undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          referenceDate: referenceDate
            ? new Date(referenceDate).toISOString()
            : undefined,
          metalType: category === "JEWELLERY_DONATION" ? metalType : undefined,
          weight:
            category === "JEWELLERY_DONATION" ? parseFloat(weight) : undefined,
          purity: category === "JEWELLERY_DONATION" ? purity : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create voucher");
        return;
      }

      toast.success("Voucher created successfully");
      router.push(`/dashboard/vouchers/${data.id}`);
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          New {voucherType === "PAYMENT" ? "Payment" : "Receive"} Voucher
        </h1>
        <p className="text-slate-600 mt-2">
          Create a new {voucherType === "PAYMENT" ? "payment" : "receive"}{" "}
          voucher
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Voucher Details</CardTitle>
            <CardDescription>Fill in the voucher information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Type, Date, Payment Method (dynamic columns) */}
            <div
              className={`grid ${
                showPaymentMethod ? "grid-cols-3" : "grid-cols-2"
              } gap-4`}
            >
              <div>
                <label
                  htmlFor="type"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  Voucher Type
                </label>
                <select
                  id="type"
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
                <label
                  htmlFor="date"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  Voucher Date
                </label>
                <Input
                  id="date"
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  required
                />
              </div>

              {showPaymentMethod && (
                <div>
                  <label
                    htmlFor="method"
                    className="text-sm font-medium text-slate-700 block mb-2"
                  >
                    Payment Method
                  </label>
                  <select
                    id="method"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                    value={paymentMethod}
                    disabled={!!autoPaymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value !== "CHEQUE") setChequeId("");
                      if (
                        e.target.value === "CASH" &&
                        !requiresBankAccount
                      )
                        setBankAccountId("");
                    }}
                  >
                    {/* Show only the auto‑selected option when disabled */}
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
              <label
                htmlFor="category"
                className="text-sm font-medium text-slate-700 block mb-2"
              >
                Category
              </label>
              <select
                id="category"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  const cat = e.target.value;
                  // Auto‑fill description
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
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  Jewellery Details (Gold/Silver)
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Metal Type
                    </label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      Purity (e.g. 22K)
                    </label>
                    <Input
                      value={purity}
                      onChange={(e) => setPurity(e.target.value)}
                      placeholder="e.g. 22K"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bank Account – always show for auto‑post categories, otherwise only for non‑cash */}
            {(paymentMethod !== "CASH" && !isJewelleryDonation) ||
            requiresBankAccount ? (
              <div>
                <label
                  htmlFor="bankAccount"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  {paymentMethod === "CHEQUE"
                    ? "Bank Account (Cheque Book)"
                    : "Bank Account"}
                  {requiresBankAccount && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <select
                  id="bankAccount"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  required={requiresBankAccount}
                >
                  <option value="">Select bank account</option>
                  {bankAccounts?.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} — {account.accountNumber} (
                      {account.accountHolder})
                    </option>
                  ))}
                </select>
                {paymentMethod === "BANK_TRANSFER" && (
                  <p className="text-xs text-slate-500 mt-1">
                    Select the bank account{" "}
                    {voucherType === "PAYMENT"
                      ? "from which the transfer will be made"
                      : "to which the transfer was received"}
                    .
                  </p>
                )}
                {paymentMethod === "ONLINE" && (
                  <p className="text-xs text-slate-500 mt-1">
                    Select the bank account{" "}
                    {voucherType === "PAYMENT"
                      ? "used for this online payment"
                      : "to which the online payment was received"}
                    .
                  </p>
                )}
                {requiresBankAccount && (
                  <p className="text-xs text-amber-600 mt-1">
                    This receipt will be instantly credited to the passbook.
                  </p>
                )}
              </div>
            ) : null}

            {/* Registered Cheque selector – only for PAYMENT + CHEQUE */}
            {voucherType === "PAYMENT" && paymentMethod === "CHEQUE" && (
              <div>
                <label
                  htmlFor="chequeId"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  Registered Cheque
                </label>
                <select
                  id="chequeId"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={chequeId}
                  disabled={!cheques}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setChequeId(selectedId);
                    const selectedCheque = availableCheques.find(
                      (c) => c.id === selectedId,
                    );
                    if (selectedCheque) {
                      setAmount(selectedCheque.amount.toString());
                      setPayeeName(selectedCheque.payeeName);
                      if (selectedCheque.account?.id) {
                        setBankAccountId(selectedCheque.account.id);
                      }
                    }
                  }}
                >
                  <option value="">
                    {!cheques ? "Loading cheques..." : "Select issued cheque"}
                  </option>
                  {availableCheques.map((cheque) => (
                    <option key={cheque.id} value={cheque.id}>
                      #{cheque.chequeNumber} — {cheque.payeeName} (₹
                      {cheque.amount.toLocaleString()})
                      {cheque.account ? ` · ${cheque.account.bankName}` : ""}
                    </option>
                  ))}
                </select>
                {cheques && availableCheques.length === 0 && (
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

            {/* Received Cheque Details – only for RECEIPT + CHEQUE */}
            {voucherType === "RECEIPT" && paymentMethod === "CHEQUE" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800">
                  Received Cheque Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="chequeNumber"
                      className="text-sm font-medium text-slate-700 block mb-2"
                    >
                      Cheque Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="chequeNumber"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter cheque number"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="chequeDate"
                      className="text-sm font-medium text-slate-700 block mb-2"
                    >
                      Cheque Date
                    </label>
                    <Input
                      id="chequeDate"
                      type="date"
                      value={referenceDate}
                      onChange={(e) => setReferenceDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="chequeBank"
                    className="text-sm font-medium text-slate-700 block mb-2"
                  >
                    Payer's Bank Name
                  </label>
                  <Input
                    id="chequeBank"
                    value={receivedChequeBank}
                    onChange={(e) => setReceivedChequeBank(e.target.value)}
                    placeholder="Enter bank name (e.g. State Bank of India)"
                  />
                </div>
              </div>
            )}

            {/* Reference Number – for non-cheque bank transactions */}
            {(paymentMethod === "BANK_TRANSFER" ||
              paymentMethod === "ONLINE" ||
              category === "BANK_INTEREST" ||
              category === "BANK_CHARGES" ||
              category === "DIRECT_DEPOSIT") &&
              !isJewelleryDonation && (
                <div>
                  <label
                    htmlFor="referenceNumber"
                    className="text-sm font-medium text-slate-700 block mb-2"
                  >
                    Reference Number / UTR
                  </label>
                  <Input
                    id="referenceNumber"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Enter reference number or UTR"
                  />
                </div>
              )}

            {/* Payee section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="payee"
                  className="text-sm font-medium text-slate-700 block mb-2"
                >
                  {voucherType === "PAYMENT" ? "Payee" : "Payer"}
                </label>
                <select
                  id="payee"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={payeeId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setPayeeId(selectedId);
                    const selectedPayee = payees?.find(
                      (item) => item.id === selectedId,
                    );
                    if (selectedPayee) {
                      setPayeeName(selectedPayee.name);
                      setPayeeEmail(selectedPayee.email || "");
                    }
                  }}
                >
                  <option value="">
                    Select existing{" "}
                    {voucherType === "PAYMENT" ? "payee" : "payer"} (optional)
                  </option>
                  {payees?.map((payee) => (
                    <option key={payee.id} value={payee.id}>
                      {payee.name}
                      {payee.email ? ` (${payee.email})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Or enter a new payee below.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="payeeName"
                    className="text-sm font-medium text-slate-700 block mb-2"
                  >
                    {voucherType === "PAYMENT" ? "Payee" : "Payer"} Name
                  </label>
                  <Input
                    id="payeeName"
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
                  <label
                    htmlFor="payeeEmail"
                    className="text-sm font-medium text-slate-700 block mb-2"
                  >
                    Email (Optional)
                  </label>
                  <Input
                    id="payeeEmail"
                    type="email"
                    value={payeeEmail}
                    onChange={(e) => setPayeeEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="text-sm font-medium text-slate-700 block mb-2"
              >
                Amount
              </label>
              <div className="space-y-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className={
                    voucherType === "PAYMENT" &&
                    availableBalance !== null &&
                    parseFloat(amount || "0") > availableBalance
                      ? "border-red-500 focus:ring-red-500"
                      : ""
                  }
                />
                {voucherType === "PAYMENT" && availableBalance !== null && (
                  <div
                    className={`text-xs font-medium px-2 py-1 rounded-md flex justify-between items-center ${
                      parseFloat(amount || "0") > availableBalance
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}
                  >
                    <span>
                      Available Balance: ₹{availableBalance.toLocaleString()}
                    </span>
                    {parseFloat(amount || "0") > availableBalance && (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Insufficient Funds
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="text-sm font-medium text-slate-700 block mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
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
        {amount && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <p className="text-lg font-semibold text-slate-900">
                  Total Amount:
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  ₹{parseFloat(amount || "0").toLocaleString()}
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
