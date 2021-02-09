import { assertEnv } from "./system/env";

assertEnv("KEK");

export const KEK = parseInt(process.env.KEK!);
