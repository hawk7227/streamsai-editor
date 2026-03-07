import { openDB, type IDBPDatabase } from 'idb'
import type { Thread, Message, AppSettings } from '@/types'

const DB_NAME = 'streamsai-chat'
const DB_VERSION = 1

type ChatDB = {
  threads: {
    key: string
    value: Thread
    indexes: { 'by-updatedAt': number; 'by-pinned': number }
  }
  messages: {
    key: string
    value: Message
    indexes: { 'by-threadId': string; 'by-createdAt': number }
  }
  settings: {
    key: string
    value: AppSettings
  }
}

let _db: IDBPDatabase<ChatDB> | null = null

async function getDB(): Promise<IDBPDatabase<ChatDB>> {
  if (_db) return _db
  _db = await openDB<ChatDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // threads store
      const threadStore = db.createObjectStore('threads', { keyPath: 'id' })
      threadStore.createIndex('by-updatedAt', 'updatedAt')
      threadStore.createIndex('by-pinned', 'pinned')

      // messages store
      const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
      msgStore.createIndex('by-threadId', 'threadId')
      msgStore.createIndex('by-createdAt', 'createdAt')

      // settings store
      db.createObjectStore('settings', { keyPath: 'id' })
    },
  })
  return _db
}

// ─── Threads ─────────────────────────────────────────────────────────────────

export async function dbGetThreads(): Promise<Thread[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('threads', 'by-updatedAt')
  return all.reverse() // newest first
}

export async function dbGetThread(id: string): Promise<Thread | undefined> {
  const db = await getDB()
  return db.get('threads', id)
}

export async function dbPutThread(thread: Thread): Promise<void> {
  const db = await getDB()
  await db.put('threads', thread)
}

export async function dbDeleteThread(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['threads', 'messages'], 'readwrite')
  await tx.objectStore('threads').delete(id)
  // cascade delete messages
  const idx = tx.objectStore('messages').index('by-threadId')
  let cursor = await idx.openCursor(IDBKeyRange.only(id))
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function dbGetMessages(threadId: string): Promise<Message[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('messages', 'by-threadId', threadId)
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function dbPutMessage(message: Message): Promise<void> {
  const db = await getDB()
  await db.put('messages', message)
}

export async function dbDeleteMessage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('messages', id)
}

// ─── Settings ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'app-settings'

export async function dbGetSettings(): Promise<AppSettings | undefined> {
  const db = await getDB()
  return db.get('settings', SETTINGS_KEY) as Promise<AppSettings | undefined>
}

export async function dbPutSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { ...settings, id: SETTINGS_KEY } as AppSettings & { id: string })
}
