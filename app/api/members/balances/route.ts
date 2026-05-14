import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    
    // Only ADMIN and ACCOUNTANT can see all member balances
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all users with role MEMBER
    const members = await prisma.user.findMany({
      where: { 
        role: "MEMBER",
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });

    // For each member, calculate balance
    // Using direct aggregate for accuracy as discussed in me/balance
    const memberBalances = await Promise.all(
      members.map(async (member: any) => {
        const [donations, handovers] = await Promise.all([
          prisma.donationCollection.aggregate({
            where: {
              collectorId: member.id,
              status: "VERIFIED",
            },
            _sum: {
              totalAmount: true,
            },
          }),
          prisma.cashHandover.aggregate({
            where: {
              handoverFrom: member.id,
              status: "APPROVED",
            },
            _sum: {
              totalAmount: true,
            },
          }),
        ]);

        const balance = (donations._sum.totalAmount || 0) - (handovers._sum.totalAmount || 0);
        
        return {
          id: member.id,
          name: member.name,
          email: member.email,
          balance,
        };
      })
    );

    // Filter out members with zero balance if needed, but showing all is better for visibility
    return NextResponse.json(memberBalances);
  } catch (error) {
    console.error("Member balances fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch member balances" },
      { status: 500 }
    );
  }
}
