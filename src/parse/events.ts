export type TextBlock = { type: "text"; text: string };
export type ThinkingBlock = { type: "thinking"; thinking: string; signature?: string };
export type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};
export type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: unknown;
  is_error?: boolean;
};
export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export type ToolUseResult = {
  success?: boolean;
  stdout?: string;
  stderr?: string;
  commandName?: string;
  interrupted?: boolean;
};

type BaseEvent = {
  timestamp?: string;
  sessionId: string;
  uuid?: string;
  parentUuid?: string;
  isSidechain?: boolean;
  agentId?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
};

export type UserEvent = BaseEvent & {
  type: "user";
  message: { role: "user"; content: ContentBlock[] | string };
  toolUseResult?: ToolUseResult;
};

export type AssistantEvent = BaseEvent & {
  type: "assistant";
  message: {
    role: "assistant";
    content: ContentBlock[];
    model?: string;
    usage?: TokenUsage;
    id?: string;
  };
  requestId?: string;
};

export type SystemEvent = BaseEvent & { type: "system"; subtype?: string };
export type AttachmentEvent = BaseEvent & { type: "attachment"; attachment?: { type: string } };
export type OtherEvent = BaseEvent & {
  type: "file-history-snapshot" | "queue-operation" | "permission-mode" | "last-prompt";
};

export type Event = UserEvent | AssistantEvent | SystemEvent | AttachmentEvent | OtherEvent;

export function isTurnEvent(e: Event): e is UserEvent | AssistantEvent {
  return e.type === "user" || e.type === "assistant";
}
