export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded
  };
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: GroundingChunk[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  parts: MessagePart[];
  timestamp: number;
  isError?: boolean;
  groundingMetadata?: GroundingMetadata;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  personaId: string;
  model: string;
  useWebSearch: boolean;
  temperature: number;
}

export interface Persona {
  id: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  systemPrompt: string;
  promptSuggestions: string[];
}

export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  description: string;
}
