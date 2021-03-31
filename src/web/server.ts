import express from "express"
import helmet from "helmet"
import cors from "cors"
import pinoHttp from "pino-http"
import errorHandler from "errorhandler"
import { logger } from "../system/logger"
import { onClose } from "../system/gracefulShutdown"
import { prodErrorHandler } from "./helpers"
import { PINO_LOGGER, PORT, HOST } from "./defaults"
import { routes } from "./routes"

import { initProvider as initTezosProvider } from "./tezos"
import { initPriceProvider } from "./price"

import priceProviderParams from '../../price_provider.json';

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

  initTezosProvider()

  initPriceProvider(priceProviderParams)
})
