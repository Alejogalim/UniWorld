import type { Provider } from '../contracts';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface SearchHit {
  url: string;
  title: string;
  /** Text the quote checker will search. Exa highlights, `[...]` separated. */
  text: string;
}

export interface SearchOptions {
  allowedDomains?: string[];
  maxResults?: number;
  maxCharacters?: number;
  signal?: AbortSignal;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider for a JSON object when supported. */
  json?: boolean;
  signal?: AbortSignal;
  /** Called for every streamed token when streaming is requested. */
  onToken?: (token: string) => void;
}

export interface AiClient {
  readonly provider: Provider;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  /** Same as chat but forwards tokens to `onToken` when the provider supports it. */
  stream(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  /** Web search; only OpenRouter implements this. */
  search(queries: string[], options?: SearchOptions): Promise<SearchHit[]>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}

export interface AiClientConfig {
  apiKey: string;
  model?: string;
}
