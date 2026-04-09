const DEFAULT_API_URL =
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const DEFAULT_OPENAI_COMPATIBLE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

export type ProviderMessageRole = 'system' | 'user' | 'assistant';

export interface ProviderMessage {
  role: ProviderMessageRole;
  content: string;
}

export interface DashScopeConfig {
  apiKey: string;
  model: string;
  apiUrl?: string;
  compatibleBaseUrl?: string;
}

export interface GenerationOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerationResult {
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  provider: 'compatible' | 'native';
}

export class DashScopeError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DashScopeError';
  }
}

function toStringCode(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function normalizeMessages(
  input: string | ProviderMessage[],
  options: GenerationOptions
): ProviderMessage[] {
  if (typeof input === 'string') {
    const base: ProviderMessage[] = [];
    if (options.systemPrompt) {
      base.push({ role: 'system', content: options.systemPrompt });
    }
    base.push({ role: 'user', content: input });
    return base;
  }

  const cleaned = input
    .filter((m) => (m.role === 'user' || m.role === 'assistant' || m.role === 'system') && m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  if (options.systemPrompt && !cleaned.some((m) => m.role === 'system')) {
    return [{ role: 'system', content: options.systemPrompt }, ...cleaned];
  }

  return cleaned;
}

function parseUsage(data: unknown): { input_tokens: number; output_tokens: number } {
  const usage = (data as { usage?: Record<string, unknown> }).usage ?? {};
  const inputTokens = Number(
    usage.prompt_tokens ?? usage.input_tokens ?? usage.inputTokenCount ?? 0
  );
  const outputTokens = Number(
    usage.completion_tokens ?? usage.output_tokens ?? usage.outputTokenCount ?? 0
  );

  return {
    input_tokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    output_tokens: Number.isFinite(outputTokens) ? outputTokens : 0,
  };
}

function parseText(data: unknown): string {
  const compatibleMessage =
    (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content;

  if (typeof compatibleMessage === 'string' && compatibleMessage.trim().length > 0) {
    return compatibleMessage.trim();
  }

  const compatibleText = (data as { choices?: Array<{ text?: string }> }).choices?.[0]?.text;
  if (typeof compatibleText === 'string' && compatibleText.trim().length > 0) {
    return compatibleText.trim();
  }

  const nativeMessage =
    (data as { output?: { choices?: Array<{ message?: { content?: string } }> } }).output?.choices?.[0]
      ?.message?.content;
  if (typeof nativeMessage === 'string' && nativeMessage.trim().length > 0) {
    return nativeMessage.trim();
  }

  const nativeText = (data as { output?: { text?: string } }).output?.text;
  if (typeof nativeText === 'string' && nativeText.trim().length > 0) {
    return nativeText.trim();
  }

  return '';
}

async function parseError(response: Response): Promise<DashScopeError> {
  const errorData = await response.json().catch(() => ({}));
  const responseCode =
    (errorData as { error?: { code?: unknown }; code?: unknown }).error?.code ??
    (errorData as { code?: unknown }).code;
  const parsedCode = toStringCode(responseCode, `HTTP_${response.status}`);

  if (response.status === 403 && parsedCode === 'AllocationQuotaFreeTierOnly') {
    return new DashScopeError('Free quota exhausted. Please contact support.', 'QUOTA_EXCEEDED');
  }

  return new DashScopeError(`API Error: ${response.status}`, parsedCode);
}

/**
 * Generates a response using DashScope Qwen model.
 * Tries OpenAI-compatible endpoint first, then native endpoint.
 */
export async function generateExplanation(
  input: string | ProviderMessage[],
  config: DashScopeConfig,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const endpoint = (config.apiUrl ?? process.env.DASHSCOPE_API_URL ?? DEFAULT_API_URL).trim();
  const compatibleBaseUrl = (
    config.compatibleBaseUrl ??
    process.env.DASHSCOPE_OPENAI_COMPATIBLE_URL ??
    DEFAULT_OPENAI_COMPATIBLE_URL
  )
    .trim()
    .replace(/\/$/, '');

  const compatibleEndpoint = `${compatibleBaseUrl}/chat/completions`;
  const messages = normalizeMessages(input, options);
  if (messages.length === 0) {
    throw new DashScopeError('No valid messages to send.', 'BAD_REQUEST');
  }

  const temperature = Number.isFinite(options.temperature) ? Number(options.temperature) : 0.2;
  const maxTokens = Number.isFinite(options.maxTokens) ? Number(options.maxTokens) : 420;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const compatibleResponse = await fetch(compatibleEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (compatibleResponse.ok) {
      const data = await compatibleResponse.json();
      const text = parseText(data);

      if (!text) {
        throw new DashScopeError('Empty response from AI service.', 'EMPTY_RESPONSE');
      }

      clearTimeout(timeoutId);
      return {
        text,
        usage: parseUsage(data),
        provider: 'compatible',
      };
    }

    const compatibleError = await parseError(compatibleResponse);
    if (compatibleError.code === 'Model.AccessDenied' || compatibleError.code === 'QUOTA_EXCEEDED') {
      throw compatibleError;
    }

    const nativeResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        input: { messages },
        parameters: {
          temperature,
          max_tokens: maxTokens,
          result_format: 'message',
        },
      }),
      signal: controller.signal,
    });

    if (!nativeResponse.ok) {
      throw await parseError(nativeResponse);
    }

    const nativeData = await nativeResponse.json();
    const nativeText = parseText(nativeData);
    if (!nativeText) {
      throw new DashScopeError('Empty response from AI service.', 'EMPTY_RESPONSE');
    }

    clearTimeout(timeoutId);
    return {
      text: nativeText,
      usage: parseUsage(nativeData),
      provider: 'native',
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new DashScopeError('Request timed out after 15 seconds.', 'TIMEOUT');
    }

    if (error instanceof DashScopeError) {
      throw error;
    }

    throw new DashScopeError('Failed to connect to AI service.', 'NETWORK_ERROR');
  }
}
