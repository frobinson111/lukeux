import type { LlmMode, LlmProvider, LlmRequest, LlmResponse } from "@luke-ux/shared";

// Anthropic supports multimodal content with text and image blocks
type AnthropicImageBlock = {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    data: string;
  };
};

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicContentBlock = AnthropicImageBlock | AnthropicTextBlock;

type AnthropicMessage = {
  role: "user";
  content: string | AnthropicContentBlock[];
};

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const;
  readonly supportsModes: LlmMode[] = ["auto", "instant", "thinking"];

  private apiKey: string;
  private apiUrl = "https://api.anthropic.com/v1/messages";

  constructor(apiKey: string | undefined) {
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    this.apiKey = apiKey;
  }

  private modeTemperature(mode: LlmRequest["mode"]): number | undefined {
    if (mode === "instant") return 0.2;
    if (mode === "thinking") return 0.7;
    return 0.5; // auto
  }

  async send(request: LlmRequest): Promise<LlmResponse> {
    const temperature = this.modeTemperature(request.mode);

    // Build content array for multimodal requests
    const hasImages = request.images && request.images.length > 0;
    const hasPdfPages = request.pdfPages && request.pdfPages.length > 0;
    const isMultimodal = hasImages || hasPdfPages;

    let messageContent: string | AnthropicContentBlock[];

    if (isMultimodal) {
      const contentBlocks: AnthropicContentBlock[] = [];

      // Add images first if present
      if (hasImages) {
        for (const img of request.images!) {
          contentBlocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: img.mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
              data: img.base64Data
            }
          });
        }
      }

      // Add PDF pages as images if present
      if (hasPdfPages) {
        for (const page of request.pdfPages!) {
          contentBlocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: page.mimeType,
              data: page.base64Data
            }
          });
        }
      }

      // Add text prompt last
      contentBlocks.push({ type: "text", text: request.prompt });
      messageContent = contentBlocks;
    } else {
      // Simple text-only request
      messageContent = request.prompt;
    }

    const body = {
      model: request.model,
      max_tokens: isMultimodal ? 4096 : 1024, // Increase for vision responses
      temperature,
      messages: [{ role: "user", content: messageContent } satisfies AnthropicMessage]
    };

    const res = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Anthropic request failed (${res.status}): ${text}`);
    }

    const data: any = await res.json();
    const content = Array.isArray(data.content) ? data.content.map((c: any) => c.text || "").join("\n").trim() : "";

    return {
      content,
      tokensIn: data?.usage?.input_tokens,
      tokensOut: data?.usage?.output_tokens
    };
  }
}
