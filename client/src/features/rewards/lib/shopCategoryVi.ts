/** Nhãn tiếng Việt cho `ShopItem.category` (giữ khóa gốc khi không khớp). */
export function labelShopCategoryVi(cat: string): string {
  const m: Record<string, string> = {
    cosmetic: 'Trang trí',
    avatar_decoration: 'Trang trí avatar',
    seasonal: 'Theo mùa',
    voucher: 'Voucher',
    lp_convenience: 'Tiện ích lộ trình',
    showcase_unlock: 'Mở nội dung showcase',
    coach_burst: 'Hỗ trợ Coach',
    agent: 'Agent (dự trữ)',
  }
  return m[cat] ?? cat
}
