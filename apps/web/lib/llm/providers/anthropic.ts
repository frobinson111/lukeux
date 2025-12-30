import type { LlmMode, LlmProvider, LlmRequest, LlmResponse } from "@luke-ux/shared";

type AnthropicMessage = {
  role: "user";
  content: string;
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

    const body = {
      model: request.model,
      max_tokens: 1024,
      temperature,
      messages: [{ role: "user", content: request.prompt } satisfies AnthropicMessage]
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


