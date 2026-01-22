export type LlmMode = "auto" | "instant" | "thinking";

// HTML Sanitization
export { sanitizeTemplateHtml, stripHtmlTags } from './htmlSanitizer';

export type LlmAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uri: string;
};

// New type for image/visual content handling
export type LlmImage = {
  name: string;
  mimeType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  base64Data: string; // base64 encoded image data (without data URL prefix)
};

// New type for PDF page images (PDFs rendered as images)
export type LlmPdfPage = {
  name: string;
  pageNumber: number;
  mimeType: "image/png";
  base64Data: string;
};

export type LlmRequest = {
  prompt: string;
  model: string;
  mode: LlmMode;
  images?: LlmImage[];      // For direct images (PNG, JPEG, etc.)
  pdfPages?: LlmPdfPage[];  // For PDF pages rendered as images
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
