'use client'

import { useEffect, useRef } from 'react'
import { getNumericId } from '@/lib/a2ToNum'
import styles from './AtlasRushGame.module.css'

interface ShapeCanvasProps {
  countryCode: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  worldFeatures: any[] | null
}

export default function ShapeCanvas({ countryCode, worldFeatures }: ShapeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !worldFeatures) return

    const numericId = getNumericId(countryCode)
    if (numericId == null) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feature = worldFeatures.find((f: any) => Number(f.id) === numericId)
    if (!feature) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.offsetWidth || 320
    const H = canvas.offsetHeight || 200
    canvas.width = W
    canvas.height = H

    ctx.clearRect(0, 0, W, H)

    // Collect all coordinate rings
    const allCoords: [number, number][] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function collectCoords(geom: any) {
      if (!geom) return
      if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates) allCoords.push(...ring)
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates)
          for (const ring of poly) allCoords.push(...ring)
      }
    }
    collectCoords(feature.geometry)

    if (allCoords.length === 0) return

    // Find bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const [x, y] of allCoords) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    const padding = 20
    const scaleX = (W - padding * 2) / (maxX - minX || 1)
    const scaleY = (H - padding * 2) / (maxY - minY || 1)
    const scale = Math.min(scaleX, scaleY)

    const offsetX = padding + ((W - padding * 2) - (maxX - minX) * scale) / 2
    const offsetY = padding + ((H - padding * 2) - (maxY - minY) * scale) / 2

    function project(x: number, y: number): [number, number] {
      return [
        offsetX + (x - minX) * scale,
        H - (offsetY + (y - minY) * scale), // flip Y
      ]
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function drawPolygon(rings: [number, number][][]) {
      ctx!.beginPath()
      for (const ring of rings) {
        if (ring.length === 0) continue
        const [fx, fy] = project(ring[0][0], ring[0][1])
        ctx!.moveTo(fx, fy)
        for (let i = 1; i < ring.length; i++) {
          const [px, py] = project(ring[i][0], ring[i][1])
          ctx!.lineTo(px, py)
        }
        ctx!.closePath()
      }
    }

    ctx.shadowColor = 'rgba(126,184,212,0.4)'
    ctx.shadowBlur = 18
    ctx.fillStyle = '#7eb8d4'
    ctx.strokeStyle = 'rgba(126,184,212,0.7)'
    ctx.lineWidth = 1

    if (feature.geometry.type === 'Polygon') {
      drawPolygon(feature.geometry.coordinates)
    } else if (feature.geometry.type === 'MultiPolygon') {
      for (const poly of feature.geometry.coordinates) {
        drawPolygon(poly)
      }
    }

    ctx.fill('evenodd')
    ctx.shadowBlur = 0
    ctx.stroke()
  }, [countryCode, worldFeatures])

  if (!worldFeatures) {
    return (
      <div className={styles.shapeLoading} aria-label="Loading country shape">
        <span className={styles.shapeLoadingDot} />
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className={styles.shapeCanvas}
      aria-label={`Silhouette of the mystery country`}
      role="img"
    />
  )
}
