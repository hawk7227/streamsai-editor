import { useState, useCallback, useRef } from 'react'
import { useChatStore } from '@/store/chat'
import { color, spacing, radius, font, motion } from '@/lib/tokens'
import { Plus, Search, Settings, Pin, Trash2, Zap, X } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function ThreadList() {
  const {
    threads, activeThreadId,
    createThread, selectThread, deleteThread, pinThread,
    setSettingsOpen,
  } = useChatStore()

  const [search, setSearch] = useState('')
  const [swipedId, setSwipedId] = useState<string | null>(null)

  const filtered = threads.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.preview.toLowerCase().includes(search.toLowerCase())
  )
  const pinned = filtered.filter(t => t.pinned)
  const recent = filtered.filter(t => !t.pinned)

  const handleNew = useCallback(async () => {
    const id = await createThread()
    await selectThread(id)
  }, [createThread, selectThread])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: color.bgElevated,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: spacing[3],
        paddingInline: spacing[4],
        borderBottom: `1px solid ${color.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `linear-gradient(135deg, ${color.accent}, #16a34a)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={14} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: font.size.md, fontWeight: font.weight.bold, color: color.text }}>
              Chats
            </span>
          </div>
          <button
            onClick={handleNew}
            style={{
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: color.accentDim, border: `1px solid ${color.accent}40`,
              borderRadius: radius.md, color: color.accent,
              transition: `transform ${motion.snap} ${motion.easing}`,
            }}
            onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.9)' }}
            onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: color.textSub, pointerEvents: 'none',
          }} />
          <input
            type="search"
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: 36,
              padding: '0 32px 0 32px',
              background: color.bgCard,
              border: `1px solid ${color.border}`,
              borderRadius: radius.md,
              color: color.text, fontSize: font.size.sm,
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: color.textSub, display: 'flex',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Thread list */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' as const }}>
        {pinned.length > 0 && (
          <SectionLabel label="Pinned" />
        )}
        {pinned.map(t => (
          <ThreadRow
            key={t.id} thread={t}
            isActive={t.id === activeThreadId}
            swiped={swipedId === t.id}
            onSwipe={setSwipedId}
            onSelect={selectThread}
            onDelete={deleteThread}
            onPin={pinThread}
          />
        ))}

        {recent.length > 0 && pinned.length > 0 && <SectionLabel label="Recent" />}
        {recent.map(t => (
          <ThreadRow
            key={t.id} thread={t}
            isActive={t.id === activeThreadId}
            swiped={swipedId === t.id}
            onSwipe={setSwipedId}
            onSelect={selectThread}
            onDelete={deleteThread}
            onPin={pinThread}
          />
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: `${spacing[12]} ${spacing[4]}`, textAlign: 'center' }}>
            <p style={{ color: color.textSub, fontSize: font.size.sm }}>
              {search ? 'No results' : 'No conversations yet'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${color.border}`,
        paddingInline: spacing[3],
        paddingTop: spacing[2],
        paddingBottom: `max(${spacing[4]}, env(safe-area-inset-bottom, 16px))`,
      }}>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: spacing[3],
            width: '100%', padding: `${spacing[3]} ${spacing[3]}`,
            background: 'none', border: 'none',
            borderRadius: radius.md, color: color.textSub,
            fontSize: font.size.sm, textAlign: 'left',
            transition: `background ${motion.fast} ${motion.easing}`,
          }}
          onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.background = color.bgHover }}
          onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <Settings size={17} strokeWidth={1.5} />
          Settings
        </button>
      </div>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      padding: `${spacing[3]} ${spacing[4]} ${spacing[1]}`,
      fontSize: font.size.xs, fontWeight: font.weight.semibold,
      color: color.textFaint, textTransform: 'uppercase', letterSpacing: '0.07em',
    }}>
      {label}
    </div>
  )
}

interface RowProps {
  thread: ReturnType<typeof useChatStore.getState>['threads'][0]
  isActive: boolean
  swiped: boolean
  onSwipe: (id: string | null) => void
  onSelect: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onPin: (id: string, pinned: boolean) => Promise<void>
}

function ThreadRow({ thread, isActive, swiped, onSwipe, onSelect, onDelete, onPin }: RowProps) {
  const touchStart = useRef(0)
  const touchX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX
    touchX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStart.current - touchX.current
    if (diff > 50) {
      onSwipe(thread.id) // swipe left to reveal actions
    } else if (diff < -20) {
      onSwipe(null) // swipe right to close
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Action buttons revealed on swipe */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        display: 'flex', alignItems: 'center',
        transform: swiped ? 'translateX(0)' : 'translateX(100%)',
        transition: `transform ${motion.fast} ${motion.easing}`,
      }}>
        <button
          onClick={() => { onPin(thread.id, !thread.pinned); onSwipe(null) }}
          style={{
            width: 64, height: '100%',
            background: '#2563eb', border: 'none', color: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            fontSize: 9, fontWeight: 600,
          }}
        >
          <Pin size={16} />
          {thread.pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          onClick={() => { onDelete(thread.id); onSwipe(null) }}
          style={{
            width: 64, height: '100%',
            background: color.error, border: 'none', color: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            fontSize: 9, fontWeight: 600,
            borderRadius: `0 ${radius.sm} ${radius.sm} 0`,
          }}
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>

      {/* Main row */}
      <div
        onClick={() => swiped ? onSwipe(null) : onSelect(thread.id)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'flex', alignItems: 'center', gap: spacing[3],
          padding: `${spacing[3]} ${spacing[4]}`,
          background: isActive ? color.accentDim : 'transparent',
          borderLeft: isActive ? `3px solid ${color.accent}` : '3px solid transparent',
          transform: swiped ? 'translateX(-128px)' : 'translateX(0)',
          transition: `transform ${motion.fast} ${motion.easing}, background ${motion.snap} ${motion.easing}`,
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 36, height: 36, flexShrink: 0, borderRadius: radius.sm,
          background: isActive ? color.accentDim : color.bgCard,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${isActive ? color.accent + '40' : color.border}`,
        }}>
          <Zap size={15} color={isActive ? color.accent : color.textSub} strokeWidth={2} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: font.size.sm, fontWeight: isActive ? font.weight.semibold : font.weight.medium,
            color: isActive ? color.text : color.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 2,
          }}>
            {thread.title}
          </div>
          {thread.preview && (
            <div style={{
              fontSize: font.size.xs, color: color.textSub,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {thread.preview}
            </div>
          )}
        </div>

        {/* Time */}
        <div style={{ fontSize: font.size.xs, color: color.textFaint, flexShrink: 0 }}>
          {dayjs(thread.updatedAt).fromNow(true)}
        </div>
      </div>
    </div>
  )
}


