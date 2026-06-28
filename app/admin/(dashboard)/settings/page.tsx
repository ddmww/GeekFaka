"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, ShieldCheck, CreditCard, Settings, CheckCircle2, AlertCircle, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

// Define available sub-channels for EPay
const EPAY_SUB_CHANNELS = [
  { id: "alipay", label: "支付宝" },
  { id: "wxpay", label: "微信支付" },
]

type EpayGatewayDraft = {
  id: string
  name: string
  enabled: boolean
  channels: Array<"alipay" | "wxpay">
  apiUrl: string
  pid: string
  key: string
  signType: "MD5" | "RSA"
  publicKey: string
  privateKey: string
  fee: number
}

const emptyEpayGateway = (channel: "alipay" | "wxpay" = "alipay"): EpayGatewayDraft => ({
  id: `epay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: channel === "alipay" ? "支付宝易支付" : "微信易支付",
  enabled: true,
  channels: [channel],
  apiUrl: "",
  pid: "",
  key: "",
  signType: "MD5",
  publicKey: "",
  privateKey: "",
  fee: 0,
})

const normalizeEpayGateway = (raw: any, index: number): EpayGatewayDraft => {
  const legacyChannel = raw?.channel === "wxpay" ? "wxpay" : "alipay"
  const rawChannels = Array.isArray(raw?.channels) ? raw.channels : [raw?.channel || legacyChannel]
  const channels: Array<"alipay" | "wxpay"> = Array.from(new Set(rawChannels.filter((item: unknown): item is "alipay" | "wxpay" => item === "alipay" || item === "wxpay")))
  const fee = Number.parseFloat(String(raw?.fee ?? "0"))
  const primaryChannel = channels[0] || legacyChannel

  return {
    id: String(raw?.id || `epay_${index}_${Date.now()}`),
    name: String(raw?.name || (primaryChannel === "alipay" ? "支付宝易支付" : "微信易支付")),
    enabled: raw?.enabled === true || raw?.enabled === "true",
    channels: channels.length > 0 ? channels : [primaryChannel],
    apiUrl: String(raw?.apiUrl || ""),
    pid: String(raw?.pid || ""),
    key: String(raw?.key || ""),
    signType: raw?.signType === "RSA" ? "RSA" : "MD5",
    publicKey: String(raw?.publicKey || ""),
    privateKey: String(raw?.privateKey || ""),
    fee: Number.isFinite(fee) ? fee : 0,
  }
}

const parseEpayGateways = (config: Record<string, string>): EpayGatewayDraft[] => {
  if (config.epay_gateways) {
    try {
      const parsed = JSON.parse(config.epay_gateways)
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeEpayGateway)
      }
    } catch {
      // Fall back to legacy fields below.
    }
  }

  if (config.epay_enabled !== "true") return [{ ...emptyEpayGateway("alipay"), enabled: false }]

  const channels = (config.epay_channels || "alipay,wxpay").split(",").filter((item): item is "alipay" | "wxpay" => item === "alipay" || item === "wxpay")
  const fee = Number.parseFloat(config.epay_fee || "0")
  return channels.map((channel, index) => normalizeEpayGateway({
    id: `legacy_${channel}`,
    name: channel === "alipay" ? "支付宝易支付" : "微信易支付",
    enabled: true,
    channels: [channel],
    apiUrl: config.epay_api_url,
    pid: config.epay_pid,
    key: config.epay_key,
    signType: config.epay_sign_type,
    publicKey: config.epay_public_key,
    privateKey: config.epay_private_key,
    fee,
  }, index))
}

// Define available providers metadata
const PROVIDERS = [
  {
    id: "epay",
    name: "易支付 (EPay)",
    description: "支持支付宝、微信、QQ钱包的聚合支付接口",
    icon: CreditCard,
    statusKey: "epay_api_url", // Keep for completeness
    enabledKey: "epay_enabled" // New key for explicit toggle
  },
  // Future providers...
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [draftConfig, setDraftConfig] = useState<Record<string, string>>({})
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const epayGateways = parseEpayGateways(draftConfig)

  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    // When dialog opens, reset draft to current config
    if (selectedProvider) {
      setDraftConfig({ ...config })
    }
  }, [selectedProvider, config])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      setConfig(data)
      setDraftConfig(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setDraftConfig(prev => ({ ...prev, [key]: value }))
  }

  const setEpayGateways = (gateways: EpayGatewayDraft[]) => {
    setDraftConfig(prev => ({ ...prev, epay_gateways: JSON.stringify(gateways) }))
  }

  const updateEpayGateway = (id: string, patch: Partial<EpayGatewayDraft>) => {
    setEpayGateways(epayGateways.map(gateway => gateway.id === id ? { ...gateway, ...patch } : gateway))
  }

  const addEpayGateway = () => {
    const used = new Set(epayGateways.filter(item => item.enabled).flatMap(item => item.channels))
    const nextChannel = used.has("alipay") && !used.has("wxpay") ? "wxpay" : "alipay"
    setEpayGateways([...epayGateways, emptyEpayGateway(nextChannel)])
  }

  const removeEpayGateway = (id: string) => {
    const next = epayGateways.filter(gateway => gateway.id !== id)
    setEpayGateways(next.length > 0 ? next : [emptyEpayGateway("alipay")])
  }

  const validateEpayGatewayConflicts = (gateways: EpayGatewayDraft[]) => {
    const enabledChannels = new Map<string, string>()
    for (const gateway of gateways) {
      if (!gateway.enabled) continue
      for (const channel of gateway.channels) {
        const label = EPAY_SUB_CHANNELS.find(item => item.id === channel)?.label || channel
        const existing = enabledChannels.get(channel)
        if (existing) {
          return `${label} 已分配给「${existing}」，不能重复启用`
        }
        enabledChannels.set(channel, gateway.name || label)
      }
    }
    return ""
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Prepare payload: remove empty password
      const payload = { ...draftConfig }
      if (selectedProvider === "epay") {
        const gateways = parseEpayGateways(payload)
        const conflict = validateEpayGatewayConflicts(gateways)
        if (conflict) {
          alert(conflict)
          setSaving(false)
          return
        }
        payload.epay_gateways = JSON.stringify(gateways)
      }
      if (!payload.admin_password) {
        delete payload.admin_password
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      })

      if (res.ok) {
        alert("设置已保存")
        // Clear password field from draft after save for security
        const newDraft = { ...draftConfig }
        delete newDraft.admin_password
        setDraftConfig(newDraft)

        setConfig(newDraft)
        setSelectedProvider(null)
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || "保存失败")
      }
    } catch (error) {
      console.error(error)
      alert("保存出错")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">系统设置</h1>
        <p className="text-muted-foreground">管理支付渠道与站点参数</p>
      </div>

      <Tabs defaultValue="payment" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="payment">支付渠道</TabsTrigger>
          <TabsTrigger value="site">站点设置</TabsTrigger>
          <TabsTrigger value="email">邮件通知</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROVIDERS.map((provider) => {
              const providerGateways = provider.id === "epay" ? parseEpayGateways(config) : []
              const isEnabled = provider.id === "epay" ? providerGateways.some(item => item.enabled) : config[provider.enabledKey] === "true"
              const isConfigured = provider.id === "epay" ? providerGateways.some(item => item.enabled && item.apiUrl && item.pid) : !!config[provider.statusKey]
              const Icon = provider.icon

              return (
                <Card key={provider.id} className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => setSelectedProvider(provider.id)}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{provider.name}</CardTitle>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground h-10 line-clamp-2">
                      {provider.description}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      {isEnabled ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> 已启用
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          已停用
                        </Badge>
                      )}
                      {!isConfigured && (
                        <span className="text-xs text-destructive ml-auto">未配置参数</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>


        <TabsContent value="site" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>站点基础信息</CardTitle>
              <CardDescription>配置网站的全局参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>网站标题</Label>
                <Input
                  value={draftConfig.site_title || ""}
                  onChange={e => handleChange("site_title", e.target.value)}
                  placeholder="GeekFaka - 自动发货平台"
                />
              </div>
              <div className="grid gap-2">
                <Label>网站 URL (用于支付回调)</Label>
                <Input
                  value={draftConfig.site_url || ""}
                  onChange={e => handleChange("site_url", e.target.value)}
                  placeholder="https://your-domain.com"
                />
                <p className="text-xs text-muted-foreground">
                  必须配置正确的域名（包含 https://），否则支付后无法自动发货。
                </p>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4" /> 客服与联系
                </h3>
                <div className="grid gap-2">
                  <Label>网站公告 (首页弹出/顶部显示)</Label>
                  <Textarea
                    value={draftConfig.site_announcement || ""}
                    onChange={e => handleChange("site_announcement", e.target.value)}
                    placeholder="支持 Markdown。例如：🎉 欢迎光临！今日全场 9 折优惠。"
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    该内容将显示在网站首页的显著位置。
                  </p>
                </div>
                <div className="grid gap-2 pt-2">
                  <Label>Crisp Website ID (在线客服)</Label>
                  <Input
                    value={draftConfig.crisp_id || ""}
                    onChange={e => handleChange("crisp_id", e.target.value)}
                    placeholder="e.g. 8d40a5a2-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    在 <a href="https://crisp.chat/" target="_blank" className="underline hover:text-primary">Crisp</a> 注册并获取 Website ID，即可开启右下角在线客服。留空则关闭。
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>底部联系方式</Label>
                  <Textarea
                    value={draftConfig.site_contact_info || ""}
                    onChange={e => handleChange("site_contact_info", e.target.value)}
                    placeholder="支持 Markdown，例如：联系邮箱：`support@example.com`"
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    将显示在网站底部的版权信息下方。
                  </p>
                </div>
              </div>

              <div className="grid gap-2 pt-4 border-t">
                <Label>修改管理员密码</Label>
                <Input
                  type="password"
                  value={draftConfig.admin_password || ""}
                  onChange={e => handleChange("admin_password", e.target.value)}
                  placeholder="留空则不修改"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  设置新密码后，下次登录生效。若留空则保持当前密码不变。
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存配置
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>阿里云邮件推送 (Aliyun Direct Mail) [推荐]</CardTitle>
              <CardDescription>使用阿里云 SMTP 服务发送邮件，国内送达率高。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base">启用阿里云推送</Label>
                  <p className="text-xs text-muted-foreground">优先使用此通道发送邮件</p>
                </div>
                <Switch
                  checked={draftConfig.aliyun_enabled === "true"}
                  onCheckedChange={(checked) => handleChange("aliyun_enabled", String(checked))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>SMTP 地址 (Host)</Label>
                  <Input
                    value={draftConfig.aliyun_smtp_host || "smtpdm.aliyun.com"}
                    onChange={e => handleChange("aliyun_smtp_host", e.target.value)}
                    placeholder="smtpdm.aliyun.com"
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>端口 (Port)</Label>
                  <Input
                    value={draftConfig.aliyun_smtp_port || "465"}
                    onChange={e => handleChange("aliyun_smtp_port", e.target.value)}
                    placeholder="465"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>发信地址 (From Email)</Label>
                <Input
                  value={draftConfig.aliyun_from_email || ""}
                  onChange={e => handleChange("aliyun_from_email", e.target.value)}
                  placeholder="必须与阿里云后台配置的发信地址一致"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>SMTP 账号 (User)</Label>
                  <Input
                    value={draftConfig.aliyun_smtp_user || ""}
                    onChange={e => handleChange("aliyun_smtp_user", e.target.value)}
                    placeholder="例如：admin@mail.example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>SMTP 密码 (Password)</Label>
                  <Input
                    type="password"
                    value={draftConfig.aliyun_smtp_pass || ""}
                    onChange={e => handleChange("aliyun_smtp_pass", e.target.value)}
                    placeholder="在阿里云控制台设置的 SMTP 密码"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存配置
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resend 邮件服务</CardTitle>
              <CardDescription>备用方案：配置订单支付成功后的邮件通知</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base">启用 Resend</Label>
                  <p className="text-xs text-muted-foreground">如果未启用阿里云或阿里云发送失败，将尝试使用此通道</p>
                </div>
                <Switch
                  checked={draftConfig.resend_enabled === "true"}
                  onCheckedChange={(checked) => handleChange("resend_enabled", String(checked))}
                />
              </div>

              <div className="grid gap-2">
                <Label>Resend API Key</Label>
                <Input
                  type="password"
                  value={draftConfig.resend_api_key || ""}
                  onChange={e => handleChange("resend_api_key", e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxx"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  从 <a href="https://resend.com/api-keys" target="_blank" className="underline hover:text-primary">Resend 控制台</a> 获取。
                </p>
              </div>

              <div className="grid gap-2">
                <Label>发件人邮箱 (From Email)</Label>
                <Input
                  value={draftConfig.resend_from_email || ""}
                  onChange={e => handleChange("resend_from_email", e.target.value)}
                  placeholder="notifications@yourdomain.com"
                />
                <p className="text-xs text-muted-foreground">
                  必须是在 Resend 中验证过的域名邮箱。如果是测试环境可填 onboarding@resend.dev。
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存配置
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EPay Configuration Dialog */}
      <Dialog open={selectedProvider === "epay"} onOpenChange={(open) => !open && setSelectedProvider(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>配置易支付 (EPay)</DialogTitle>
            <DialogDescription>
              请输入易支付网关的对接参数。支持彩虹易支付等兼容系统。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {epayGateways.map((gateway, index) => (
              <div key={gateway.id} className="grid gap-4 rounded-lg border p-4 bg-muted/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-base">易支付 #{index + 1}</Label>
                    <p className="text-xs text-muted-foreground">每个支付方式只能分配给一个已启用网关。</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={gateway.enabled}
                      onCheckedChange={(checked) => updateEpayGateway(gateway.id, { enabled: Boolean(checked) })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeEpayGateway(gateway.id)} disabled={epayGateways.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>渠道名称</Label>
                  <Input
                    value={gateway.name}
                    onChange={e => updateEpayGateway(gateway.id, { name: e.target.value })}
                    placeholder="例如：主用易支付 / 微信备用通道"
                  />
                </div>

                <div className="grid gap-3 rounded-lg border p-3">
                  <Label>支持的支付方式</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {EPAY_SUB_CHANNELS.map((sub) => {
                      const isChecked = gateway.channels.includes(sub.id as "alipay" | "wxpay")
                      return (
                        <div key={sub.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`gateway-${gateway.id}-${sub.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const nextChannels = checked
                                ? Array.from(new Set([...gateway.channels, sub.id as "alipay" | "wxpay"]))
                                : gateway.channels.filter(channel => channel !== sub.id)
                              updateEpayGateway(gateway.id, { channels: nextChannels })
                            }}
                          />
                          <Label htmlFor={`gateway-${gateway.id}-${sub.id}`} className="font-normal cursor-pointer">
                            {sub.label}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>交易手续费率 (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="pr-8"
                      value={String(gateway.fee)}
                      onChange={e => updateEpayGateway(gateway.id, { fee: Number.parseFloat(e.target.value || "0") || 0 })}
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>API 接口地址</Label>
                  <Input
                    placeholder="https://pay.example.com/"
                    value={gateway.apiUrl}
                    onChange={e => updateEpayGateway(gateway.id, { apiUrl: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>商户 ID (PID)</Label>
                    <Input
                      value={gateway.pid}
                      onChange={e => updateEpayGateway(gateway.id, { pid: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>签名方式</Label>
                    <Select
                      value={gateway.signType}
                      onValueChange={val => updateEpayGateway(gateway.id, { signType: val as "MD5" | "RSA" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MD5">MD5 (默认)</SelectItem>
                        <SelectItem value="RSA">RSA (推荐)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {gateway.signType === "RSA" ? (
                  <>
                    <div className="grid gap-2">
                      <Label>商户私钥 (Private Key)</Label>
                      <Textarea
                        placeholder="-----BEGIN RSA PRIVATE KEY-----"
                        className="font-mono text-xs h-32"
                        value={gateway.privateKey}
                        onChange={e => updateEpayGateway(gateway.id, { privateKey: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>平台公钥 (Public Key)</Label>
                      <Textarea
                        placeholder="-----BEGIN PUBLIC KEY-----"
                        className="font-mono text-xs h-32"
                        value={gateway.publicKey}
                        onChange={e => updateEpayGateway(gateway.id, { publicKey: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="grid gap-2">
                    <Label>商户密钥 (Key)</Label>
                    <Input
                      type="password"
                      value={gateway.key}
                      onChange={e => updateEpayGateway(gateway.id, { key: e.target.value })}
                    />
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addEpayGateway} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              添加易支付
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProvider(null)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
