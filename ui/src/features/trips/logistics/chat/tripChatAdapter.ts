// Path: ui/src/features/trips/logistics/chat/tripChatAdapter.ts
// Summary: Implements tripChatAdapter module logic.

import type { TripChatAdapter, TripChatMessage, TripChatSendInput } from './types';

const STORAGE_KEY = 'wp_trip_chat_messages_v1';

type StorageShape = Record<string, TripChatMessage[]>;

function toMessageId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStorage(): StorageShape {
  if (typeof window === 'undefined') return {};

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as StorageShape;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStorage(next: StorageShape): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function sortMessages(messages: TripChatMessage[]): TripChatMessage[] {
  return [...messages].sort((left, right) => {
    if (left.createdAt === right.createdAt) {
      return left.id.localeCompare(right.id);
    }
    return left.createdAt.localeCompare(right.createdAt);
  });
}

export const localTripChatAdapter: TripChatAdapter = {
  async listMessages(tripId) {
    const store = readStorage();
    return sortMessages(store[String(tripId)] ?? []);
  },

  async sendMessage(input: TripChatSendInput) {
    const now = new Date().toISOString();
    const nextMessage: TripChatMessage = {
      id: toMessageId(),
      tripId: input.tripId,
      authorEmail: input.authorEmail,
      body: input.body,
      createdAt: now,
      reference: input.reference,
    };

    const store = readStorage();
    const key = String(input.tripId);
    const existing = store[key] ?? [];
    store[key] = sortMessages([...existing, nextMessage]);
    writeStorage(store);

    return nextMessage;
  },
};
