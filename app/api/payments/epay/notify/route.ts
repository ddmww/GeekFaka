import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentAdapter } from "@/lib/payments/registry";
import { logger } from "@/lib/logger";
import { sendOrderEmail } from "@/lib/mail";
import { fulfillPaidOrder } from "@/lib/fulfillment";

export async function GET(req: Request) {
  // EPay notifications are usually GET requests, but verify based on your gateway
  const { searchParams } = new URL(req.url);
  const data = Object.fromEntries(searchParams.entries());

  return processNotification(data, req);
}

export async function POST(req: Request) {
  // Handle POST notifications if configured
  const formData = await req.formData();
  const data = Object.fromEntries(formData.entries());
  
  return processNotification(data, req);
}

async function processNotification(data: any, req?: Request) {
  const log = logger.child({ module: 'EPayNotify', orderNo: data.out_trade_no });
  log.info({ data }, "Received payment callback");

  try {
    const adapter = getPaymentAdapter("epay");
    // Pass headers if available, or empty object
    const headers = req ? Object.fromEntries(req.headers.entries()) : {};
    const callbackData = await adapter.verifyCallback(data, headers);
    
    log.info({ callbackData }, "Signature verified");

    if (callbackData.status === "PAID") {
      const order = await prisma.order.findUnique({
        where: { orderNo: callbackData.orderNo },
        include: { product: true }
      });

      if (!order) {
        log.error("Order not found");
        throw new Error("Order not found");
      }

      if (order.status === "PAID") {
        if (callbackData.transactionId && !order.epayTradeNo) {
          await prisma.order.update({
            where: { id: order.id },
            data: { epayTradeNo: callbackData.transactionId }
          });
        }
        log.info("Order already paid, skipping idempotency check");
      } else {
        const result = await fulfillPaidOrder({
          orderNo: callbackData.orderNo,
          paymentMethod: "epay",
          epayTradeNo: callbackData.transactionId,
          claimableStatuses: ["PENDING", "FAILED", "EXPIRED"],
        });

        if (result.fulfilled) {
          log.info("Order successfully fulfilled");
        }
      }

      // Send Email Notification
      sendOrderEmail(callbackData.orderNo).catch(e => log.error({ err: e }, "Email background task failed"));
    }

    return new NextResponse("SUCCESS");
  } catch (error) {
    logger.error({ err: error }, "Payment notification processing failed");
    return new NextResponse("fail", { status: 400 });
  }
}
