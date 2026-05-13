import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BankDepositForm } from "@/components/forms/bank-deposit-form";

export default async function NewBankDepositPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/bank-deposits");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BankDepositForm />
    </div>
  );
}