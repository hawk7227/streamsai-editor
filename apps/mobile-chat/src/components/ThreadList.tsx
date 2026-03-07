import { useState, useCallback } from 'react'
import { useChatStore } from '@/store/chat'
import { color, spacing, radius, motion, font } from '@/lib/tokens'
import { Pin, Trash2, Plus, Search, MessageSquare, Settings } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function ThreadList() {
  const {
    threads,
    activeThreadId,
    createThread,
    selectThread,
    deleteThread,
    pinThread,
    setSettingsOpen,
  } = useChatStore()

  const [search, setSearch] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  const filtered = threads.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.preview.toLowerCase().includes(search.toLowerCase())
  )

  const pinned = filtered.filter(t => t.pinned)
  const unpinned = filtered.filter(t => !t.pinned)

  const handleNew = useCallback(async () => {
    const id = await createThread()
    await selectThread(id)
  }, [createThread, selectThread])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: color.bgPanel, borderRight: `1px solid ${color.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: `calc(${spacing[4]} + env(safe-area-inset-top, 0px))`,
        paddingBottom: spacing[3],
        paddingLeft: spacing[4],
        paddingRight: spacing[4],
        borderBottom: `1px solid ${color.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <span style={{ fontSize: font.size.md, fontWeight: font.weight.semibold, color: color.text }}>
            Chats
          </span>
          <button
            onClick={handleNew}
            style={{
              display: 'flex', alignItems: 'center', gap: spacing[1],
              padding: `${spacing[1]} ${spacing[3]}`,
              background: color.accent, color: '#fff',
              border: 'none', borderRadius: radius.full,
              fontSize: font.size.sm, fontWeight: font.weight.medium,
              cursor: 'pointer',
              transition: `opacity ${motion.fast} ${motion.easing}`,
            }}
          >
            <Plus size={13} />
            New
          </button>
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: color.textMuted }} />
          <input
            type="text"
            placeholder="Search conversations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: `${spacing[2]} ${spacing[2]} ${spacing[2]} 32px`,
              background: color.bgCard, border: `1px solid ${color.border}`,
              borderRadius: radius.sm, color: color.text,
              fontSize: font.size.sm, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Thread groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${spacing[2]} 0` }}>
        {pinned.length > 0 && (
          <ThreadGroup label="Pinned" threads={pinned} activeId={activeThreadId} hovered={hovered} setHovered={setHovered} selectThread={selectThread} deleteThread={deleteThread} pinThread={pinThread} />
        )}
        <ThreadGroup label={pinned.length ? 'Recent' : undefined} threads={unpinned} activeId={activeThreadId} hovered={hovered} setHovered={setHovered} selectThread={selectThread} deleteThread={deleteThread} pinThread={pinThread} />
        {filtered.length === 0 && (
          <div style={{ padding: `${spacing[8]} ${spacing[4]}`, textAlign: 'center', color: color.textMuted, fontSize: font.size.sm }}>
            {search ? 'No results' : 'No conversations yet'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${color.border}`, padding: spacing[3], flexShrink: 0 }}>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: spacing[2],
            width: '100%', padding: `${spacing[2]} ${spacing[3]}`,
            background: 'none', border: 'none', borderRadius: radius.sm,
            color: color.textMuted, fontSize: font.size.sm, cursor: 'pointer',
            transition: `background ${motion.fast} ${motion.easing}, color ${motion.fast} ${motion.easing}`,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = color.bgHover; (e.currentTarget as HTMLButtonElement).style.color = color.text }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = color.textMuted }}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </div>
  )
}

// ─── Thread group ────────────────────────────────────────────────────────────

interface GroupProps {
  label?: string
  threads: ReturnType<typeof useChatStore.getState>['threads']
  activeId: string | null
  hovered: string | null
  setHovered: (id: string | null) => void
  selectThread: (id: string) => Promise<void>
  deleteThread: (id: string) => Promise<void>
  pinThread: (id: string, pinned: boolean) => Promise<void>
}

function ThreadGroup({ label, threads, activeId, hovered, setHovered, selectThread, deleteThread, pinThread }: GroupProps) {
  if (threads.length === 0) return null
  return (
    <div>
      {label && (
        <div style={{ padding: `${spacing[2]} ${spacing[4]} ${spacing[1]}`, fontSize: font.size.xs, fontWeight: font.weight.semibold, color: color.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </div>
      )}
      {threads.map(thread => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          isActive={thread.id === activeId}
          isHovered={hovered === thread.id}
          onHover={setHovered}
          onSelect={selectThread}
          onDelete={deleteThread}
          onPin={pinThread}
        />
      ))}
    </div>
  )
}

// ─── Thread item ─────────────────────────────────────────────────────────────

interface ItemProps {
  thread: ReturnType<typeof useChatStore.getState>['threads'][0]
  isActive: boolean
  isHovered: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onPin: (id: string, pinned: boolean) => Promise<void>
}

function ThreadItem({ thread, isActive, isHovered, onHover, onSelect, onDelete, onPin }: ItemProps) {
  const bg = isActive ? color.bgActive : isHovered ? color.bgHover : 'transparent'

  return (
    <div
      onClick={() => onSelect(thread.id)}
      onMouseEnter={() => onHover(thread.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: spacing[3],
        padding: `${spacing[3]} ${spacing[4]}`,
        background: bg, cursor: 'pointer',
        transition: `background ${motion.fast} ${motion.easing}`,
        position: 'relative',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 32, height: 32, flexShrink: 0,
        background: isActive ? color.accentDim : color.bgCard,
        borderRadius: radius.sm,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: `background ${motion.fast} ${motion.easing}`,
      }}>
        <MessageSquare size={14} color={isActive ? color.accent : color.textMuted} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: font.size.sm, fontWeight: isActive ? font.weight.semibold : font.weight.normal,
          color: isActive ? color.text : color.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 2,
        }}>
          {thread.title}
        </div>
        {thread.preview && (
          <div style={{
            fontSize: font.size.xs, color: color.textMuted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {thread.preview}
          </div>
        )}
        <div style={{ fontSize: font.size.xs, color: color.textFaint, marginTop: 2 }}>
          {dayjs(thread.updatedAt).fromNow()}
        </div>
      </div>

      {/* Actions — visible on hover */}
      {isHovered && (
        <div style={{
          display: 'flex', gap: 4, flexShrink: 0,
          position: 'absolute', right: spacing[4], top: '50%', transform: 'translateY(-50%)',
        }}
          onClick={e => e.stopPropagation()}
        >
          <ActionBtn
            icon={<Pin size={11} />}
            title={thread.pinned ? 'Unpin' : 'Pin'}
            onClick={() => onPin(thread.id, !thread.pinned)}
            active={thread.pinned}
          />
          <ActionBtn
            icon={<Trash2 size={11} />}
            title="Delete"
            onClick={() => onDelete(thread.id)}
            danger
          />
        </div>
      )}
    </div>
  )
}

function ActionBtn({ icon, title, onClick, active, danger }: { icon: React.ReactNode; title: string; onClick: () => void; active?: boolean; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 24, height: 24,
        background: danger ? color.errorDim : active ? color.accentDim : color.bgCard,
        border: 'none', borderRadius: radius.sm,
        color: danger ? color.error : active ? color.accent : color.textMuted,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {icon}
    </button>
  )
}
