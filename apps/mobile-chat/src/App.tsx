import { useEffect } from 'react'
import { useChatStore } from '@/store/chat'
import { ThreadList } from '@/components/ThreadList'
import { ChatPane } from '@/components/ChatPane'
import { SettingsModal } from '@/components/SettingsModal'
import { color, motion } from '@/lib/tokens'

const SIDEBAR_WIDTH = 260

export default function App() {
  const { loadThreads, loadSettings, sidebarOpen } = useChatStore()

  useEffect(() => {
    loadSettings().then(() => loadThreads())
  }, [loadSettings, loadThreads])

  return (
    <>
      <GlobalStyles />
      <div style={{
        display: 'flex',
        height: '100dvh',
        width: '100%',
        background: color.bg,
        overflow: 'hidden',
      }}>
        {/* Sidebar */}
        <div style={{
          width: sidebarOpen ? SIDEBAR_WIDTH : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: `width ${motion.normal} ${motion.easing}`,
        }}>
          <div style={{ width: SIDEBAR_WIDTH, height: '100%' }}>
            <ThreadList />
          </div>
        </div>

        {/* Chat pane */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <ChatPane />
        </div>
      </div>

      <SettingsModal />
    </>
  )
}

function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; }

      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 999px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @keyframes blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }

      textarea::-webkit-scrollbar { display: none; }

      select option {
        background: #16161f;
        color: #f0f0f6;
      }
    `}</style>
  )
}
