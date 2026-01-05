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

    const completion = await this.client.chat.completions.create({
      model: request.model,
      messages: [
        {
          role: "user",
          content: request.prompt
        }
      ],
      temperature,
      stream: false
    });

    const choice = completion.choices[0];
    const content = choice?.message?.content ?? "";

    return {
      content,
      tokensIn: completion.usage?.prompt_tokens,
      tokensOut: completion.usage?.completion_tokens
    };
  }
}
