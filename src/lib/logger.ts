/**
 * PUCA Finance — Structured Server Logging
 * Emits consistent JSON logs with ISO timestamps, log levels, event names,
 * user IDs, paths, duration, and request IDs threaded from incoming requests.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  [key: string]: any;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  requestId?: string;
  userId?: string;
  path?: string;
  durationMs?: number;
  message?: string;
  error?: string;
  extra?: Record<string, any>;
}

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

export function runWithRequestContext<R>(context: LogContext, fn: () => R): R {
  return asyncLocalStorage.run(context, fn);
}

export function getRequestContext(): LogContext | undefined {
  return asyncLocalStorage.getStore();
}

function outputLog(level: LogLevel, event: string, data?: Record<string, any>) {
  const context = asyncLocalStorage.getStore() || {};
  const {
    requestId = context.requestId,
    userId = context.userId,
    path = context.path,
    durationMs,
    message,
    error,
    ...extra
  } = data || {};

  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(requestId ? { requestId } : {}),
    ...(userId ? { userId } : {}),
    ...(path ? { path } : {}),
    ...(typeof durationMs === "number" ? { durationMs } : {}),
    ...(message ? { message } : {}),
    ...(error ? { error: typeof error === "object" ? error.message || String(error) : String(error) } : {}),
    ...(Object.keys(extra).length > 0 ? { extra } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(event: string, data?: Record<string, any>) {
    if (process.env.NODE_ENV !== "production") {
      outputLog("debug", event, data);
    }
  },
  info(event: string, data?: Record<string, any>) {
    outputLog("info", event, data);
  },
  warn(event: string, data?: Record<string, any>) {
    outputLog("warn", event, data);
  },
  error(event: string, data?: Record<string, any>) {
    outputLog("error", event, data);
  },
};
