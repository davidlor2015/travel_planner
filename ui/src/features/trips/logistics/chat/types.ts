// Path: ui/src/features/trips/logistics/chat/types.ts
// Summary: Implements types module logic.

import type { WorkspaceTab } from '../../workspace/WorkspaceTabBar';

export type ChatReferenceKind = 'itinerary' | 'booking';

export interface TripChatReference {
  kind: ChatReferenceKind;
  label: string;
  tab: Extract<WorkspaceTab, 'overview' | 'bookings'>;
  targetId: string;
}

export interface TripChatMessage {
  id: string;
  tripId: number;
  authorEmail: string;
  body: string;
  createdAt: string;
  reference?: TripChatReference;
}

export interface TripChatSendInput {
  tripId: number;
  authorEmail: string;
  body: string;
  reference?: TripChatReference;
}

export interface TripChatAdapter {
  listMessages: (tripId: number) => Promise<TripChatMessage[]>;
  sendMessage: (input: TripChatSendInput) => Promise<TripChatMessage>;
}
