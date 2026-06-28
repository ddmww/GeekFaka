import { prisma } from "@/lib/prisma";

export type EpayChannel = "alipay" | "wxpay";
export type EpaySignType = "MD5" | "RSA";

export interface EpayGatewayConfig {
  id: string;
  name: string;
  enabled: boolean;
  channels: EpayChannel[];
  apiUrl: string;
  pid: string;
  key: string;
  signType: EpaySignType;
  publicKey: string;
  privateKey: string;
  fee: number;
}

export const EPAY_GATEWAYS_KEY = "epay_gateways";

const CHANNEL_LABELS: Record<EpayChannel, string> = {
  alipay: "支付宝",
  wxpay: "微信支付",
};

export function getEpayChannelLabel(channel: EpayChannel) {
  return CHANNEL_LABELS[channel];
}

export function normalizeEpayChannel(value: unknown): EpayChannel {
  return value === "wxpay" ? "wxpay" : "alipay";
}

function normalizeEpayChannels(value: unknown): EpayChannel[] {
  const raw = Array.isArray(value) ? value : [value];
  const channels = raw
    .filter(item => item === "alipay" || item === "wxpay")
    .map(normalizeEpayChannel);
  return Array.from(new Set(channels));
}

export function normalizeEpayGateway(raw: any, index = 0): EpayGatewayConfig {
  const fallbackId = `epay_${Date.now()}_${index}`;
  const id = String(raw?.id || fallbackId).trim() || fallbackId;
  const channels = normalizeEpayChannels(raw?.channels ?? raw?.channel);
  const fee = Number.parseFloat(String(raw?.fee ?? "0"));
  const primaryChannel = channels[0] || "alipay";

  return {
    id,
    name: String(raw?.name || getEpayChannelLabel(primaryChannel)).trim() || getEpayChannelLabel(primaryChannel),
    enabled: raw?.enabled === true || raw?.enabled === "true",
    channels: channels.length > 0 ? channels : [primaryChannel],
    apiUrl: String(raw?.apiUrl || "").trim(),
    pid: String(raw?.pid || "").trim(),
    key: String(raw?.key || ""),
    signType: raw?.signType === "RSA" ? "RSA" : "MD5",
    publicKey: String(raw?.publicKey || ""),
    privateKey: String(raw?.privateKey || ""),
    fee: Number.isFinite(fee) ? fee : 0,
  };
}

export function parseEpayGateways(value?: string | null): EpayGatewayConfig[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEpayGateway);
  } catch {
    return [];
  }
}

export function validateEpayGateways(gateways: EpayGatewayConfig[]) {
  const enabledChannels = new Map<EpayChannel, string>();

  for (const gateway of gateways) {
    if (!gateway.enabled) continue;
    for (const channel of gateway.channels) {
      const existing = enabledChannels.get(channel);
      if (existing) {
        throw new Error(`${getEpayChannelLabel(channel)} 已分配给「${existing}」，不能重复启用`);
      }
      enabledChannels.set(channel, gateway.name);
    }
  }
}

function legacyChannels(config: Record<string, string>) {
  const channels = (config.epay_channels || "alipay,wxpay").split(",").map(item => item.trim()).filter(Boolean);
  return channels.filter((item): item is EpayChannel => item === "alipay" || item === "wxpay");
}

export function buildLegacyEpayGateways(config: Record<string, string>): EpayGatewayConfig[] {
  if (config.epay_enabled !== "true") return [];

  const fee = Number.parseFloat(config.epay_fee || "0");
  return legacyChannels(config).map((channel, index) => ({
    id: `legacy_${channel}`,
    name: getEpayChannelLabel(channel),
    enabled: true,
    channels: [channel],
    apiUrl: config.epay_api_url || "",
    pid: config.epay_pid || "",
    key: config.epay_key || "",
    signType: config.epay_sign_type === "RSA" ? "RSA" : "MD5",
    publicKey: config.epay_public_key || "",
    privateKey: config.epay_private_key || "",
    fee: Number.isFinite(fee) ? fee : 0,
  }));
}

export async function loadEpayGateways() {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          EPAY_GATEWAYS_KEY,
          "epay_enabled",
          "epay_channels",
          "epay_fee",
          "epay_api_url",
          "epay_pid",
          "epay_key",
          "epay_sign_type",
          "epay_public_key",
          "epay_private_key",
        ],
      },
    },
  });

  const config = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const gateways = parseEpayGateways(config[EPAY_GATEWAYS_KEY]);
  if (gateways.length > 0) {
    return gateways;
  }

  return buildLegacyEpayGateways(config);
}

export function resolveEpayGateway(gateways: EpayGatewayConfig[], channelOrGatewayId?: string) {
  const raw = String(channelOrGatewayId || "").trim();
  const id = raw.startsWith("epay:") ? raw.slice("epay:".length).split(":")[0] : raw;

  if (id) {
    const byId = gateways.find(item => item.id === id);
    if (byId) return byId;
    const byChannel = gateways.find(item => item.channels.includes(id as EpayChannel));
    if (byChannel) return byChannel;
  }

  return gateways.find(item => item.enabled);
}

export function resolveEpaySelection(gateways: EpayGatewayConfig[], channelOrGatewayId?: string) {
  const raw = String(channelOrGatewayId || "").trim();
  const parts = raw.startsWith("epay:") ? raw.slice("epay:".length).split(":") : [raw];
  const gatewayId = parts[0] || "";
  const requestedChannel = parts[1] === "wxpay" || parts[1] === "alipay" ? parts[1] : undefined;
  const gateway = resolveEpayGateway(gateways, gatewayId);
  if (!gateway) return null;

  const channel = requestedChannel && gateway.channels.includes(requestedChannel)
    ? requestedChannel
    : gateway.channels[0];

  if (!channel) return null;
  return { gateway, channel };
}
