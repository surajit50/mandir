import { BankAccountForm } from "@/components/forms/bank-account-form";

export default function NewBankAccountPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Add New Bank Account</h1>
        <p className="text-slate-600 mt-2">Register a new bank account for the temple</p>
      </div>

      <BankAccountForm />
    </div>
  );
}
