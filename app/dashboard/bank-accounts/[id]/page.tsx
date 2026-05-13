import { redirect } from "next/navigation";

// /dashboard/bank-accounts/[id] → redirect to passbook
export default async function BankAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/bank-accounts/${id}/passbook`);
}
