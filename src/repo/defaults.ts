import path from "path";
import { Config } from "knex";
import { assertEnv } from "../system/env";
import { logger } from "../system/logger";
import { CWD_PATH, ROOT_PATH } from "../system/defaults";

assertEnv("DB_CLIENT");

const knexLogger = logger.child({ name: "knex" });
const client = process.env.DB_CLIENT!;
const sqlite3Client = client === "sqlite3";

assertEnv(sqlite3Client ? "NODE_ENV" : "DB_CONNECTION");

// eslint-disable-next-line
export const KNEX: Config = require("knex-stringcase")({
  client,
  connection: sqlite3Client
    ? { filename: path.join(CWD_PATH, `${process.env.NODE_ENV!}.sqlite3`) }
    : process.env.DB_CONNECTION,
  pool: !sqlite3Client
    ? {
        min: 2,
        max: 10,
      }
    : undefined,
  useNullAsDefault: sqlite3Client,
  migrations: {
    directory: path.join(ROOT_PATH, "knex/migrations"),
    tableName: "migrations",
  },
  seeds: {
    directory: path.join(ROOT_PATH, "knex/seeds"),
  },
  debug: false,
  log: {
    warn(msg) {
      // Temporary hack
      if (msg?.includes("migrationSource")) return;

      knexLogger.warn(msg);
    },
    error(msg) {
      knexLogger.error(msg);
    },
    deprecate(msg) {
      knexLogger.warn(msg);
    },
    debug(msg) {
      knexLogger.debug(msg);
    },
  },
} as Config);
