'use client'

import { useRef, useEffect } from 'react'
import styles from './ChainViz.module.css'

interface ChainVizProps {
  words: string[]
  totalSteps: number
  pendingWord?: string
  done?: boolean
  won?: boolean
}

const NODE_W = 96
const NODE_H = 38
const NODE_GAP = 48
const PADDING_X = 16
const PADDING_Y = 28
const SVG_HEIGHT = NODE_H + PADDING_Y * 2 + 16

export default function ChainViz({
  words,
  totalSteps,
  pendingWord,
  done = false,
  won = false,
}: ChainVizProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Total visible nodes: words + optional pending
  const allNodes: { label: string; kind: 'start' | 'done' | 'current' | 'pending' }[] = words.map(
    (w, i) => ({
      label: w,
      kind: i === 0 ? 'start' : i === words.length - 1 && !done ? 'done' : 'done',
    }),
  )

  if (pendingWord && !done) {
    allNodes.push({ label: pendingWord, kind: 'pending' })
  }

  // Mark the last word as "current" if not done and no pending
  if (!done && !pendingWord && allNodes.length > 1) {
    allNodes[allNodes.length - 1].kind = 'done'
  }

  const nodeCount = allNodes.length
  const svgWidth = Math.max(
    PADDING_X * 2 + nodeCount * NODE_W + (nodeCount - 1) * NODE_GAP,
    300,
  )

  // Auto-scroll to the right when chain grows
  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollLeft = wrapperRef.current.scrollWidth
    }
  }, [words.length, pendingWord])

  const nodeX = (i: number) => PADDING_X + i * (NODE_W + NODE_GAP)
  const nodeY = PADDING_Y + 16
  const nodeCX = (i: number) => nodeX(i) + NODE_W / 2
  const nodeCY = nodeY + NODE_H / 2

  return (
    <div ref={wrapperRef} className={styles.wrapper} aria-hidden="true">
      <svg
        className={styles.svg}
        width={svgWidth}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
      >
        <defs>
          <marker
            id="arrow-default"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" className={styles.arrowHead} />
          </marker>
          <marker
            id="arrow-done"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" className={styles.arrowHeadDone} />
          </marker>
          <marker
            id="arrow-won"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" className={styles.arrowHeadWon} />
          </marker>
        </defs>

        {/* Connectors */}
        {allNodes.map((node, i) => {
          if (i === 0) return null
          const prev = allNodes[i - 1]
          const x1 = nodeX(i - 1) + NODE_W
          const x2 = nodeX(i)
          const cy = nodeCY

          const isWon = done && won
          const isDone = prev.kind !== 'pending' && node.kind !== 'pending'

          let connClass = styles.connector
          let markerId = 'arrow-default'
          if (isWon) {
            connClass = `${styles.connector} ${styles.connectorWon}`
            markerId = 'arrow-won'
          } else if (isDone && !done) {
            connClass = `${styles.connector} ${styles.connectorDone}`
            markerId = 'arrow-done'
          } else if (done && !won) {
            connClass = styles.connector
          }

          return (
            <line
              key={`conn-${i}`}
              x1={x1}
              y1={cy}
              x2={x2 - 8}
              y2={cy}
              className={connClass}
              markerEnd={`url(#${markerId})`}
            />
          )
        })}

        {/* Nodes */}
        {allNodes.map((node, i) => {
          const x = nodeX(i)
          const y = nodeY
          const cx = nodeCX(i)
          const isNewest = i === allNodes.length - 1 && i > 0
          const isWon = done && won

          let rectClass = styles.node
          let labelClass = styles.nodeLabel
          let animClass = isNewest && !done ? styles.nodeNew : ''

          if (node.kind === 'start') {
            rectClass = `${styles.node} ${styles.nodeStart}`
            labelClass = `${styles.nodeLabel} ${styles.nodeLabelStart}`
          } else if (node.kind === 'pending') {
            rectClass = `${styles.node} ${styles.nodeGhost}`
            labelClass = `${styles.nodeLabel} ${styles.nodeLabelGhost}`
          } else if (isWon) {
            rectClass = `${styles.node} ${styles.nodeWon}`
            labelClass = `${styles.nodeLabel} ${styles.nodeLabelWon}`
          } else if (done && !won && i === allNodes.length - 1) {
            rectClass = `${styles.node} ${styles.nodeLost}`
            labelClass = `${styles.nodeLabel} ${styles.nodeLabelLost}`
          } else if (node.kind === 'done' || node.kind === 'current') {
            rectClass = `${styles.node} ${styles.nodeDone}`
            labelClass = `${styles.nodeLabel} ${styles.nodeLabelDone}`
          }

          // Truncate label if too long
          const maxLen = 10
          const displayLabel =
            node.label.length > maxLen ? node.label.slice(0, maxLen - 1) + '…' : node.label

          return (
            <g key={`node-${i}`} className={animClass}>
              {/* Step index label above */}
              {i === 0 && (
                <text x={cx} y={y - 8} className={styles.stepLabel}>
                  START
                </text>
              )}
              {i > 0 && i < allNodes.length - 1 && node.kind !== 'pending' && !done && (
                <text x={cx} y={y - 8} className={styles.stepLabel}>
                  STEP {i}
                </text>
              )}
              {done && i === allNodes.length - 1 && (
                <text x={cx} y={y - 8} className={styles.stepLabel}>
                  {won ? 'TARGET ✓' : 'TARGET'}
                </text>
              )}
              {!done && i === allNodes.length - 1 && node.kind !== 'pending' && i > 0 && (
                <text x={cx} y={y - 8} className={styles.stepLabel}>
                  STEP {i}
                </text>
              )}
              {node.kind === 'pending' && (
                <text x={cx} y={y - 8} className={styles.stepLabel}>
                  ?
                </text>
              )}

              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                ry={8}
                className={rectClass}
              />
              <text x={cx} y={nodeCY} className={labelClass}>
                {displayLabel}
              </text>
            </g>
          )
        })}

        {/* Target ghost node (always shown, beyond current chain) */}
        {!done && (() => {
          const targetIdx = totalSteps + 1
          if (allNodes.length < targetIdx) {
            const x = nodeX(targetIdx - 1)
            const y = nodeY
            const cx = nodeCX(targetIdx - 1)
            return (
              <g key="target-ghost">
                {/* dashed line from last current node */}
                <line
                  x1={nodeX(allNodes.length - 1) + NODE_W}
                  y1={nodeCY}
                  x2={x - 4}
                  y2={nodeCY}
                  className={styles.connector}
                  strokeDasharray="4 4"
                  markerEnd="url(#arrow-default)"
                />
                <text x={cx} y={y - 8} className={styles.stepLabel}>
                  TARGET
                </text>
                <rect
                  x={x}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  ry={8}
                  className={`${styles.node} ${styles.nodeGhost}`}
                />
                <text x={cx} y={nodeCY} className={`${styles.nodeLabel} ${styles.nodeLabelGhost}`}>
                  ?
                </text>
              </g>
            )
          }
          return null
        })()}
      </svg>
    </div>
  )
}
