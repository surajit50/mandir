import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssetForm } from "@/components/forms/asset-form";

export default async function NewAssetPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/assets");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AssetForm />
    </div>
  );
}
