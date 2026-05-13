import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FestivalForm } from "@/components/forms/festival-form";

export default async function NewFestivalPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/festivals");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FestivalForm />
    </div>
  );
}
