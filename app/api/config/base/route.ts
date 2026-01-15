import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: "site_title" }
        });

        return NextResponse.json({
            site_title: setting?.value || "GeekFaka"
        });
    } catch (error) {
        return NextResponse.json({ site_title: "GeekFaka" });
    }
}
