type ErrorWithStatus = Error & { status?: number };

export function isRetryableAIError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const status = (error as ErrorWithStatus).status;
  if (status) {
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }

  return /\b429\b|rate[ _-]?limit|too many requests|限流|频率限制|temporar|timeout|timed out/i.test(error.message);
}
