import { MESSAGES } from '@/config/site';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** يحاكي زمن استجابة الشبكة. احذفه عند ربط الواجهة بخادم حقيقي. */
export function wait(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return MESSAGES.genericError;
}
