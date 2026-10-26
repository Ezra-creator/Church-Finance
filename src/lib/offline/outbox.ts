/**
 * PUCA Finance — IndexedDB Client Outbox
 * Stores offline counting and tithe entry mutations with client-generated
 * idempotency keys (crypto.randomUUID()) for reliable sequential replay.
 */

export type OutboxActionType = "SAVE_COUNT" | "ADD_GIVING";

export interface OutboxItem {
  id: string; // Client-generated idempotency key (crypto.randomUUID())
  type: OutboxActionType;
  timestamp: number;
  serviceRecordId: string;
  description: string;
  payload: any;
  status: "PENDING" | "SYNCING" | "FAILED_CONFLICT";
  error?: string;
  conflictDetails?: {
    reason: string;
    clientSummary: string;
    serverSummary?: string;
  };
}

const DB_NAME = "puca_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "outbox";

function isIndexedDBSupported(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("serviceRecordId", "serviceRecordId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOutboxItem(
  item: Omit<OutboxItem, "timestamp" | "status">
): Promise<OutboxItem> {
  if (!isIndexedDBSupported()) {
    // Graceful fallback for non-browser contexts
    return {
      ...item,
      timestamp: Date.now(),
      status: "PENDING",
    };
  }

  const db = await openDB();
  const fullItem: OutboxItem = {
    ...item,
    timestamp: Date.now(),
    status: "PENDING",
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(fullItem);

    req.onsuccess = () => resolve(fullItem);
    req.onerror = () => reject(req.error);
  });
}

export async function getOutboxItems(serviceRecordId?: string): Promise<OutboxItem[]> {
  if (!isIndexedDBSupported()) return [];

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const all: OutboxItem[] = req.result || [];
      const filtered = serviceRecordId
        ? all.filter((i) => i.serviceRecordId === serviceRecordId)
        : all;
      // Sort in chronological order of creation
      filtered.sort((a, b) => a.timestamp - b.timestamp);
      resolve(filtered);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateOutboxItem(item: OutboxItem): Promise<void> {
  if (!isIndexedDBSupported()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function removeOutboxItem(id: string): Promise<void> {
  if (!isIndexedDBSupported()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearOutbox(): Promise<void> {
  if (!isIndexedDBSupported()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
