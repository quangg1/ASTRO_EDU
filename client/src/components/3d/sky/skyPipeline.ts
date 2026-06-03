/**
 * Pipeline bầu trời thống nhất (đối chiếu Stellarium).
 *
 * 1. Observer (lat, lon, time) → Alt-Az mọi đối tượng (`skyObserver` + astronomy-engine)
 * 2. SkyViewState (viewAz, viewAlt) → ma trìx hướng nhìn (`skyViewState`)
 * 3. Cube render các layer → stereographic 185° (`FisheyeCubeRenderer`)
 * 4. Overlay HTML nhãn theo cùng projection (`skyScreenProject`)
 *
 * Thứ tự vẽ trong cube: `skyLayers.SKY_RENDER_ORDER`
 */

export { SKY_RENDER_ORDER } from './skyLayers'
