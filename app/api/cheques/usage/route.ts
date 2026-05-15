import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { chequePayeeDisplayName } from '@/lib/cheque-payee';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!accountId || !start || !end) {
      return NextResponse.json(
        { error: 'accountId, start, and end are required' },
        { status: 400 }
      );
    }

    // Convert to numeric strings for comparison (assumes cheque numbers are strings like "001234")
    // Fetch all cheques for this account, regardless of range
    const allCheques = await prisma.chequeRegister.findMany({
      where: { accountId, chequeType: 'ISSUED' },  // only issued cheques
      select: {
        id: true,
        chequeNumber: true,
        status: true,
        createdAt: true,
        paymentVouchers: {
          take: 1,
          select: { amount: true, referenceDate: true, payee: { select: { name: true } } },
        },
      },
      orderBy: { chequeNumber: 'asc' },
    });

    // Build a set of used cheque numbers
    const usedNumbers = new Map<string, any>(
      allCheques.map((c: any) => [c.chequeNumber, c])
    );

    // Generate the full range (as strings, padded if needed)
    // For string comparison we assume both input and stored numbers are zero-padded
    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);
    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
      return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
    }

    const padLength = start.length; // keep same padding
    const range: {
      chequeNumber: string;
      used: boolean;
      status?: string;
      payee?: string;
      amount?: number;
      date?: string;
      id?: string;
    }[] = [];

    for (let i = startNum; i <= endNum; i++) {
      const numStr = String(i).padStart(padLength, '0');
      const existing = usedNumbers.get(numStr);
      range.push({
        chequeNumber: numStr,
        used: !!existing,
        status: existing?.status,
        payee: existing ? chequePayeeDisplayName(existing) : undefined,
        amount: existing?.paymentVouchers[0]?.amount || 0,
        date: existing?.paymentVouchers[0]?.referenceDate || existing?.createdAt,
        id: existing?.id,
      });
    }

    return NextResponse.json({ range });
  } catch (error) {
    console.error('Cheque usage error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
