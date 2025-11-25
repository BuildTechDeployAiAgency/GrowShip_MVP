const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

interface PostJsonOptions {
  retries?: number;
  retryDelayMs?: number;
  headers?: Record<string, string>;
}

export async function postJson<TPayload, TResponse>(
  url: string,
  payload: TPayload,
  options: PostJsonOptions = {}
): Promise<TResponse> {
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 250;
  const headers = {
    "content-type": "application/json",
    ...options.headers,
  };

  const attempt = async (remaining: number, delay: number): Promise<TResponse> => {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (remaining > 0 && RETRYABLE_STATUS.has(response.status)) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return attempt(remaining - 1, delay * 2);
      }

      const errorBody = await response.json().catch(() => ({}));
      const message =
        (errorBody && (errorBody.message || errorBody.error)) ||
        `Request to ${url} failed with status ${response.status}`;
      throw new Error(message);
    }

    return (await response.json()) as TResponse;
  };

  return attempt(retries, retryDelayMs);
}

