import { useSyncExternalStore } from 'react'
import { newId, persistentStore } from './persist'

export interface Photo {
  id: string
  src: string
  taken: number
  sample?: boolean
}

// The "Sample pictures" album; these live in public/ and cannot be deleted.
export const SAMPLE_PHOTOS: Photo[] = [
  { id: 'sample-lake', src: '/photos/lake.jpg', taken: new Date(2012, 9, 6, 9, 12).getTime(), sample: true },
  { id: 'sample-street', src: '/photos/street.jpg', taken: new Date(2012, 9, 9, 18, 40).getTime(), sample: true },
  { id: 'sample-beach', src: '/photos/beach.jpg', taken: new Date(2012, 9, 14, 15, 5).getTime(), sample: true },
  { id: 'sample-tulips', src: '/photos/tulips.jpg', taken: new Date(2012, 9, 21, 11, 30).getTime(), sample: true },
]

// Ids of favourited photos (camera roll or samples), most recently added first.
export const favoritesStore = persistentStore<string[]>('photo-favorites', () => [])

export function toggleFavorite(id: string) {
  favoritesStore.set((ids) => (ids.includes(id) ? ids.filter((f) => f !== id) : [id, ...ids]))
}

interface PhotoRecord {
  id: string
  blob: Blob
  taken: number
}

export interface PhotoLibrary {
  ready: boolean
  // Newest first.
  cameraRoll: Photo[]
}

const DB_NAME = 'wp8-photos'
const STORE = 'photos'

let snapshot: PhotoLibrary = { ready: false, cameraRoll: [] }
const listeners = new Set<() => void>()
let db: Promise<IDBDatabase> | null = null
let loading: Promise<void> | null = null

function openDb(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return db
}

async function request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDb()
  return new Promise((resolve, reject) => {
    const req = run(database.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const toPhoto = (record: PhotoRecord): Photo => ({
  id: record.id,
  src: URL.createObjectURL(record.blob),
  taken: record.taken,
})

function publish(cameraRoll: Photo[]) {
  snapshot = { ready: true, cameraRoll }
  listeners.forEach((listener) => listener())
}

function ensureLoaded(): Promise<void> {
  loading ??= (async () => {
    try {
      const rows = await request<PhotoRecord[]>('readonly', (s) => s.getAll())
      publish(rows.sort((a, b) => b.taken - a.taken).map(toPhoto))
    } catch {
      publish([])
    }
  })()
  return loading
}

export async function savePhoto(blob: Blob): Promise<Photo> {
  await ensureLoaded()
  const record: PhotoRecord = { id: newId(), blob, taken: Date.now() }
  await request('readwrite', (s) => s.put(record))
  const photo = toPhoto(record)
  publish([photo, ...snapshot.cameraRoll])
  return photo
}

export async function deletePhoto(id: string): Promise<void> {
  await ensureLoaded()
  await request('readwrite', (s) => s.delete(id))
  const gone = snapshot.cameraRoll.find((p) => p.id === id)
  publish(snapshot.cameraRoll.filter((p) => p.id !== id))
  if (favoritesStore.get().includes(id)) favoritesStore.set((ids) => ids.filter((f) => f !== id))
  // Revoke after this frame so an <img> still showing the photo (a viewer
  // animating away from it) doesn't flash a broken image.
  if (gone) window.setTimeout(() => URL.revokeObjectURL(gone.src), 1000)
}

const subscribe = (listener: () => void) => {
  ensureLoaded()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Camera roll photos are stored as blobs in IndexedDB.
export function usePhotos(): PhotoLibrary {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}
