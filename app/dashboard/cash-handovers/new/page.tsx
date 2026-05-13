import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CashHandoverForm } from "@/components/forms/cash-handover-form";

export default async function NewHandoverPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/cash-handovers");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CashHandoverForm />
    </div>
  );
}
