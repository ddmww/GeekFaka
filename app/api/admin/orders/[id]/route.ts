import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { sendOrderEmail } from "@/lib/mail";
import { fulfillPaidOrder } from "@/lib/fulfillment";

// Manual Actions (e.g., Mark as Paid)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!await isAuthenticated()) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { action } = await req.json(); // "MARK_PAID"
    const { id } = params;

    if (action === "MARK_PAID") {
       const result = await fulfillPaidOrder({
         id,
         paymentMethod: "manual",
         claimableStatuses: ["PENDING", "FAILED", "EXPIRED"],
       });

       if (result.alreadyPaid) {
         return NextResponse.json({ error: "Already paid" }, { status: 400 });
       }

       // Trigger email notification in background
       sendOrderEmail(result.order.orderNo).catch(console.error);

       return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    if (error.message === "Order not found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ error: error.message || "Operation failed" }, { status: 500 });
  }
}
