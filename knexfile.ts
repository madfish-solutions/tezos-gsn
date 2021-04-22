import "dotenv/config"

// Hook from source config.
import { KNEX } from "./src/db/defaults"
module.exports = KNEX
