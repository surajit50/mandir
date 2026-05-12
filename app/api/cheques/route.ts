import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ChequeSchema = z.object({
  chequeNumber: z.string().min(1, "Cheque number is required"),
  chequeDate: z.string().datetime(),
  amount: z.number().positive("Amount must be greater than 0"),
  payeeName: z.string().min(1, "Payee name is required"),
  accountId: z.string().min(1, "Account is required"),
  status: z.enum(["ISSUED", "DEPOSITED", "CLEARED", "BOUNCED", "CANCELLED"]).default("ISSUED"),
});

const ChequeBookSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  startChequeNumber: z.string().regex(/^\d+$/, "Start cheque number must be numeric"),
  leafCount: z.number().int().min(20, "Cheque book must have at least 20 leaves"),
  chequeDate: z.string().datetime().optional(),
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

    // Only ADMIN and ACCOUNTANT can create cheques
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can create cheques" },
        { status: 403 }
      );
    }

    // Get current financial year
    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    const body = await request.json();
    if (body.mode === "BOOK") {
      const validatedBook = ChequeBookSchema.parse(body);
      const startNumber = parseInt(validatedBook.startChequeNumber, 10);
      const numberWidth = validatedBook.startChequeNumber.length;
      const chequeDate = validatedBook.chequeDate
        ? new Date(validatedBook.chequeDate)
        : new Date();

      const chequeNumbers = Array.from(
        { length: validatedBook.leafCount },
        (_, index) => String(startNumber + index).padStart(numberWidth, "0"),
      );

      const existing = await prisma.chequeRegister.findMany({
        where: {
          accountId: validatedBook.accountId,
          chequeNumber: { in: chequeNumbers },
        },
        select: { chequeNumber: true },
      });

      if (existing.length > 0) {
        return NextResponse.json(
          {
            error: `Cheque numbers already exist: ${existing
              .map((item) => item.chequeNumber)
              .join(", ")}`,
          },
          { status: 400 },
        );
      }

      const cheques = await prisma.$transaction(async (tx) => {
        await tx.chequeRegister.createMany({
          data: chequeNumbers.map((chequeNumber) => ({
            chequeNumber,
            chequeDate,
            amount: 0,
            payeeName: "UNASSIGNED",
            accountId: validatedBook.accountId,
            status: "ISSUED",
            financialYearId: currentFY?.id,
          })),
        });

        const createdCheques = await tx.chequeRegister.findMany({
          where: {
            accountId: validatedBook.accountId,
            chequeNumber: { in: chequeNumbers },
          },
          include: {
            account: { select: { id: true, bankName: true, accountNumber: true } },
          },
          orderBy: { chequeNumber: "asc" },
        });

        // Log audit
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            userName: session.user.name ?? "Unknown User",
            userRole: userRole,
            action: "CREATE",
            module: "ChequeRegister",
            entityId: createdCheques[0].id, // Reference first cheque as example
            entityType: "ChequeBook",
            status: "SUCCESS",
          },
        });

        return createdCheques;
      });

      return NextResponse.json(
        {
          mode: "BOOK",
          count: cheques.length,
          cheques: cheques,
        },
        { status: 201 },
      );
    }

    const validatedData = ChequeSchema.parse(body);

    // Check if cheque number already exists for this account
    const existingCheque = await prisma.chequeRegister.findUnique({
      where: {
        accountId_chequeNumber: {
          accountId: validatedData.accountId,
          chequeNumber: validatedData.chequeNumber,
        },
      },
    });

    if (existingCheque) {
      return NextResponse.json(
        { error: "Cheque number already exists for this account" },
        { status: 400 }
      );
    }

    const cheque = await prisma.chequeRegister.create({
      data: {
        chequeNumber: validatedData.chequeNumber,
        chequeDate: new Date(validatedData.chequeDate),
        amount: validatedData.amount,
        payeeName: validatedData.payeeName,
        accountId: validatedData.accountId,
        status: validatedData.status,
        financialYearId: currentFY?.id,
      },
      include: {
        account: { select: { id: true, bankName: true, accountNumber: true } },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? "Unknown User",
        userRole: userRole,
        action: "CREATE",
        module: "ChequeRegister",
        entityId: cheque.id,
        entityType: "ChequeRegister",
        status: "SUCCESS",
      },
    });

    return NextResponse.json(cheque, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Cheque creation error:", error);
    return NextResponse.json(
      { error: "Failed to create cheque" },
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

    const { searchParams } = new URL(request.url);
    const includeUnassigned = searchParams.get("includeUnassigned") === "true";

    const cheques = await prisma.chequeRegister.findMany({
      where: includeUnassigned
        ? undefined
        : {
            // Exclude placeholder cheque leaves (blank/unused)
            // Real cheques have a proper payee name AND amount > ₹0
            NOT: {
              payeeName: "UNASSIGNED",
              amount: { lte: 0 },
            },
          },
      include: {
        account: { select: { id: true, bankName: true, accountNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(cheques);
  } catch (error) {
    console.error("Cheques fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cheques" },
      { status: 500 }
    );
  }
}
