import ora from 'ora'
import chalk from 'chalk'
import type { Logger } from './logger.types'

export class OraLogger implements Logger {
  private spinner = ora()

  debug(message: string, ...args: unknown[]): void {
    this.spinner.stop()
    console.debug(chalk.gray(`${message}`), ...this.formatArgs(args))
  }

  info(message: string, ...args: unknown[]): void {
    this.spinner.stop()
    console.info(chalk.white(`${message}`), ...this.formatArgs(args))
  }

  warn(message: string, ...args: unknown[]): void {
    this.spinner.stop()
    console.warn(chalk.yellow(`${message}`), ...this.formatArgs(args))
  }

  error(message: string, ...args: unknown[]): void {
    this.spinner.fail()
    console.error(chalk.red(`${message}`), ...this.formatArgs(args))
  }

  // Loading spinner methods
  startLoading(text: string): void {
    this.spinner.start(text)
  }

  stopLoading(text?: string, options: { success: boolean } = { success: true }): void {
    if (options.success) {
      this.spinner.succeed(text)
    } else {
      this.spinner.fail(text)
    }
  }

  private formatArgs(args: unknown[]): unknown[] {
    return args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg))
  }
}
