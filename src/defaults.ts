import { assertEnv } from "./system/env"

assertEnv("RPC_PROVIDER")
assertEnv("SECRET_KEY")

export const RPC_PROVIDER = process.env.RPC_PROVIDER!
export const SECRET_KEY = process.env.SECRET_KEY!
