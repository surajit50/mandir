import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ChequeBookSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  bookNumber: z.string().optional(),
  startChequeNumber: z.string().regex(/^\d+$/, "Start cheque number must be numeric"),
  leafCount: z.number().int().min(1, "At least 1 leaf required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedBook = ChequeBookSchema.parse(body);
    
    const startNumber = parseInt(validatedBook.startChequeNumber, 10);
    const numberWidth = validatedBook.startChequeNumber.length;

    const chequeNumbers = Array.from(
      { length: validatedBook.leafCount },
      (_, index) => String(startNumber + index).padStart(numberWidth, "0")
    );

    // Check for existing cheques in this range for this account
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
        { status: 400 }
      );
    }

    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      // Create ChequeBook
      const book = await tx.chequeBook.create({
        data: {
          accountId: validatedBook.accountId,
          bookNumber: validatedBook.bookNumber || null,
          startChequeNo: validatedBook.startChequeNumber,
          leafCount: validatedBook.leafCount,
        },
      });

      // Create ChequeRegister entries
      await tx.chequeRegister.createMany({
        data: chequeNumbers.map((num) => ({
          chequeNumber: num,
          chequeBookId: book.id,
          accountId: validatedBook.accountId,
          status: "AVAILABLE",
          financialYearId: currentFY?.id,
        })),
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name ?? "Unknown User",
          userRole,
          action: "CREATE",
          module: "ChequeBook",
          entityId: book.id,
          entityType: "ChequeBook",
          status: "SUCCESS",
        },
      });

      return book;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Cheque book creation error:", error);
    return NextResponse.json({ error: "Failed to create cheque book" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    const books = await prisma.chequeBook.findMany({
      where: accountId ? { accountId } : {},
      include: {
        account: { select: { bankName: true, accountNumber: true } },
        _count: {
          select: {
            cheques: {
              where: {
                OR: [
                  { paymentVouchers: { some: {} } },
                  { status: { notIn: ["AVAILABLE", "CANCELLED"] } }
                ]
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Rename _count.cheques to usedCount for easier usage
    const formattedBooks = books.map((book: any) => ({
      ...book,
      usedCount: book._count.cheques,
      _count: undefined
    }));

    return NextResponse.json(formattedBooks);
  } catch (error) {
    console.error("Cheque books fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch cheque books" }, { status: 500 });
  }
}
