import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { logger } from "@/lib/logger";

const log = logger.child({ module: 'AdminDiscount' });

export async function GET(req: Request) {
    if (!await isAuthenticated()) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const discounts = await prisma.discount.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        return NextResponse.json(discounts);
    } catch (error) {
        log.error({ err: error }, "Failed to fetch discounts");
        return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    if (!await isAuthenticated()) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const { name, type, value, startDate, endDate, productIds } = await req.json();

        // 1. Create the Discount
        const discount = await prisma.discount.create({
            data: {
                name,
                type,
                value,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                products: {
                    connect: productIds?.map((id: string) => ({ id })) || []
                }
            },
            include: { products: true }
        });

        log.info({ discountId: discount.id, name }, "Discount created");
        return NextResponse.json(discount);
    } catch (error) {
        log.error({ err: error }, "Failed to create discount");
        return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
    }
}
