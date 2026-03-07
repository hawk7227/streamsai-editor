import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Thread, Message, AppSettings } from '@/types'
import {
  dbGetThreads,
  dbGetThread,
  dbPutThread,
  dbDeleteThread,
  dbGetMessages,
  dbPutMessage,
  dbGetSettings,
  dbPutSettings,
} from '@/db'
import { nanoid } from '@/lib/nanoid'

// ─── State shape ─────────────────────────────────────────────────────────────

interface ChatState {
  // Data
  threads: Thread[]
  activeThreadId: string | null
  messages: Record<string, Message[]> // keyed by threadId
  settings: AppSettings | null

  // UI
  sidebarOpen: boolean
  settingsOpen: boolean
  isLoadingThreads: boolean
  isLoadingMessages: boolean

  // Actions — threads
  loadThreads: () => Promise<void>
  createThread: (title?: string) => Promise<string>
  selectThread: (id: string) => Promise<void>
  updateThread: (id: string, patch: Partial<Thread>) => Promise<void>
  deleteThread: (id: string) => Promise<void>
  pinThread: (id: string, pinned: boolean) => Promise<void>

  // Actions — messages
  loadMessages: (threadId: string) => Promise<void>
  addMessage: (msg: Omit<Message, 'id' | 'createdAt'>) => Promise<Message>
  updateMessage: (id: string, threadId: string, patch: Partial<Message>) => Promise<void>

  // Actions — settings
  loadSettings: () => Promise<void>
  saveSettings: (s: AppSettings) => Promise<void>

  // Actions — UI
  setSidebarOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: 'claude-sonnet-4-5',
  streamingEnabled: true,
  theme: 'dark',
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set: (fn: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)) => void, get: () => ChatState) => ({
    threads: [],
    activeThreadId: null,
    messages: {},
    settings: null,
    sidebarOpen: false,
    settingsOpen: false,
    isLoadingThreads: false,
    isLoadingMessages: false,

    // ── Threads ──────────────────────────────────────────────────────────────

    loadThreads: async () => {
      set({ isLoadingThreads: true })
      try {
        const threads = await dbGetThreads()
        set({ threads, isLoadingThreads: false })
      } catch (err) {
        console.error('loadThreads failed', err)
        set({ isLoadingThreads: false })
      }
    },

    createThread: async (title?: string) => {
      const settings = get().settings ?? DEFAULT_SETTINGS
      const id = nanoid()
      const now = Date.now()
      const thread: Thread = {
        id,
        title: title ?? 'New conversation',
        model: settings.defaultModel,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        preview: '',
        pinned: false,
      }
      await dbPutThread(thread)
      set((s: ChatState) => ({ threads: [thread, ...s.threads] }))
      return id
    },

    selectThread: async (id: string) => {
      set({ activeThreadId: id, sidebarOpen: false })
      const cached = get().messages[id]
      if (!cached) {
        await get().loadMessages(id)
      }
    },

    updateThread: async (id: string, patch: Partial<Thread>) => {
      const existing = await dbGetThread(id)
      if (!existing) return
      const updated = { ...existing, ...patch, updatedAt: Date.now() }
      await dbPutThread(updated)
      set((s: ChatState) => ({
        threads: s.threads.map(t => (t.id === id ? updated : t)),
      }))
    },

    deleteThread: async (id: string) => {
      await dbDeleteThread(id)
      set((s: ChatState) => ({
        threads: s.threads.filter((t: Thread) => t.id !== id),
        activeThreadId: s.activeThreadId === id ? null : s.activeThreadId,
        messages: Object.fromEntries(
          Object.entries(s.messages).filter(([k]: [string, Message[]]) => k !== id)
        ),
      }))
    },

    pinThread: async (id: string, pinned: boolean) => {
      await get().updateThread(id, { pinned })
    },

    // ── Messages ─────────────────────────────────────────────────────────────

    loadMessages: async (threadId: string) => {
      set({ isLoadingMessages: true })
      try {
        const msgs = await dbGetMessages(threadId)
        set((s: ChatState) => ({
          messages: { ...s.messages, [threadId]: msgs },
          isLoadingMessages: false,
        }))
      } catch (err) {
        console.error('loadMessages failed', err)
        set({ isLoadingMessages: false })
      }
    },

    addMessage: async (msg: Omit<Message, "id" | "createdAt">) => {
      const id = nanoid()
      const full: Message = { ...msg, id, createdAt: Date.now() }
      await dbPutMessage(full)
      set((s: ChatState) => ({
        messages: {
          ...s.messages,
          [msg.threadId]: [...(s.messages[msg.threadId] ?? []), full],
        },
      }))
      // update thread preview + count
      const snippet = msg.content.slice(0, 80)
      await get().updateThread(msg.threadId, {
        preview: snippet,
        messageCount: (s => (s.messages[msg.threadId]?.length ?? 1))(get()),
      })
      return full
    },

    updateMessage: async (id: string, threadId: string, patch: Partial<Message>) => {
      set((s: ChatState) => {
        const msgs = s.messages[threadId] ?? []
        const updated = (msgs as Message[]).map((m: Message) => (m.id === id ? { ...m, ...patch } : m))
        return { messages: { ...s.messages, [threadId]: updated } }
      })
      // persist
      const msgs = get().messages[threadId] ?? []
      const found = msgs.find(m => m.id === id)
      if (found) await dbPutMessage(found)
    },

    // ── Settings ─────────────────────────────────────────────────────────────

    loadSettings: async () => {
      const s = await dbGetSettings()
      set({ settings: s ?? DEFAULT_SETTINGS })
    },

    saveSettings: async (settings: AppSettings) => {
      await dbPutSettings(settings)
      set({ settings })
    },

    // ── UI ───────────────────────────────────────────────────────────────────

    setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
    setSettingsOpen: (open: boolean) => set({ settingsOpen: open }),
  }))
)
