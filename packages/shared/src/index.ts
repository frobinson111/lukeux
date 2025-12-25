export type LlmMode = "auto" | "instant" | "thinking";

export type LlmAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uri: string;
};

export type LlmRequest = {
  prompt: string;
  model: string;
  mode: LlmMode;
  attachments?: LlmAttachment[];
  contextThreadId?: string;
};

export type LlmResponse = {
  content: string;
  tokensIn?: number;
  tokensOut?: number;
  costEstimateUsd?: number;
  reasoningTrace?: string;
};

export interface LlmProvider {
  readonly name: string;
  readonly supportsModes: LlmMode[];
  send(request: LlmRequest): Promise<LlmResponse>;
}
