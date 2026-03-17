import { useEffect, useCallback } from 'react'
import { useChatStore } from '@/store/chat'
import { ThreadList } from '@/components/ThreadList'
import { ChatPane } from '@/components/ChatPane'
import { SettingsModal } from '@/components/SettingsModal'
import { color, motion } from '@/lib/tokens'

export default function App() {
  const { loadThreads, loadSettings, sidebarOpen, setSidebarOpen, threads, activeThreadId, selectThread } = useChatStore()

  useEffect(() => {
    loadSettings().then(() => loadThreads())
  }, [loadSettings, loadThreads])

  // Post thread list to Studio (parent) whenever threads change
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return
    window.parent.postMessage({
      type: 'streamsai:thread-list',
      threads: threads.map((t: { id: string; title: string; model: string; updatedAt: number }) => ({
        id: t.id, title: t.title, model: t.model, updatedAt: t.updatedAt,
      })),
    }, '*')
  }, [threads])

  // Listen for Studio commands via postMessage
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return
      if (e.data.type === 'streamsai:new-chat') {
        useChatStore.getState().createThread().then((id: string) => {
          useChatStore.getState().selectThread(id)
        })
      }
      if (e.data.type === 'streamsai:select-thread' && typeof e.data.id === 'string') {
        useChatStore.getState().selectThread(e.data.id)
      }
      if (e.data.type === 'streamsai:set-model' && typeof e.data.model === 'string') {
        const { activeThreadId, updateThread } = useChatStore.getState()
        if (activeThreadId) {
          updateThread(activeThreadId, { model: e.data.model as import('@/types').ModelId })
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    if (!activeThreadId && threads.length > 0) {
      selectThread(threads[0].id)
    }
  }, [threads, activeThreadId, selectThread])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [setSidebarOpen])

  return (
    <>
      <GlobalStyles />
      <div style={{ position: 'fixed', inset: 0, background: color.bg, overflow: 'hidden' }}>

        {/* Chat — always full width underneath */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <ChatPane />
        </div>

        {/* Backdrop */}
        <div
          onClick={closeSidebar}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? 'auto' : 'none',
            transition: `opacity ${motion.normal} ${motion.easing}`,
            zIndex: 10,
          }}
        />

        {/* Sidebar drawer */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: '80vw', maxWidth: 300,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: `transform ${motion.normal} ${motion.easing}`,
          zIndex: 20,
          willChange: 'transform',
          boxShadow: sidebarOpen ? '4px 0 40px rgba(0,0,0,0.6)' : 'none',
        }}>
          <ThreadList />
        </div>
      </div>

      <SettingsModal />
    </>
  )
}

function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        height: 100%; width: 100%;
        background: #0f0f0f;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overflow: hidden;
        position: fixed;
        overscroll-behavior: none;
        -webkit-text-size-adjust: 100%;
        touch-action: manipulation;
      }
      #root { height: 100%; width: 100%; overflow: hidden; }
      * { -webkit-tap-highlight-color: transparent; outline: none; }
      ::-webkit-scrollbar { display: none; }
      * { scrollbar-width: none; }

      @keyframes msgIn {
        from { opacity: 0; transform: translateY(10px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes blink {
        0%,100% { opacity: 1; }
        50%     { opacity: 0; }
      }
      @keyframes pulse {
        0%,100% { opacity: 0.4; transform: scale(0.85); }
        50%     { opacity: 1;   transform: scale(1.1); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(100%); }
        to   { opacity: 1; transform: translateY(0); }
      }

      button { font-family: inherit; cursor: pointer; }
      textarea { font-family: inherit; }
      select option { background: #1a1a1a; color: #f5f5f5; }
    `}</style>
  )
}
