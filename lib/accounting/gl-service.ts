
export type GLEntry = {
  accountCode: string;
  accountName: string;
  accountType: string; // Asset, Liability, Equity, Income, Expense
  debit?: number;
  credit?: number;
};




export async function postTransaction(
  tx: any,
  params: {
    date: Date;
    description: string;
    referenceType: string;
    referenceId: string;
    financialYearId?: string;
    entries: GLEntry[];
  }
) {
  // Validate balancing
  const totalDebit = params.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = params.entries.reduce((sum, e) => sum + (e.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`GL Transaction not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
  }

  for (const entry of params.entries) {
    if (!entry.debit && !entry.credit) continue;

    // Get or create account
    let account = await tx.gLAccount.findUnique({
      where: { accountCode: entry.accountCode },
    });

    if (!account) {
      account = await tx.gLAccount.create({
        data: {
          accountCode: entry.accountCode,
          accountName: entry.accountName,
          accountType: entry.accountType,
        },
      });
    }

    const debitAmount = entry.debit || 0;
    const creditAmount = entry.credit || 0;

    // Create posting
    await tx.gLPosting.create({
      data: {
        accountId: account.id,
        postingDate: params.date,
        description: params.description,
        debitAmount,
        creditAmount,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        financialYearId: params.financialYearId,
      },
    });

    // Update account balance
    let balanceChange = 0;
    if (["Asset", "Expense"].includes(account.accountType)) {
      balanceChange = debitAmount - creditAmount;
    } else {
      balanceChange = creditAmount - debitAmount;
    }

    await tx.gLAccount.update({
      where: { id: account.id },
      data: {
        currentBalance: {
          increment: balanceChange,
        },
      },
    });
  }
}
