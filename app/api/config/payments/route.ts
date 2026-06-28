import { NextResponse } from "next/server";
import { getEpayChannelLabel, loadEpayGateways } from "@/lib/payments/epay-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const channels = [];
  const gateways = await loadEpayGateways();
  const availableGateways = gateways.filter(gateway => gateway.enabled && gateway.apiUrl && gateway.pid);

  for (const gateway of availableGateways) {
    for (const channel of gateway.channels) {
      channels.push({
        id: `epay:${gateway.id}:${channel}`,
        name: availableGateways.length > 1 ? `${getEpayChannelLabel(channel)} - ${gateway.name}` : getEpayChannelLabel(channel),
        icon: channel === "alipay" ? "wallet" : "credit-card",
        provider: "epay",
        fee: gateway.fee,
      });
    }
  }

  return NextResponse.json(channels);
}
