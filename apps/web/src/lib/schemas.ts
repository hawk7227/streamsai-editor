import { z } from 'zod'

export const ModelIdSchema = z.enum([
  'claude-opus-4-5',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'gpt-4o',
  'gpt-4o-mini',
])

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system'])

// Text-only content part
const TextPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(100_000),
})

// Image content part (base64)
const ImagePartSchema = z.object({
  type: z.literal('image'),
  source: z.object({
    type: z.literal('base64'),
    media_type: z.string(),
    data: z.string(),
  }),
})

// Content can be plain string OR array of parts
const MessageContentSchema = z.union([
  z.string().min(1).max(100_000),
  z.array(z.union([TextPartSchema, ImagePartSchema])).min(1).max(20),
])

export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: MessageContentSchema,
})

export const StreamRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(200),
  model: ModelIdSchema,
  threadId: z.string().min(1).max(100),
  maxTokens: z.number().int().min(1).max(8192).optional().default(4096),
})

export const TitleRequestSchema = z.object({
  userMessage: z.string().min(1).max(1000),
  assistantMessage: z.string().min(1).max(2000),
  model: ModelIdSchema,
})

export type StreamRequest = z.infer<typeof StreamRequestSchema>
export type TitleRequest = z.infer<typeof TitleRequestSchema>
export type ModelId = z.infer<typeof ModelIdSchema>
