export interface Logger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  startLoading: (text: string) => void
  stopLoading: (text?: string, options?: { success: boolean }) => void
}
