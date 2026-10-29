import ChatLayout from "@/features/vitrine-premium/components/chat/ChatLayout"

import {
  mockChatConversations,
} from "@/features/vitrine-premium/lib/mock-chat"

export default function ChatPage() {
  return (
    <ChatLayout
      initialConversations={
        mockChatConversations
      }
    />
  )
}