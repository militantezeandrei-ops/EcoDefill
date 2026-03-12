import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const adminCookie = req.cookies.get("adminAuthToken");
        if (!adminCookie) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const sinceStr = url.searchParams.get("since");
        const since = sinceStr ? new Date(sinceStr) : new Date(Date.now() - 30 * 1000); // Default to last 30s if not provided

        // Fetch recent transactions
        const recentTx = await prisma.transaction.findMany({
            where: {
                createdAt: { gt: since }
            },
            include: { user: { select: { email: true, course: true, section: true } } },
            orderBy: { createdAt: "desc" },
            take: 5
        });

        // Format into a generic event list
        const events = recentTx.map(tx => {
            let title = "";
            let description = "";

            if (tx.type === "EARN") {
                title = "♻️ Recycling Points Earned!";
                description = `${tx.user?.email || "Someone"} earned ${tx.amount} points (${tx.materialType}).`;
            } else if (tx.type === "REDEEM") {
                title = "💧 Water Dispensed!";
                description = `${tx.user?.email || "Someone"} redeemed ${tx.amount} points for ${(tx.amount * 100).toFixed(0)}ml of water.`;
            }

            return {
                id: tx.id,
                title,
                description,
                timestamp: tx.createdAt.toISOString()
            };
        });

        return NextResponse.json({ events, serverTime: new Date().toISOString() }, { status: 200 });

    } catch (error) {
        console.error("Admin Polling Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
