export type ChatRole =
  | "USER"
  | "ASSISTANT"

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export type ChatConversation = {
  id: string
  title: string
  updatedAt: string
  messages: ChatMessage[]
}