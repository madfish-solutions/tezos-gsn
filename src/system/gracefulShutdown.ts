import { logger } from "./logger";
import {
  GRACEFUL_SHUTDOWN_TIMEOUT,
  GRACEFUL_SHUTDOWN_EXIT_EVENTS,
} from "./defaults";

type Handler = () => void | Promise<void>;

const handlers: Handler[] = [];
export function onClose(handler: Handler) {
  handlers.unshift(handler);
}

let closing = false;
export async function close(exitCode = 0) {
  if (closing) return;
  closing = true;

  if (handlers.length > 0) {
    logger.info("Gracefully shutting down...");

    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, GRACEFUL_SHUTDOWN_TIMEOUT)),
      (async () => {
        for (const handler of handlers) {
          try {
            await handler();
          } catch (_err) {}
        }
      })(),
    ]);
  }

  process.exit(exitCode);
}

for (const evt of GRACEFUL_SHUTDOWN_EXIT_EVENTS) {
  process.on(evt, close);
}
