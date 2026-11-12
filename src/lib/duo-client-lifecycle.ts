export class DuoApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly reason?: string) { super(message); this.name = 'DuoApiError'; }
}
export function isDuoTerminalError(cause: unknown): cause is DuoApiError {
  return cause instanceof DuoApiError && (cause.status === 410 || cause.status === 404 && cause.reason === 'room_not_found');
}

export class DuoTimeoutError extends Error {
  constructor() {
    super('The connection is taking too long. Your last saved choices are safe.');
    this.name = 'DuoTimeoutError';
  }
}

/** Bound fetch and response parsing, while preserving caller cancellation. */
export async function withDuoDeadline<T>(
  request: (signal: AbortSignal) => Promise<T>,
  parent?: AbortSignal,
  ms = 10_000,
): Promise<T> {
  parent?.throwIfAborted();
  const controller = new AbortController();
  const cancel = () => controller.abort(parent?.reason);
  parent?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new DuoTimeoutError()), ms);
  let rejectOnAbort: () => void = () => {};
  try {
    const cancelled = new Promise<never>((_, reject) => {
      rejectOnAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
    });
    return await Promise.race([cancelled, request(controller.signal)]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', rejectOnAbort);
  }
}

/** One in-flight heartbeat, with immediate recovery after a browser lifecycle wake. */
export function startDuoPolling(options: {
  request(signal: AbortSignal): Promise<void>;
  failure(cause: unknown): void;
  isHidden(): boolean;
  isVoiceActive(): boolean;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
}) {
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let stopped = false;
  let running = false;
  let wakePending = false;
  let failures = 0;
  let hiddenAt: number | null = options.isHidden() ? now() : null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  const clear = () => { if (timer !== undefined) cancel(timer); timer = undefined; };
  const poll = async () => {
    clear();
    if (stopped || running) return;
    if (options.isHidden() && !options.isVoiceActive() && hiddenAt !== null && now() - hiddenAt >= 25_000) return;
    running = true;
    controller = new AbortController();
    try { await options.request(controller.signal); failures = 0; }
    catch (cause) {
      if (!stopped && !controller.signal.aborted) {
        failures++;
        options.failure(cause);
        if (isDuoTerminalError(cause)) stopped = true;
      }
    }
    finally {
      running = false;
      if (!stopped) {
        const delay = wakePending ? 0 : Math.min(25_000, (options.isHidden() ? 8_000 : 3_500) * 2 ** Math.min(failures, 3));
        wakePending = false;
        timer = schedule(() => { void poll(); }, delay);
      }
    }
  };
  const wake = () => {
    if (stopped) return;
    if (options.isHidden()) { hiddenAt ??= now(); return; }
    clear();
    hiddenAt = null;
    if (running) wakePending = true;
    else void poll();
  };
  void poll();
  return { wake, stop() { stopped = true; clear(); controller?.abort(); } };
}

/** Conditional heartbeats have no JSON body and still establish connectivity. */
export async function readDuoResponseJson(response: Response): Promise<Record<string, unknown> | null> {
  if (response.status === 304 || response.status === 204) return null;
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

/** Keep the application validator intact across CDN compression/revalidation. */
export function duoResponseValidator(response: Response): string | undefined {
  return response.headers.get('X-Duo-ETag') ?? response.headers.get('ETag') ?? undefined;
}
