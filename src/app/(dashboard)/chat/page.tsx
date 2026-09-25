import ChatLayout from "@/components/chat/ChatLayout"

import {
  mockChatConversations,
} from "@/lib/mock-chat"

export default function ChatPage() {
  return (
    <ChatLayout
      initialConversations={
        mockChatConversations
      }
    />
  )
}