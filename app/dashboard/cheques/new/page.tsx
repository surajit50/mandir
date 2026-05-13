import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChequeForm } from "@/components/forms/cheque-form";

export default async function NewChequePage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/cheques");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ChequeForm />
    </div>
  );
}
