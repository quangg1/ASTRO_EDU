'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import {
  fetchAdminShopItems,
  fetchGemEarnConstants,
  fetchGemEconomyMetrics,
  fetchGemRuntimeConfig,
  patchAdminShopItem,
  patchGemRuntimeConfig,
  createAdminShopItem,
  postManualGemAdjust,
  type GemEconomyMetricsDTO,
  type GemRuntimeConfigDTO,
  type ShopItemAdminDTO,
} from '@/features/admin/public'
import { Badge, Button, Card, Input, Tabs, Tab, TabList, TabPanel, Textarea } from '@/design-system'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { labelShopCategoryVi } from '@/features/rewards/public'
import { labelGemReasonCode, labelGemTxnSignVi } from '@/features/admin/public'
import { AdminAvatarDecorationsPanel } from '@/app/admin/gem-economy/AdminAvatarDecorationsPanel'

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const RANGE_DISPLAY: Record<'7d' | '30d', string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
}

export default function AdminGemEconomyPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [tab, setTab] = useState<'metrics' | 'config' | 'shop' | 'decorations' | 'manual' | 'constants'>('metrics')
  const [range, setRange] = useState<'7d' | '30d'>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState<GemEconomyMetricsDTO | null>(null)
  const [config, setConfig] = useState<GemRuntimeConfigDTO | null>(null)
  const [shopItems, setShopItems] = useState<ShopItemAdminDTO[]>([])
  const [earnConstants, setEarnConstants] = useState<Record<string, number> | null>(null)
  const [earnNote, setEarnNote] = useState('')

  const [cfgMult, setCfgMult] = useState('1')
  const [cfgEnds, setCfgEnds] = useState('')
  const [cfgDhCap, setCfgDhCap] = useState('50')
  const [cfgVoucherPct, setCfgVoucherPct] = useState('20')
  const [cfgEditNote, setCfgEditNote] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)

  const [manualUser, setManualUser] = useState('')
  const [manualDelta, setManualDelta] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [manualBusy, setManualBusy] = useState(false)

  const [newSku, setNewSku] = useState({
    skuId: '',
    nameVi: '',
    descriptionVi: '',
    category: 'cosmetic',
    basePriceGem: '10',
  })
  const [shopBusy, setShopBusy] = useState<string | null>(null)

  const refreshAll = useCallback(async () => {
    setError('')
    const [m, c, s, e] = await Promise.all([
      fetchGemEconomyMetrics(range),
      fetchGemRuntimeConfig(),
      fetchAdminShopItems(),
      fetchGemEarnConstants(),
    ])
    setMetrics(m)
    setConfig(c)
    setCfgMult(String(c.seasonalMultiplier ?? 1))
    setCfgEnds(toLocalInputValue(c.seasonalEndsAt))
    setCfgDhCap(String(c.weeklyDeepHistoryCap ?? 50))
    setCfgVoucherPct(String(c.voucherMaxDiscountPct ?? 20))
    setShopItems(s)
    setEarnConstants(e.GEM_EARN)
    setEarnNote(e.note)
  }, [range])

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin/gem-economy')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin/gem-economy')) return
    setLoading(true)
    refreshAll().catch((err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setLoading(false))
  }, [user, refreshAll])

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    setError('')
    try {
      const mult = Number(cfgMult)
      const endsIso =
        mult > 1 && cfgEnds.trim()
          ? new Date(cfgEnds).toISOString()
          : mult > 1
            ? undefined
            : null
      const body: Record<string, unknown> = {
        seasonalMultiplier: mult,
        seasonalEndsAt: mult > 1 ? endsIso : null,
        weeklyDeepHistoryCap: Number(cfgDhCap),
        voucherMaxDiscountPct: Number(cfgVoucherPct),
        editNote: cfgEditNote.trim() || 'Lưu từ trang quản trị kinh tế Gem',
      }
      const saved = await patchGemRuntimeConfig(body)
      setConfig(saved)
      await refreshAll()
      setCfgEditNote('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingConfig(false)
    }
  }

  const handleManual = async () => {
    setManualBusy(true)
    setError('')
    try {
      await postManualGemAdjust({
        targetUserId: manualUser.trim(),
        delta: Number(manualDelta),
        reason: manualReason.trim(),
      })
      setManualUser('')
      setManualDelta('')
      setManualReason('')
      await refreshAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setManualBusy(false)
    }
  }

  const toggleShopVisible = async (row: ShopItemAdminDTO) => {
    setShopBusy(row.skuId)
    setError('')
    try {
      await patchAdminShopItem(row.skuId, {
        visible: !row.visible,
        editNote: 'Bật/tắt hiển thị từ trang quản trị kinh tế Gem',
      })
      await refreshAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setShopBusy(null)
    }
  }

  const handleCreateSku = async () => {
    setShopBusy('__new__')
    setError('')
    try {
      await createAdminShopItem({
        skuId: newSku.skuId.trim(),
        nameVi: newSku.nameVi.trim(),
        descriptionVi: newSku.descriptionVi.trim(),
        category: newSku.category.trim(),
        basePriceGem: Number(newSku.basePriceGem) || 0,
        visible: true,
        editNote: 'Thêm SKU từ Gem Economy admin',
      })
      setNewSku({ skuId: '', nameVi: '', descriptionVi: '', category: 'cosmetic', basePriceGem: '10' })
      await refreshAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setShopBusy(null)
    }
  }

  if (!checked || !user) {
    return (
      <div className="min-h-screen bg-ds-base text-ds-text pt-20 px-4 text-gray-400 flex items-center gap-2">
        <Spinner /> Đang kiểm tra phiên…
      </div>
    )
  }

  if (!canAccessAdminPath(user, '/admin/gem-economy')) return null

  return (
    <div className="min-h-screen bg-ds-base text-ds-text pt-16 px-4 pb-16">
      <main className="max-w-5xl mx-auto">
        <PageHeader
          title="Kinh tế Gem"
          description="Chỉ số, cấu hình vận hành có giới hạn (tầng 2), danh mục cửa hàng (tầng 3), chỉnh gem thủ công kèm nhật ký — chi tiết trong tài liệu docs/plans/gem-rewards-system.md."
          action={
            <div className="flex flex-wrap gap-3">
              <Link href="/admin" className="text-sm text-cyan-400 hover:text-cyan-300">
                ← Quản trị
              </Link>
              <Link href="/gem-shop" className="text-sm text-violet-300 hover:text-violet-200">
                Cửa hàng Gem →
              </Link>
            </div>
          }
        />

        {error && (
          <div className="mt-4 rounded-ds-control border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ds-muted">Khung thời gian chỉ số</span>
          {(['7d', '30d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-ds-control px-3 py-1.5 text-xs border ${
                range === r
                  ? 'border-ds-accent-strong bg-ds-accent-soft text-ds-accent'
                  : 'border-ds-border text-ds-muted hover:border-ds-accent-strong'
              }`}
            >
              {RANGE_DISPLAY[r]}
            </button>
          ))}
          <Button type="button" variant="secondary" className="text-xs" onClick={() => refreshAll()} disabled={loading}>
            Tải lại
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
          <TabList aria-label="Kinh tế Gem" className="flex-wrap">
            <Tab value="metrics">Tổng quan</Tab>
            <Tab value="config">Cấu hình vận hành</Tab>
            <Tab value="shop">Danh mục cửa hàng</Tab>
            <Tab value="decorations">Trang trí avatar</Tab>
            <Tab value="manual">Điều chỉnh gem</Tab>
            <Tab value="constants">GEM_EARN (chỉ đọc)</Tab>
          </TabList>

          <TabPanel value="metrics" current={tab} className="mt-4 space-y-4">
            {loading && !metrics ? (
              <Spinner />
            ) : metrics ? (
              <>
                {metrics.alerts?.length > 0 && (
                  <div className="rounded-ds-control border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
                    {metrics.alerts.map((a) => (
                      <p key={a.code}>{a.message}</p>
                    ))}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <p className="text-xs text-ds-muted uppercase">Tổng gem trong ví (ước)</p>
                    <p className="text-2xl font-semibold text-white mt-1">{metrics.supply.gemBalanceSum.toLocaleString()}</p>
                    <p className="text-xs text-ds-muted mt-1">{metrics.supply.userRewardRows} người có bản ghi ví Gem</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-ds-muted uppercase">Tổng gem đã kiếm (tích lũy)</p>
                    <p className="text-2xl font-semibold text-emerald-300 mt-1">
                      {metrics.supply.totalGemsEarnedLifetimeSum.toLocaleString()}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-ds-muted uppercase">Gem kiếm / ngày (trung bình)</p>
                    <p className="text-2xl font-semibold text-cyan-300 mt-1">{metrics.velocity.earnPerDayAvg}</p>
                    <p className="text-xs text-ds-muted mt-1">Tổng gem kiếm trong cửa sổ: {metrics.velocity.earnTotal}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-ds-muted uppercase">Gem tiêu / ngày (trung bình)</p>
                    <p className="text-2xl font-semibold text-violet-300 mt-1">{metrics.velocity.spendPerDayAvg}</p>
                    <p className="text-xs text-ds-muted mt-1">Tổng gem tiêu trong cửa sổ: {metrics.velocity.spendTotal}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-ds-muted uppercase">Tỉ lệ kiếm / tiêu</p>
                    <p className="text-2xl font-semibold text-white mt-1">
                      {metrics.velocity.earnToSpendRatio != null ? metrics.velocity.earnToSpendRatio : '—'}
                    </p>
                  </Card>
                </div>

                <Card className="p-4 overflow-x-auto">
                  <h3 className="text-sm font-medium text-white mb-3">Top lý do giao dịch (cửa sổ)</h3>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-ds-muted border-b border-white/10">
                        <th className="py-2 pr-4">Lý do</th>
                        <th className="py-2 pr-4">Thu / chi</th>
                        <th className="py-2">Tổng Δ gem</th>
                        <th className="py-2">Số giao dịch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.topReasons.map((r) => (
                        <tr key={`${r._id.reason}-${r._id.sign}`} className="border-b border-white/5 text-ds-muted">
                          <td className="py-2 pr-4 text-white">{labelGemReasonCode(r._id.reason)}</td>
                          <td className="py-2 pr-4">
                            <Badge>{labelGemTxnSignVi(r._id.sign)}</Badge>
                          </td>
                          <td className="py-2">{r.total}</td>
                          <td className="py-2">{r.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            ) : null}
          </TabPanel>

          <TabPanel value="config" current={tab} className="mt-4 space-y-4">
            <Card className="p-4 space-y-4 max-w-lg">
              <p className="text-sm text-ds-muted">
                Hệ số nhân mùa trong khoảng 1–3. Nếu lớn hơn 1 thì phải có thời điểm kết thúc. Trần gem Deep History mỗi tuần: 20–100.
                Phần trăm giảm tối đa cho voucher: 0–20. Ghi đè giá từng mã trong cửa hàng chỉ được cấu hình qua API (mảng
                itemPriceOverrides).
              </p>
              <div>
                <label className="text-xs text-ds-muted block mb-1">Hệ số nhân mùa</label>
                <Input value={cfgMult} onChange={(e) => setCfgMult(e.target.value)} type="number" min={1} max={3} step="0.01" />
              </div>
              <div>
                <label className="text-xs text-ds-muted block mb-1">
                  Kết thúc sự kiện (giờ máy bạn) — bắt buộc nếu hệ số nhân {'>'} 1
                </label>
                <Input value={cfgEnds} onChange={(e) => setCfgEnds(e.target.value)} type="datetime-local" />
              </div>
              <div>
                <label className="text-xs text-ds-muted block mb-1">Trần gem Deep History mỗi tuần (một người)</label>
                <Input value={cfgDhCap} onChange={(e) => setCfgDhCap(e.target.value)} type="number" min={20} max={100} />
              </div>
              <div>
                <label className="text-xs text-ds-muted block mb-1">Giảm giá voucher tối đa (%)</label>
                <Input value={cfgVoucherPct} onChange={(e) => setCfgVoucherPct(e.target.value)} type="number" min={0} max={20} />
              </div>
              <div>
                <label className="text-xs text-ds-muted block mb-1">Ghi chú lần sửa</label>
                <Input value={cfgEditNote} onChange={(e) => setCfgEditNote(e.target.value)} placeholder="Tuỳ chọn" />
              </div>
              <Button type="button" onClick={() => void handleSaveConfig()} disabled={savingConfig}>
                {savingConfig ? 'Đang lưu…' : 'Lưu cấu hình'}
              </Button>
              {config?.updatedAt && (
                <p className="text-xs text-ds-muted">Cập nhật gần nhất trên máy chủ: {new Date(config.updatedAt).toLocaleString('vi-VN')}</p>
              )}
            </Card>
          </TabPanel>

          <TabPanel value="decorations" current={tab} className="mt-4">
            <AdminAvatarDecorationsPanel />
          </TabPanel>

          <TabPanel value="shop" current={tab} className="mt-4 space-y-6">
            <Card className="p-4 overflow-x-auto">
              <h3 className="text-sm font-medium text-white mb-3">Mã hàng hiện có</h3>
              <table className="w-full text-xs text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="text-ds-muted border-b border-white/10">
                    <th className="py-2 pr-3">Mã SKU</th>
                    <th className="py-2 pr-3">Tên</th>
                    <th className="py-2 pr-3">Nhóm</th>
                    <th className="py-2 pr-3">Giá gốc (gem)</th>
                    <th className="py-2">Hiển thị</th>
                  </tr>
                </thead>
                <tbody>
                  {shopItems.map((row) => (
                    <tr key={row.skuId} className="border-b border-white/5">
                      <td className="py-2 pr-3 font-mono text-cyan-200">{row.skuId}</td>
                      <td className="py-2 pr-3 text-white">{row.nameVi || '—'}</td>
                      <td className="py-2 pr-3">
                        <Badge>{labelShopCategoryVi(row.category)}</Badge>
                      </td>
                      <td className="py-2 pr-3">{row.basePriceGem}</td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => void toggleShopVisible(row)}
                          disabled={shopBusy === row.skuId}
                          className="text-cyan-400 hover:underline disabled:opacity-50"
                        >
                          {row.visible ? 'Ẩn' : 'Hiện'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shopItems.length === 0 && <p className="text-sm text-ds-muted mt-3">Chưa có mã hàng trong cơ sở dữ liệu.</p>}
            </Card>

            <Card className="p-4 space-y-3 max-w-md">
              <h3 className="text-sm font-medium text-white">Thêm mã hàng (bản tối thiểu)</h3>
              <p className="text-xs text-ds-muted leading-relaxed">
                Một dòng SKU là <strong className="text-slate-300">định nghĩa mặt hàng</strong> trong catalogue (giá Gem, nhóm, mã không trùng). Người
                học thấy ở Cửa hàng Gem chủ yếu qua <strong className="text-slate-300">tên + mô tả</strong> bên dưới. Nút{' '}
                <strong className="text-slate-300">«Sắp mở mua»</strong> là tạm: luồng trừ gem và{' '}
                <strong className="text-slate-300">cấp quyền lợi thật</strong> (trang phục/voucher…) sẽ nối theo{' '}
                <strong className="text-slate-300">SKU + nhóm + metadata</strong> sau — giờ bạn chỉ đang lấp chỗ trong kế hoạch.
              </p>
              <Input value={newSku.skuId} onChange={(e) => setNewSku((s) => ({ ...s, skuId: e.target.value }))} placeholder="Mã SKU" />
              <Input value={newSku.nameVi} onChange={(e) => setNewSku((s) => ({ ...s, nameVi: e.target.value }))} placeholder="Tên hiển thị" />
              <div>
                <label className="text-xs text-ds-muted block mb-1">Mô tả (hiển thị ở cửa hàng)</label>
                <Textarea
                  value={newSku.descriptionVi}
                  onChange={(e) => setNewSku((s) => ({ ...s, descriptionVi: e.target.value }))}
                  placeholder="Ví dụ: Viền avatar theo chủ đề thiên văn · hiệu ứng chỉ trong ứng dụng…"
                  rows={3}
                />
              </div>
              <Input
                value={newSku.category}
                onChange={(e) => setNewSku((s) => ({ ...s, category: e.target.value }))}
                placeholder='Nhóm (ví dụ: cosmetic, seasonal)'
              />
              <Input
                value={newSku.basePriceGem}
                onChange={(e) => setNewSku((s) => ({ ...s, basePriceGem: e.target.value }))}
                type="number"
                min={0}
                placeholder="Giá gem"
              />
              <Button type="button" onClick={() => void handleCreateSku()} disabled={shopBusy === '__new__'}>
                Tạo mã hàng
              </Button>
            </Card>
          </TabPanel>

          <TabPanel value="manual" current={tab} className="mt-4">
            <Card className="p-4 space-y-3 max-w-md">
              <p className="text-sm text-ds-muted">
                Một lần tối đa ±500 gem. Mọi thay đổi được ghi nhật ký — xem tại{' '}
                <Link href="/admin/audit?source=gem" className="text-cyan-400 hover:underline">
                  Nhật ký vận hành
                </Link>
                .
              </p>
              <Input value={manualUser} onChange={(e) => setManualUser(e.target.value)} placeholder="ID người dùng (MongoDB)" />
              <Input
                value={manualDelta}
                onChange={(e) => setManualDelta(e.target.value)}
                type="number"
                placeholder="Thay đổi số gem (+ hoặc −)"
              />
              <Textarea value={manualReason} onChange={(e) => setManualReason(e.target.value)} placeholder="Lý do (bắt buộc)" rows={3} />
              <Button type="button" onClick={() => void handleManual()} disabled={manualBusy}>
                {manualBusy ? 'Đang xử lý…' : 'Áp dụng'}
              </Button>
            </Card>
          </TabPanel>

          <TabPanel value="constants" current={tab} className="mt-4">
            <Card className="p-4">
              <p className="text-sm text-ds-muted mb-4">{earnNote}</p>
              {earnConstants ? (
                <ul className="font-mono text-sm text-cyan-100 space-y-1">
                  {Object.entries(earnConstants).map(([k, v]) => (
                    <li key={k}>
                      {k}: <span className="text-white">{v}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Spinner />
              )}
            </Card>
          </TabPanel>
        </Tabs>
      </main>
    </div>
  )
}
