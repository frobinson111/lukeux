import OpenAI from "openai";
import type { LlmMode, LlmProvider, LlmRequest, LlmResponse } from "@luke-ux/shared";

export class OpenAiProvider implements LlmProvider {
  readonly name = "openai" as const;
  readonly supportsModes: LlmMode[] = ["auto", "instant", "thinking"];

  private client: OpenAI;

  constructor(private apiKey: string | undefined) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
  }

  private modeTemperature(mode: LlmRequest["mode"]): number {
    if (mode === "instant") return 0.2;
    if (mode === "thinking") return 0.8;
    return 0.5; // auto
  }

  async send(request: LlmRequest): Promise<LlmResponse> {
    const temperature = this.modeTemperature(request.mode);

    // Build content array for multimodal requests
    const hasImages = request.images && request.images.length > 0;
    const hasPdfPages = request.pdfPages && request.pdfPages.length > 0;
    const isMultimodal = hasImages || hasPdfPages;

    console.log(`[OpenAI Provider] isMultimodal: ${isMultimodal}, hasImages: ${hasImages}, hasPdfPages: ${hasPdfPages}`);
    if (hasImages) {
      console.log(`[OpenAI Provider] Image count: ${request.images!.length}, names: ${request.images!.map(i => i.name).join(", ")}`);
    }

    let messageContent: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }>;

    if (isMultimodal) {
      // Build multimodal content array
      const contentParts: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [];

      // Add images first if present
      if (hasImages) {
        for (const img of request.images!) {
          contentParts.push({
            type: "image_url",
            image_url: {
              url: `data:${img.mimeType};base64,${img.base64Data}`,
              detail: "high" // Use high detail for UX analysis
            }
          });
        }
      }

      // Add PDF pages as images if present
      if (hasPdfPages) {
        for (const page of request.pdfPages!) {
          contentParts.push({
            type: "image_url",
            image_url: {
              url: `data:${page.mimeType};base64,${page.base64Data}`,
              detail: "high"
            }
          });
        }
      }

      // Add text prompt last
      contentParts.push({ type: "text", text: request.prompt });
      messageContent = contentParts;
    } else {
      // Simple text-only request
      messageContent = request.prompt;
    }

    // Map custom model names to actual OpenAI model names
    let actualModel = request.model;
    if (request.model === "gpt-5.2" || request.model === "gpt-5.1" || request.model === "gpt-4.0") {
      actualModel = "gpt-4o"; // Use gpt-4o for vision support
    }
    
    console.log(`[OpenAI Provider] Using model: ${actualModel} (requested: ${request.model}), multimodal: ${isMultimodal}`);
    
    try {
      const completion = await this.client.chat.completions.create({
        model: actualModel,
        messages: [
          {
            role: "user",
            content: messageContent as any
          }
        ],
        temperature,
        max_tokens: isMultimodal ? 4096 : undefined, // Increase for vision responses
        stream: false
      });

      const choice = completion.choices[0];
      const content = choice?.message?.content ?? "";

      console.log(`[OpenAI Provider] Response received, content length: ${content.length}`);

      return {
        content,
        tokensIn: completion.usage?.prompt_tokens,
        tokensOut: completion.usage?.completion_tokens
      };
    } catch (error: any) {
      console.error(`[OpenAI Provider] ERROR: ${error.message}`);
      throw error;
    }
  }
}
