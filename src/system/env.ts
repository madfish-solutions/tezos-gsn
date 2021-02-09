import assert from "assert";

export function assertEnv(...keys: string[]) {
  for (const key of keys) {
    assert(
      key in process.env,
      `Require a '${key}' environment variable to be set`
    );
  }
}
