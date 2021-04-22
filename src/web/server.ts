import express from "express"
import helmet from "helmet"
import cors from "cors"
import pinoHttp from "pino-http"
import errorHandler from "errorhandler"
import { logger } from "../system/logger"
import { onClose } from "../system/gracefulShutdown"
import { prodErrorHandler } from "./helpers"
import { PINO_LOGGER, PORT, HOST } from "./defaults"
import { RPC_PROVIDER, SECRET_KEY } from "../defaults"
import { routes } from "./routes"

import { initToolkit } from "./gsntoolkit"
import { initPriceProvider, tokens as priceProviderTokens } from "./price"
import { initStats } from "./stats"

import priceProviderParams from "../../price_provider.json"

export const toolkit = initToolkit(RPC_PROVIDER, SECRET_KEY)

export const app = express()
  .use(pinoHttp(PINO_LOGGER))
  .use(helmet())
  .use(cors())
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use("/", routes)
  .use(
    process.env.NODE_ENV === "development"
      ? errorHandler({ log: true })
      : prodErrorHandler
  )

export const server = app.listen(+PORT, HOST, async () => {
  onClose(() => new Promise((res) => server.close(() => res())))

  const { address: host, port }: any = server.address()
  logger.info(`Server listening on http://${host}:${port}`)

  initPriceProvider(priceProviderParams)

  const tokens = Object.keys(priceProviderTokens)
  initStats(tokens)
})
