'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { getNumericId } from '@/lib/a2ToNum'
import styles from './WorldMap.module.css'

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

const NUM_TO_CODE: Record<number, string> = {
  4: 'af', 8: 'al', 12: 'dz', 20: 'ad', 24: 'ao', 28: 'ag', 32: 'ar', 51: 'am',
  36: 'au', 40: 'at', 31: 'az', 44: 'bs', 48: 'bh', 50: 'bd', 52: 'bb', 112: 'by',
  56: 'be', 84: 'bz', 204: 'bj', 64: 'bt', 68: 'bo', 70: 'ba', 72: 'bw', 76: 'br',
  96: 'bn', 100: 'bg', 854: 'bf', 108: 'bi', 132: 'cv', 116: 'kh', 120: 'cm', 124: 'ca',
  140: 'cf', 148: 'td', 152: 'cl', 156: 'cn', 170: 'co', 174: 'km', 178: 'cg', 180: 'cd',
  188: 'cr', 191: 'hr', 192: 'cu', 531: 'cw', 196: 'cy', 203: 'cz', 384: 'ci', 208: 'dk',
  262: 'dj', 212: 'dm', 214: 'do', 218: 'ec', 818: 'eg', 222: 'sv', 226: 'gq', 232: 'er',
  233: 'ee', 748: 'sz', 231: 'et', 242: 'fj', 246: 'fi', 250: 'fr', 266: 'ga', 270: 'gm',
  268: 'ge', 276: 'de', 288: 'gh', 300: 'gr', 304: 'gl', 308: 'gd', 320: 'gt', 324: 'gn',
  624: 'gw', 328: 'gy', 332: 'ht', 336: 'va', 340: 'hn', 348: 'hu', 352: 'is', 356: 'in',
  360: 'id', 364: 'ir', 368: 'iq', 372: 'ie', 376: 'il', 380: 'it', 388: 'jm', 392: 'jp',
  400: 'jo', 398: 'kz', 404: 'ke', 296: 'ki', 408: 'kp', 410: 'kr', 414: 'kw', 417: 'kg',
  418: 'la', 428: 'lv', 422: 'lb', 426: 'ls', 430: 'lr', 434: 'ly', 438: 'li', 440: 'lt',
  442: 'lu', 450: 'mg', 454: 'mw', 458: 'my', 462: 'mv', 466: 'ml', 470: 'mt', 584: 'mh',
  478: 'mr', 480: 'mu', 484: 'mx', 583: 'fm', 498: 'md', 492: 'mc', 496: 'mn', 499: 'me',
  504: 'ma', 508: 'mz', 104: 'mm', 516: 'na', 520: 'nr', 524: 'np', 528: 'nl', 554: 'nz',
  558: 'ni', 562: 'ne', 566: 'ng', 807: 'mk', 578: 'no', 512: 'om', 586: 'pk', 585: 'pw',
  275: 'ps', 591: 'pa', 598: 'pg', 600: 'py', 604: 'pe', 608: 'ph', 616: 'pl', 620: 'pt',
  634: 'qa', 642: 'ro', 643: 'ru', 646: 'rw', 659: 'kn', 662: 'lc', 670: 'vc', 882: 'ws',
  674: 'sm', 678: 'st', 682: 'sa', 686: 'sn', 688: 'rs', 690: 'sc', 694: 'sl', 702: 'sg',
  703: 'sk', 705: 'si', 90: 'sb', 706: 'so', 710: 'za', 728: 'ss', 724: 'es', 144: 'lk',
  729: 'sd', 740: 'sr', 752: 'se', 756: 'ch', 760: 'sy', 158: 'tw', 762: 'tj', 834: 'tz',
  764: 'th', 626: 'tl', 768: 'tg', 776: 'to', 780: 'tt', 788: 'tn', 792: 'tr', 795: 'tm',
  798: 'tv', 800: 'ug', 804: 'ua', 784: 'ae', 826: 'gb', 840: 'us', 858: 'uy', 860: 'uz',
  548: 'vu', 862: 've', 704: 'vn', 887: 'ye', 894: 'zm', 716: 'zw', 383: 'xk',
}

let codeToNameCache: Record<string, string> | null = null

interface VB { x: number; y: number; w: number; h: number }
const FULL_VB: VB = { x: 0, y: 0, w: 960, h: 560 }

interface WorldMapProps {
  onGuess: (name: string) => void
  guessedCountries: string[]
  correctCode?: string
  allCountries: Array<{ name: string; code: string }>
}

export default function WorldMap({ onGuess, guessedCountries, correctCode, allCountries }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [paths, setPaths] = useState<Array<{ id: string; d: string; code: string }>>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null)
  const [vb, setVb] = useState<VB>(FULL_VB)
  const [panning, setPanning] = useState(false)

  const vbRef = useRef<VB>(FULL_VB)
  const dragRef = useRef<{ cx: number; cy: number; vb: VB } | null>(null)
  const didDragRef = useRef(false)

  useEffect(() => { vbRef.current = vb }, [vb])

  useEffect(() => {
    if (allCountries.length > 0 && !codeToNameCache) {
      codeToNameCache = {}
      for (const c of allCountries) codeToNameCache[c.code] = c.name
    }
  }, [allCountries])

  useEffect(() => {
    let cancelled = false
    fetch(WORLD_ATLAS_URL)
      .then(r => r.json())
      .then(topo => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geojson = feature(topo, (topo as any).objects.countries) as any
        const projection = geoNaturalEarth1().scale(150).translate([480, 280])
        const pathGen = geoPath(projection)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const computed = geojson.features.map((f: any) => ({
          id: String(f.id),
          d: pathGen(f) ?? '',
          code: NUM_TO_CODE[Number(f.id)] ?? '',
        }))
        setPaths(computed)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Non-passive wheel listener for zoom
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const curr = vbRef.current
      const svgX = curr.x + (e.clientX - rect.left) / rect.width * curr.w
      const svgY = curr.y + (e.clientY - rect.top) / rect.height * curr.h
      const factor = e.deltaY > 0 ? 1.25 : 0.8
      const nw = Math.min(Math.max(curr.w * factor, 80), FULL_VB.w)
      const nh = nw * (FULL_VB.h / FULL_VB.w)
      const nx = svgX - (svgX - curr.x) * (nw / curr.w)
      const ny = svgY - (svgY - curr.y) * (nh / curr.h)
      setVb({
        x: Math.max(0, Math.min(nx, FULL_VB.w - nw)),
        y: Math.max(0, Math.min(ny, FULL_VB.h - nh)),
        w: nw,
        h: nh,
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  function clampVb(v: VB): VB {
    return {
      x: Math.max(0, Math.min(v.x, FULL_VB.w - v.w)),
      y: Math.max(0, Math.min(v.y, FULL_VB.h - v.h)),
      w: v.w,
      h: v.h,
    }
  }

  function handleZoomIn() {
    setVb(prev => {
      const cx = prev.x + prev.w / 2
      const cy = prev.y + prev.h / 2
      const nw = Math.max(prev.w / 2, 80)
      const nh = nw * (FULL_VB.h / FULL_VB.w)
      return clampVb({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh })
    })
  }

  function handleZoomOut() {
    setVb(prev => {
      const cx = prev.x + prev.w / 2
      const cy = prev.y + prev.h / 2
      const nw = Math.min(prev.w * 2, FULL_VB.w)
      const nh = Math.min(prev.h * 2, FULL_VB.h)
      return clampVb({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh })
    })
  }

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    didDragRef.current = false
    dragRef.current = { cx: e.clientX, cy: e.clientY, vb: { ...vb } }
    setPanning(true)
  }

  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.cx
    const dy = e.clientY - dragRef.current.cy
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true
    if (!didDragRef.current) return
    const rect = svgRef.current!.getBoundingClientRect()
    const svgDx = (dx / rect.width) * dragRef.current.vb.w
    const svgDy = (dy / rect.height) * dragRef.current.vb.h
    setVb(clampVb({
      x: dragRef.current.vb.x - svgDx,
      y: dragRef.current.vb.y - svgDy,
      w: dragRef.current.vb.w,
      h: dragRef.current.vb.h,
    }))
    setTooltip(null)
  }

  function handleSvgMouseUp() {
    dragRef.current = null
    setPanning(false)
  }

  const handlePathClick = useCallback((code: string) => {
    if (didDragRef.current) return
    if (!code || !codeToNameCache) return
    const name = codeToNameCache[code]
    if (name) onGuess(name)
  }, [onGuess])

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGPathElement>, code: string) => {
      if (didDragRef.current) return
      if (!code || !codeToNameCache) return
      const name = codeToNameCache[code]
      if (!name) return
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip({ name, x: e.clientX - rect.left, y: e.clientY - rect.top })
    },
    []
  )

  const handleMouseMoveOnPath = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      if (didDragRef.current) return
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
    },
    []
  )

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading} aria-live="polite">Loading map…</div>
      </div>
    )
  }

  const guessedSet = new Set(guessedCountries)
  const correctNumId = correctCode ? getNumericId(correctCode) : undefined
  const isZoomed = vb.w < FULL_VB.w * 0.99
  const zoomPct = Math.round(FULL_VB.w / vb.w * 100)

  return (
    <div className={styles.container}>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className={styles.svg}
        style={{ cursor: panning ? 'grabbing' : isZoomed ? 'grab' : 'crosshair' }}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
        aria-label="World map — click a country to guess"
        role="img"
      >
        {paths.map(({ id, d, code }) => {
          const numId = Number(id)
          const isCorrect = correctNumId != null && numId === correctNumId
          const isWrong = code ? guessedSet.has(code) : false

          let cls = styles.country
          if (isCorrect) cls = styles.countryCorrect
          else if (isWrong) cls = styles.countryWrong

          return (
            <path
              key={id}
              d={d}
              className={cls}
              onClick={() => !isCorrect && !isWrong && handlePathClick(code)}
              onMouseEnter={(e) => handleMouseEnter(e, code)}
              onMouseMove={handleMouseMoveOnPath}
              onMouseLeave={handleMouseLeave}
              tabIndex={isCorrect || isWrong ? -1 : 0}
              role="button"
              aria-label={codeToNameCache?.[code] ?? `Country ${id}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!isCorrect && !isWrong) handlePathClick(code)
                }
              }}
            />
          )
        })}
      </svg>

      {tooltip && !panning && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x, top: tooltip.y }}
          aria-hidden="true"
        >
          {tooltip.name}
        </div>
      )}

      <div className={styles.controls} aria-label="Map zoom controls">
        <button className={styles.zoomBtn} onClick={handleZoomIn} type="button" aria-label="Zoom in" title="Zoom in">+</button>
        {isZoomed && <span className={styles.zoomLevel} aria-live="polite">{zoomPct}%</span>}
        <button
          className={`${styles.zoomBtn}${!isZoomed ? ` ${styles.zoomBtnDisabled}` : ''}`}
          onClick={handleZoomOut}
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={!isZoomed}
        >−</button>
        {isZoomed && (
          <button
            className={`${styles.zoomBtn} ${styles.zoomBtnReset}`}
            onClick={() => setVb(FULL_VB)}
            type="button"
            aria-label="Reset zoom"
            title="Reset zoom"
          >↺</button>
        )}
      </div>

      <p className={styles.hint}>
        {isZoomed
          ? 'Drag to pan · scroll to zoom · click to guess'
          : 'Click a country to guess · scroll or + to zoom in'}
      </p>
    </div>
  )
}
