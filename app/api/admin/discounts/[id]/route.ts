import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { logger } from "@/lib/logger";

const log = logger.child({ module: 'AdminDiscount' });

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    if (!await isAuthenticated()) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const { name, type, value, startDate, endDate, isActive, productIds } = await req.json();
        const { id } = params;

        // To update relations properly (disconnect old, connect new), we often define it explicitly
        // But since "connect" adds to the list, we might want to "set" the list to replace it.
        // Prisma's "set" is perfect here.

        const data: any = {
            name,
            type,
            value,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            isActive
        };

        if (productIds) {
            data.products = {
                set: productIds.map((pid: string) => ({ id: pid }))
            };
        }

        const discount = await prisma.discount.update({
            where: { id },
            data,
            include: { products: true }
        });

        log.info({ discountId: id }, "Discount updated");
        return NextResponse.json(discount);
    } catch (error) {
        log.error({ err: error, discountId: params.id }, "Failed to update discount");
        return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    if (!await isAuthenticated()) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const { id } = params;

        // Prisma handles setting foreign keys to null automatically if relation is optional?
        // Let's verify. Yes, if Relation is optional on Product side, deleting Discount sets Product.discountId to null.
        // Wait, by default "OnDelete SetNull" is expected behaviour for optional relations in many SQL DBs but Prisma needs confirmation.
        // In Schema, `discount Discount?` is optional. 
        // To be safe, we rely on Prisma's default or explicitly check. 
        // Usually prisma handles this fine for optional relations.

        await prisma.discount.delete({
            where: { id }
        });

        log.info({ discountId: id }, "Discount deleted");
        return NextResponse.json({ success: true });
    } catch (error) {
        log.error({ err: error, discountId: params.id }, "Failed to delete discount");
        return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
    }
}
