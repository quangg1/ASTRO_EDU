'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'

/**
 * Mọi thực thể ở tier `point` được vẽ bằng MỘT đối tượng Points (1 draw call),
 * bất kể có 50 hay 20.000 thực thể. Vị trí đọc từ `positionsRef` do ShowcaseEntityLayer tính.
 * Vẫn bấm chọn được: raycast của Points trả về chỉ số điểm.
 */
export function ShowcaseEntityPoints({
  entities,
  positionsRef,
  validPosRef,
  sizePx = 3.5,
  onSelectEntity,
}: {
  entities: ShowcaseOrbitEntity[]
  positionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>
  validPosRef: React.MutableRefObject<Set<string>>
  sizePx?: number
  onSelectEntity?: (id: string) => void
}) {
  const capacity = useMemo(() => Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(1, entities.length)))), [entities.length])
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(capacity * 3), 3))
    g.setDrawRange(0, 0)
    return g
  }, [capacity])
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: sizePx,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    [sizePx],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  // Chỉ số điểm → id thực thể của khung hiện tại (để xử lý click).
  const slotIdsRef = useRef<string[]>([])

  // Màu chỉ đổi khi danh sách đổi; ghi theo thứ tự `entities`, vị trí ghi mỗi khung.
  const colorScratch = useMemo(() => new THREE.Color(), [])
  useEffect(() => {
    const col = geometry.getAttribute('color') as THREE.BufferAttribute
    for (let i = 0; i < entities.length && i < capacity; i++) {
      colorScratch.set(entities[i].color || '#cccccc')
      col.setXYZ(i, colorScratch.r, colorScratch.g, colorScratch.b)
    }
    col.needsUpdate = true
  }, [entities, geometry, capacity, colorScratch])

  useFrame(() => {
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const ids = slotIdsRef.current
    ids.length = 0
    let n = 0
    for (let i = 0; i < entities.length && n < capacity; i++) {
      const e = entities[i]
      if (!validPosRef.current.has(e.id)) continue
      const p = positionsRef.current.get(e.id)
      if (!p) continue
      // Giữ màu khớp với vị trí khi có thực thể bị bỏ qua.
      if (n !== i) {
        const col = geometry.getAttribute('color') as THREE.BufferAttribute
        colorScratch.set(e.color || '#cccccc')
        col.setXYZ(n, colorScratch.r, colorScratch.g, colorScratch.b)
        col.needsUpdate = true
      }
      arr[n * 3] = p.x
      arr[n * 3 + 1] = p.y
      arr[n * 3 + 2] = p.z
      ids.push(e.id)
      n++
    }
    pos.needsUpdate = true
    geometry.setDrawRange(0, n)
    if (n > 0) geometry.computeBoundingSphere()
  })

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      onClick={(e) => {
        if (e.index == null) return
        const id = slotIdsRef.current[e.index]
        if (!id) return
        e.stopPropagation()
        onSelectEntity?.(id)
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    />
  )
}
