import { requireClinicalPageSession } from "@/server/clinical/clinical-page-session";
import ChatLayout from "@/components/chat/ChatLayout"

import {
  mockChatConversations,
} from "@/lib/mock-chat"

export default async function ChatPage() {
  await requireClinicalPageSession();
  return (
    <ChatLayout
      initialConversations={
        mockChatConversations
      }
    />
  )
}