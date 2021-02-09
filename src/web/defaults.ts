import pino from "pino";
import pinoHttp from "pino-http";
import { logger } from "../system/logger";

export const PORT = process.env.SERVER_PORT || "7979";
export const HOST = process.env.SERVER_HOST || "0.0.0.0";

export const PINO_LOGGER: pinoHttp.Options = {
  logger: logger.child({ name: "web" }),
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      body: req.body,
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
      id: req.id,
    }),
    err: (err) => {
      const { type, message } = pino.stdSerializers.err(err);
      return { type, message };
    },
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
};
