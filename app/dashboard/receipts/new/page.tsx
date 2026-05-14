import { ReceiptForm } from "@/components/forms/receipt-form";

export const metadata = {
  title: "New Receipt - Temple Trust",
  description: "Generate a new donation receipt",
};

export default function NewReceiptPage() {
  return <ReceiptForm />;
}
