import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GLAccountForm } from "@/components/forms/gl-account-form";

export default async function NewGLAccountPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/gl-accounts");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <GLAccountForm />
    </div>
  );
}
