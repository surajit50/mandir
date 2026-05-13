import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BankReconciliationForm } from "@/components/forms/bank-reconciliation-form";

export default async function NewReconciliationPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/bank-reconciliation");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BankReconciliationForm />
    </div>
  );
}
