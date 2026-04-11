/**
 * Cockpit: tàu nhỏ trong không gian **rộng** (khác hẳn Observer),
 * không quỹ đạo / không đèn Mặt Trời — hành tinh tự sáng (map texture).
 */
/** Mesh tàu so với thế giới (Observer units × adventure scale). */
export const COCKPIT_SHIP_VISUAL_SCALE = 0.055
/**
 * Phóng to toàn bộ “bản đồ phiêu lưu” so với Observer — xa gần rõ, chuyến bay dài hơn.
 * Lưu vị trí tàu vẫn chuẩn hoá về đơn vị Observer.
 */
export const COCKPIT_ADVENTURE_SCALE = 3.35
/** Hơi phóng bán kính mesh so với quỹ đã scale (góc nhìn đẹp hơn). */
export const COCKPIT_PLANET_RADIUS_BOOST = 1.06
/** Tốc độ tiếp cận (thế giới đã phóng to). */
export const COCKPIT_JOURNEY_SPEED_MULT = 2.35
/** Sương mù theo khoảng cách — tạo chiều sâu (mật độ theo world đã scale). */
export const COCKPIT_FOG_EXP_DENSITY = 0.00042
/** Tự quay khi đang bay. */
export const COCKPIT_SPIN_TRANSIT = 0.01
/** Tự quay khi neo / target lock. */
export const COCKPIT_SPIN_AT_LOCK = 0.032

export const COCKPIT_BODY_SCALE = COCKPIT_ADVENTURE_SCALE * COCKPIT_PLANET_RADIUS_BOOST

/**
 * Khung Target lock nằm ở viewport phía trên — tâm khung cao hơn tâm canvas (~50% chiều cao).
 * Dịch camera theo hướng “lên màn hình” (vuông góc tầm nhìn), không chỉ world Y.
 * Giá trị ~0.22–0.30 = phần chiều cao màn hình cần đẩy tâm hành tinh lên (tỉ lệ trên cạnh nhìn dọc).
 */
export const COCKPIT_DOCK_FRAC_OF_SCREEN_HEIGHT = 0.46

/** Neo cockpit: xa hơn một chút để đĩa hành tinh vừa ô Target lock (canvas nhỏ). */
export const COCKPIT_HOLD_PAD_RADIUS_MULT = 1.92
export const COCKPIT_HOLD_PAD_EXTRA = 0.62

/** FOV khi neo đích — gần bằng cruise để hành tinh không chiếm hết khung dọc (lerp mỗi frame). */
export const COCKPIT_DOCK_FOV = 62
/** FOV bay thường trong cockpit. */
export const COCKPIT_CRUISE_FOV = 62
