// Lazy env — validated at request time, not build time
export const env = {
  get anthropicApiKey(): string {
    const val = process.env.ANTHROPIC_API_KEY?.trim()
    if (!val) throw new Error('ANTHROPIC_API_KEY is not set')
    return val
  },
  get openaiApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY?.trim() || undefined
  },
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'development'
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production'
  },
}
