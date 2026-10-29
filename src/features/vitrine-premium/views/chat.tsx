import ChatLayout from "@/features/vitrine-premium/components/chat/ChatLayout"

import {
  mockChatConversations,
} from "@/features/vitrine-premium/lib/mock-chat"

export default function ChatPage() {
  return (
    <><h1 className="sr-only">Chat IA demonstrativo</h1><ChatLayout
      initialConversations={
        mockChatConversations
      }
    /></>
  )
}