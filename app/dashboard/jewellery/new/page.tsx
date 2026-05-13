import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { JewelleryForm } from "@/components/forms/jewellery-form";

export default async function NewJewelleryPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/jewellery");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <JewelleryForm />
    </div>
  );
}
