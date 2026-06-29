import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { orderNo: string } }
) {
  const order = await prisma.order.findUnique({
    where: { orderNo: params.orderNo },
    select: {
      orderNo: true,
      status: true,
      paidAt: true,
      epayTradeNo: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}
