import BankAccountPassbookClient from "./passbook-client";


interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BankAccountPassbookPage({ params }: PageProps) {
  const { id } = await params;
  return <BankAccountPassbookClient accountId={id} />;
}
