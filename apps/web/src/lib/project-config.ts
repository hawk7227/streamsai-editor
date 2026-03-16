export type ToolSection = 'projects' | 'files' | 'uploads' | 'artifacts' | 'apps' | 'settings'

export interface ProjectConfig {
  projectName: string
  repoOwner: string
  repoName: string
  branch: string
  currentFile: string
  previewTarget: string
  mobileChatUrl: string
  githubConnected: boolean
  supabaseConnected: boolean
  vercelConnected: boolean
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  projectName: 'streamsai-editor',
  repoOwner: 'hawk7227',
  repoName: 'streamsai-editor',
  branch: 'main',
  currentFile: 'apps/web/src/app/studio/page.tsx',
  previewTarget: '/preview',
  mobileChatUrl: 'https://streamsai-editor-mobile-chat.vercel.app',
  githubConnected: false,
  supabaseConnected: false,
  vercelConnected: false,
}

export const PROJECT_CONFIG_KEY = 'streamsai:project-config'

export function readProjectConfig(): ProjectConfig {
  if (typeof window === 'undefined') return DEFAULT_PROJECT_CONFIG
  try {
    const raw = window.localStorage.getItem(PROJECT_CONFIG_KEY)
    if (!raw) return DEFAULT_PROJECT_CONFIG
    return { ...DEFAULT_PROJECT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PROJECT_CONFIG
  }
}

export function writeProjectConfig(next: Partial<ProjectConfig>): ProjectConfig {
  const value = { ...readProjectConfig(), ...next }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PROJECT_CONFIG_KEY, JSON.stringify(value))
  }
  return value
}
