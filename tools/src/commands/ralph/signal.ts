/**
 * Raise a real SIGINT on the current process.
 *
 * Readline emits its own "SIGINT" event, but forwarding via `process.emit`
 * only triggers JS listeners and does not invoke the default signal behavior.
 * Sending an actual OS signal preserves normal Ctrl+C semantics.
 */
export default function raiseSigint(): void {
  try {
    process.kill(process.pid, "SIGINT");
  } catch {
    process.exit(130);
  }
}
