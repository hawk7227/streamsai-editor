"use client"

import React from 'react'
import type { Conflict, ConflictReport, ConflictSide } from '@/lib/conflict-engine'
import type { ParsedGuidance } from '@/lib/guidance-parser'

const C = {
  bg:        '#02050b',
  overlay:   'rgba(0,0,0,0.75)',
  surface:   '#080d18',
  surfaceHi: '#0d1525',
  border:    'rgba(255,255,255,0.08)',
  borderHi:  'rgba(255,255,255,0.14)',
  accent:    '#44c3a6',
  accentDim: 'rgba(68,195,166,0.12)',
  accentBdr: 'rgba(68,195,166,0.30)',
  text:      '#e8f0ff',
  textDim:   'rgba(255,255,255,0.50)',
  textFaint: 'rgba(255,255,255,0.25)',
  danger:    '#ef4444',
  dangerDim: 'rgba(239,68,68,0.12)',
  dangerBdr: 'rgba(239,68,68,0.30)',
  warn:      '#f59e0b',
  warnDim:   'rgba(245,158,11,0.12)',
  warnBdr:   'rgba(245,158,11,0.30)',
  done:      '#22c55e',
  doneDim:   'rgba(34,197,94,0.12)',
  doneBdr:   'rgba(34,197,94,0.30)',
  purple:    '#8b5cf6',
}

interface Props {
  report: ConflictReport
  guidance: ParsedGuidance
  onResolve: (conflictId: string, side: ConflictSide) => void
  onResolveAll: (side: ConflictSide) => void
  onDismiss: () => void
  onRunAnyway?: () => void  // only shown if all hard conflicts resolved
}

export function ConflictModal({
  report,
  guidance,
  onResolve,
  onResolveAll,
  onDismiss,
  onRunAnyway,
}: Props) {
  const { conflicts, unresolvedCount, hardUnresolvedCount, canRun } = report

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: C.overlay,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 680,
        maxHeight: '88vh',
        background: C.surface,
        border: `1px solid ${hardUnresolvedCount > 0 ? C.dangerBdr : C.warnBdr}`,
        borderRadius: 16,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${C.border}`,
          background: hardUnresolvedCount > 0 ? C.dangerDim : C.warnDim,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{hardUnresolvedCount > 0 ? '⚠' : '◉'}</span>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  color: hardUnresolvedCount > 0 ? C.danger : C.warn,
                }}>
                  {hardUnresolvedCount > 0
                    ? `${hardUnresolvedCount} Hard Conflict${hardUnresolvedCount > 1 ? 's' : ''} — Run Blocked`
                    : `${unresolvedCount} Conflict${unresolvedCount !== 1 ? 's' : ''} Detected`}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                  padding: '2px 7px', borderRadius: 999,
                  background: hardUnresolvedCount > 0 ? C.dangerDim : C.warnDim,
                  border: `1px solid ${hardUnresolvedCount > 0 ? C.dangerBdr : C.warnBdr}`,
                  color: hardUnresolvedCount > 0 ? C.danger : C.warn,
                }}>
                  {conflicts.length} TOTAL
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>
                Your frontend settings conflict with <strong style={{ color: C.text }}>{guidance.fileName}</strong>.
                {hardUnresolvedCount > 0
                  ? ' Resolve all hard conflicts before running.'
                  : ' Soft conflicts are warnings — you can still run after reviewing.'}
              </div>
            </div>
            <button onClick={onDismiss} style={{
              background: 'transparent', border: 'none',
              color: C.textDim, fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4,
            }}>×</button>
          </div>

          {/* Guidance summary */}
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
            fontSize: 11, color: C.textDim,
          }}>
            <span style={{ color: C.accent, fontWeight: 600 }}>Guidance: </span>
            {guidance.summary}
          </div>
        </div>

        {/* Bulk resolve */}
        <div style={{
          padding: '10px 24px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.surfaceHi,
        }}>
          <span style={{ fontSize: 11, color: C.textFaint, marginRight: 4 }}>Resolve all:</span>
          <SmallBtn
            color={C.accent} dimColor={C.accentDim} borderColor={C.accentBdr}
            onClick={() => onResolveAll('frontend')}
          >
            Keep All Mine (Frontend Wins)
          </SmallBtn>
          <SmallBtn
            color={C.purple} dimColor='rgba(139,92,246,0.12)' borderColor='rgba(139,92,246,0.30)'
            onClick={() => onResolveAll('guidance')}
          >
            Use All Guidance
          </SmallBtn>
        </div>

        {/* Conflict list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 8px' }}>
          {conflicts.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: C.textFaint, fontSize: 13 }}>
              No conflicts detected
            </div>
          )}
          {conflicts.map(conflict => (
            <ConflictRow
              key={conflict.id}
              conflict={conflict}
              onResolve={onResolve}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: C.surfaceHi,
        }}>
          <div style={{ fontSize: 11, color: C.textFaint }}>
            {unresolvedCount > 0
              ? `${unresolvedCount} unresolved · ${hardUnresolvedCount} blocking run`
              : <span style={{ color: C.done }}>✓ All conflicts resolved</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onDismiss} style={{
              padding: '8px 16px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.textDim, fontSize: 12, cursor: 'pointer',
            }}>
              Cancel
            </button>
            {canRun && onRunAnyway && (
              <button onClick={onRunAnyway} style={{
                padding: '8px 18px', borderRadius: 8,
                border: 'none',
                background: `linear-gradient(135deg, ${C.accent}, #6366f1)`,
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }}>
                ▶ Run Pipeline
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Single conflict row ───────────────────────────────────────────────────────
function ConflictRow({ conflict, onResolve }: {
  conflict: Conflict
  onResolve: (id: string, side: ConflictSide) => void
}) {
  const isHard = conflict.severity === 'hard'
  const isResolved = conflict.status !== 'unresolved'
  const frontendWon = conflict.status === 'resolved_frontend'
  const guidanceWon = conflict.status === 'resolved_guidance'

  const borderColor = isResolved
    ? (frontendWon ? 'rgba(68,195,166,0.25)' : 'rgba(139,92,246,0.25)')
    : (isHard ? C.dangerBdr : C.warnBdr)

  return (
    <div style={{
      marginBottom: 10,
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      overflow: 'hidden',
      opacity: isResolved ? 0.75 : 1,
      transition: 'opacity 200ms ease',
    }}>
      {/* Row header */}
      <div style={{
        padding: '10px 14px 8px',
        background: isResolved
          ? (frontendWon ? C.accentDim : 'rgba(139,92,246,0.08)')
          : (isHard ? C.dangerDim : C.warnDim),
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
          padding: '2px 6px', borderRadius: 4,
          background: isHard ? C.dangerDim : C.warnDim,
          border: `1px solid ${isHard ? C.dangerBdr : C.warnBdr}`,
          color: isHard ? C.danger : C.warn,
          flexShrink: 0,
        }}>
          {isHard ? 'HARD' : 'SOFT'}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{conflict.label}</span>
        {isResolved && (
          <span style={{
            marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            color: frontendWon ? C.accent : C.purple,
          }}>
            {frontendWon ? '✓ FRONTEND WINS' : '✓ GUIDANCE WINS'}
          </span>
        )}
      </div>

      {/* Conflict body */}
      <div style={{ padding: '10px 14px 12px', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10, lineHeight: 1.5 }}>
          {conflict.description}
        </div>

        {/* Side-by-side values */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <ValueBox
            label="Frontend"
            value={conflict.frontendValue}
            active={!isResolved || frontendWon}
            color={C.accent}
            dimColor={C.accentDim}
            borderColor={C.accentBdr}
          />
          <ValueBox
            label="Guidance Doc"
            value={conflict.guidanceValue}
            active={!isResolved || guidanceWon}
            color={C.purple}
            dimColor='rgba(139,92,246,0.12)'
            borderColor='rgba(139,92,246,0.30)'
          />
        </div>

        {/* Resolution buttons */}
        {!isResolved ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onResolve(conflict.id, 'frontend')} style={{
              flex: 1, padding: '7px 12px', borderRadius: 7,
              border: `1px solid ${C.accentBdr}`, background: C.accentDim,
              color: C.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              Keep Mine
            </button>
            <button onClick={() => onResolve(conflict.id, 'guidance')} style={{
              flex: 1, padding: '7px 12px', borderRadius: 7,
              border: '1px solid rgba(139,92,246,0.30)', background: 'rgba(139,92,246,0.12)',
              color: C.purple, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              Use Guidance
            </button>
          </div>
        ) : (
          <button onClick={() => onResolve(conflict.id, conflict.resolution === 'frontend' ? 'guidance' : 'frontend')} style={{
            padding: '5px 12px', borderRadius: 7,
            border: `1px solid ${C.border}`, background: 'transparent',
            color: C.textFaint, fontSize: 10, cursor: 'pointer',
          }}>
            Change Decision
          </button>
        )}
      </div>
    </div>
  )
}

function ValueBox({ label, value, active, color, dimColor, borderColor }: {
  label: string; value: string; active: boolean
  color: string; dimColor: string; borderColor: string
}) {
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 7,
      border: `1px solid ${active ? borderColor : C.border}`,
      background: active ? dimColor : 'transparent',
      transition: 'all 200ms ease',
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: active ? color : C.textFaint, marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 11, color: active ? C.text : C.textDim, wordBreak: 'break-word', lineHeight: 1.4 }}>
        {value || '(not set)'}
      </div>
    </div>
  )
}

function SmallBtn({ children, onClick, color, dimColor, borderColor }: {
  children: React.ReactNode
  onClick: () => void
  color: string; dimColor: string; borderColor: string
}) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 7,
      border: `1px solid ${borderColor}`, background: dimColor,
      color, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}
