/** Payee / party name from the linked payment voucher (ChequeRegister has no payeeName field). */
export function chequePayeeDisplayName(cheque: {
  paymentVouchers?: { payee?: { name: string } | null }[] | null;
}): string {
  const name = cheque.paymentVouchers?.[0]?.payee?.name?.trim();
  return name && name.length > 0 ? name : "Unknown";
}
