// Local ids never need to interoperate with the server's cuid()s (this is a
// standalone on-device database) — a short random id is enough.
export function genId(): string {
  return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export class LocalApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
