export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error'

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
}

export interface Message {
  id: string
  threadId: string
  role: MessageRole
  content: string
  status: MessageStatus
  attachments: Attachment[]
  createdAt: number
  tokens?: number
}

export interface Thread {
  id: string
  title: string
  model: ModelId
  createdAt: number
  updatedAt: number
  messageCount: number
  preview: string
  pinned: boolean
}

export type ModelId =
  | 'claude-opus-4-5'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5'
  | 'gpt-4o'
  | 'gpt-4o-mini'

export interface ModelConfig {
  id: ModelId
  label: string
  provider: 'anthropic' | 'openai'
  contextWindow: number
}

export const MODELS: Record<ModelId, ModelConfig> = {
  'claude-opus-4-5':   { id: 'claude-opus-4-5',   label: 'Claude Opus',    provider: 'anthropic', contextWindow: 200000 },
  'claude-sonnet-4-5': { id: 'claude-sonnet-4-5',  label: 'Claude Sonnet',  provider: 'anthropic', contextWindow: 200000 },
  'claude-haiku-4-5':  { id: 'claude-haiku-4-5',   label: 'Claude Haiku',   provider: 'anthropic', contextWindow: 200000 },
  'gpt-4o':            { id: 'gpt-4o',             label: 'GPT-4o',         provider: 'openai',    contextWindow: 128000 },
  'gpt-4o-mini':       { id: 'gpt-4o-mini',        label: 'GPT-4o mini',    provider: 'openai',    contextWindow: 128000 },
}

// No API keys — stored server-side only
export interface AppSettings {
  defaultModel: ModelId
  streamingEnabled: boolean
  theme: 'dark' | 'light' | 'system'
}
