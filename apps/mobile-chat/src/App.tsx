import { useEffect, useCallback } from 'react'
import { useChatStore } from '@/store/chat'
import { ThreadList } from '@/components/ThreadList'
import { ChatPane } from '@/components/ChatPane'
import { SettingsModal } from '@/components/SettingsModal'
import { color, motion } from '@/lib/tokens'

export default function App() {
  const { loadThreads, loadSettings, sidebarOpen, setSidebarOpen } = useChatStore()

  useEffect(() => {
    loadSettings().then(() => loadThreads())
  }, [loadSettings, loadThreads])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [setSidebarOpen])

  return (
    <>
      <GlobalStyles />
      {/* Root: full viewport, no flex split */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: color.bg,
        overflow: 'hidden',
      }}>

        {/* Chat pane — always full width */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <ChatPane />
        </div>

        {/* Backdrop — dims content when sidebar open */}
        <div
          onClick={closeSidebar}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? 'auto' : 'none',
            transition: `opacity ${motion.normal} ${motion.easing}`,
            zIndex: 10,
          }}
        />

        {/* Sidebar — slides in from left as overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '82vw',
          maxWidth: 320,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: `transform ${motion.normal} ${motion.easing}`,
          zIndex: 20,
          willChange: 'transform',
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
      *, *::before, *::after { box-sizing: border-box; }
      html { height: 100%; }
      body {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        overscroll-behavior: none;
        -webkit-text-size-adjust: 100%;
        touch-action: manipulation;
      }
      #root { height: 100%; }

      /* Hide scrollbars on webkit */
      ::-webkit-scrollbar { width: 0; height: 0; }

      /* Native-feeling tap highlight */
      * { -webkit-tap-highlight-color: transparent; }

      /* Safe area padding utility */
      .safe-top    { padding-top: env(safe-area-inset-top, 0px); }
      .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }

      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @keyframes blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }

      textarea { -webkit-scrollbar: none; scrollbar-width: none; }
      textarea::-webkit-scrollbar { display: none; }

      select option {
        background: #16161f;
        color: #f0f0f6;
      }

      /* Prevent iOS bounce scroll on the root */
      html, body { position: fixed; width: 100%; }
    `}</style>
  )
}
