import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PaymentVoucherForm } from "@/components/forms/payment-voucher-form";

export default async function NewVoucherPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role === "ADMIN") {
    redirect("/dashboard/vouchers");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PaymentVoucherForm />
    </div>
  );
}
