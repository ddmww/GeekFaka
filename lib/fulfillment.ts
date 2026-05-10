import type { Prisma, Order, Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderWithProduct = Order & { product: Product };
type FulfillmentOrderSelector =
  | { id: string; orderNo?: never }
  | { orderNo: string; id?: never };

type FulfillOrderOptions = FulfillmentOrderSelector & {
  paymentMethod: string;
  epayTradeNo?: string | null;
  claimableStatuses?: string[];
};

const MAX_LICENSE_CLAIM_ATTEMPTS = 3;
const DEFAULT_CLAIMABLE_STATUSES = ["PENDING"];

async function claimAvailableLicenses(
  tx: Prisma.TransactionClient,
  order: OrderWithProduct
) {
  const licenses = await tx.license.findMany({
    where: {
      productId: order.productId,
      status: "AVAILABLE",
      orderId: null,
    },
    orderBy: { createdAt: "asc" },
    take: order.quantity,
  });

  if (licenses.length < order.quantity) {
    throw new Error("Insufficient stock to fulfill order");
  }

  const licenseIds = licenses.map((license) => license.id);
  const claimResult = await tx.license.updateMany({
    where: {
      id: { in: licenseIds },
      status: "AVAILABLE",
      orderId: null,
    },
    data: {
      status: "SOLD",
      orderId: order.id,
    },
  });

  if (claimResult.count !== order.quantity) {
    throw new Error("LICENSE_CLAIM_CONFLICT");
  }

  return licenses;
}

export async function fulfillPaidOrder(options: FulfillOrderOptions) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_LICENSE_CLAIM_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: "id" in options ? { id: options.id } : { orderNo: options.orderNo },
          include: { product: true },
        });

        if (!order) {
          throw new Error("Order not found");
        }

        if (order.status === "PAID") {
          if (options.epayTradeNo && !order.epayTradeNo) {
            await tx.order.update({
              where: { id: order.id },
              data: { epayTradeNo: options.epayTradeNo },
            });
          }

          return { order, alreadyPaid: true, fulfilled: false };
        }

        const claimableStatuses = options.claimableStatuses ?? DEFAULT_CLAIMABLE_STATUSES;
        const lockResult = await tx.order.updateMany({
          where: {
            id: order.id,
            status: { in: claimableStatuses },
          },
          data: {
            status: "PROCESSING",
          },
        });

        if (lockResult.count !== 1) {
          throw new Error("Order status cannot be fulfilled");
        }

        const licenses = await claimAvailableLicenses(tx, order);

        const paidOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            paymentMethod: options.paymentMethod,
            epayTradeNo: options.epayTradeNo,
            paidAt: new Date(),
          },
          include: { product: true },
        });

        return { order: paidOrder, licenses, alreadyPaid: false, fulfilled: true };
      });
    } catch (error: any) {
      lastError = error;
      if (error?.message !== "LICENSE_CLAIM_CONFLICT" || attempt === MAX_LICENSE_CLAIM_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Order fulfillment failed");
}
