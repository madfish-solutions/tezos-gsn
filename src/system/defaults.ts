import ms from "ms";
import path from "path";

export const GRACEFUL_SHUTDOWN_TIMEOUT = ms("10 seconds");
export const GRACEFUL_SHUTDOWN_EXIT_EVENTS = [
  // do something when app is closing
  "exit",
  // catches ctrl+c event
  "SIGINT",
  "SIGTERM",
  // catches "kill pid" (for example: nodemon restart)
  "SIGUSR1",
  "SIGUSR2",
  // catches uncaught exceptions
  "uncaughtException",
];

export const PINO = {
  prettyPrint: true,
  level: "info",
};

export const CWD_PATH = process.cwd();
export const ROOT_PATH = path.join(__dirname, "../..");

export const USER_AGENT = [
  "Mozilla/5.0",
  "(Windows NT 10.0; Win64; x64)",
  "AppleWebKit/537.36",
  "(KHTML, like Gecko)",
  "Chrome/62.0.3202.94",
  "Safari/537.36",
].join(" ");
