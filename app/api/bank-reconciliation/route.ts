import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const EncashmentUpdateSchema = z.object({
  chequeId: z.string(),
  encashmentDate: z.string().datetime(),
});

const BankReconciliationSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  reconciliationDate: z.string().datetime(),
  bankBalance: z.number(),
  bookBalance: z.number(),
  reconciliationItems: z.array(
    z.object({
      itemType: z.string(),
      amount: z.number(),
      description: z.string().optional(),
    })
  ).optional(),
  encashmentUpdates: z.array(EncashmentUpdateSchema).optional(),
  remarks: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;

    // Only ADMIN and ACCOUNTANT can create reconciliations
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can create reconciliations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = BankReconciliationSchema.parse(body);

    // Get current financial year
    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    // Verify account exists
    const account = await prisma.bankAccount.findUnique({
      where: { id: validatedData.accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 400 }
      );
    }

    const difference = validatedData.bankBalance - validatedData.bookBalance;

    const result = await prisma.$transaction(async (tx) => {
      const reconciliation = await tx.bankReconciliation.create({
        data: {
          accountId: validatedData.accountId,
          reconciliationDate: new Date(validatedData.reconciliationDate),
          bankBalance: validatedData.bankBalance,
          bookBalance: validatedData.bookBalance,
          difference,
          remarks: validatedData.remarks,
          status: "PENDING",
          financialYearId: currentFY?.id,
          reconciliationItems: {
            create: (validatedData.reconciliationItems || []).map((item) => ({
              itemType: item.itemType,
              amount: item.amount,
              description: item.description,
            })),
          },
        },
        include: {
          reconciliationItems: true,
        },
      });

      // Process encashment updates - mark cheques as cleared with their encashment dates
      const encashmentUpdates = validatedData.encashmentUpdates || [];
      const updateResults: { chequeId: string; success: boolean; error?: string }[] = [];

      for (const update of encashmentUpdates) {
        try {
          const existingCheque = await tx.chequeRegister.findUnique({
            where: { id: update.chequeId },
            select: { id: true, status: true },
          });

          if (!existingCheque) {
            updateResults.push({ chequeId: update.chequeId, success: false, error: "Cheque not found" });
            continue;
          }

          if (existingCheque.status === "CLEARED") {
            updateResults.push({ chequeId: update.chequeId, success: true });
            continue;
          }

          if (existingCheque.status === "CANCELLED" || existingCheque.status === "BOUNCED") {
            updateResults.push({ chequeId: update.chequeId, success: false, error: `Cheque is ${existingCheque.status}` });
            continue;
          }

          await tx.chequeRegister.update({
            where: { id: update.chequeId },
            data: {
              status: "CLEARED",
              clearedDate: new Date(update.encashmentDate),
            },
          });

          updateResults.push({ chequeId: update.chequeId, success: true });
        } catch (err) {
          updateResults.push({ chequeId: update.chequeId, success: false, error: "Update failed" });
        }
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          userName: session.user.name ?? "Unknown User",
          userRole: userRole,
          action: "CREATE",
          module: "BankReconciliation",
          entityId: reconciliation.id,
          entityType: "BankReconciliation",
          status: "SUCCESS",
        },
      });

      return {
        ...reconciliation,
        encashmentResults: updateResults,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Bank reconciliation creation error:", error);
    return NextResponse.json(
      { error: "Failed to create bank reconciliation" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const reconciliations = await prisma.bankReconciliation.findMany({
      include: {
        account: true,
        reconciliationItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reconciliations);
  } catch (error) {
    console.error("Bank reconciliations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank reconciliations" },
      { status: 500 }
    );
  }
}
