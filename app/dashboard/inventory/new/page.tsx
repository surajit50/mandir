import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InventoryForm } from "@/components/forms/inventory-form";

export default async function NewInventoryPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/inventory");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <InventoryForm />
    </div>
  );
}
