import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { EPAY_GATEWAYS_KEY, parseEpayGateways, validateEpayGateways } from "@/lib/payments/epay-config";

export async function GET() {
  if (!await isAuthenticated()) return new NextResponse("Unauthorized", { status: 401 });

  const settings = await prisma.systemSetting.findMany();
  // Convert array to object
  const config = settings.reduce((acc, curr) => {
    // Don't expose sensitive password
    if (curr.key !== "admin_password") {
      acc[curr.key] = curr.value;
    }
    return acc;
  }, {} as Record<string, string>);

  return NextResponse.json(config);
}

export async function POST(req: Request) {
  if (!await isAuthenticated()) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();

    if (typeof body[EPAY_GATEWAYS_KEY] === "string") {
      validateEpayGateways(parseEpayGateways(body[EPAY_GATEWAYS_KEY]));
    }
    
    // Upsert each setting
    for (const [key, value] of Object.entries(body)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to save settings" }, { status: 500 });
  }
}
