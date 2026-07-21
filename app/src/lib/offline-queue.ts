const DB_NAME = "slidescribe-offline"
const DB_VERSION = 1
const STORE = "capture-queue"

interface QueuedCapture {
  id: string
  imageBlob: Blob
  subjectId?: string
  chapterId?: string
  timestamp: string
  retries: number
}

function openDB(): Promise<IDBObjectStore | IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function queueCapture(
  imageBlob: Blob,
  subjectId?: string,
  chapterId?: string,
): Promise<void> {
  const db = await openDB()
  const tx = (db as IDBDatabase).transaction(STORE, "readwrite")
  tx.objectStore(STORE).add({
    id: crypto.randomUUID(),
    imageBlob,
    subjectId,
    chapterId,
    timestamp: new Date().toISOString(),
    retries: 0,
  })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { (db as IDBDatabase).close(); resolve() }
    tx.onerror = () => { (db as IDBDatabase).close(); reject(tx.error) }
  })
}

export async function getQueue(): Promise<QueuedCapture[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = (db as IDBDatabase).transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => { (db as IDBDatabase).close(); resolve(req.result) }
    req.onerror = () => { (db as IDBDatabase).close(); reject(req.error) }
  })
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB()
  const tx = (db as IDBDatabase).transaction(STORE, "readwrite")
  tx.objectStore(STORE).delete(id)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { (db as IDBDatabase).close(); resolve() }
    tx.onerror = () => { (db as IDBDatabase).close(); reject(tx.error) }
  })
}

export async function clearQueue(): Promise<void> {
  const db = await openDB()
  const tx = (db as IDBDatabase).transaction(STORE, "readwrite")
  tx.objectStore(STORE).clear()
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { (db as IDBDatabase).close(); resolve() }
    tx.onerror = () => { (db as IDBDatabase).close(); reject(tx.error) }
  })
}
