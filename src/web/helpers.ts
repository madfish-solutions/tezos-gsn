import http from "http"
import express from "express"

const { Tezos, MichelsonMap, TezosToolkit, ECKey } = require("@taquito/taquito")

export const prodErrorHandler: express.ErrorRequestHandler = (
  err,
  _req,
  res,
  _next // eslint-disable-line
) => {
  const code = err.code || err.status || 500
  const codeMessage = http.STATUS_CODES[code]

  res.statusCode = code
  res.end(
    code === 500 && process.env.NODE_ENV === "production"
      ? codeMessage
      : (err.length && err) || err.message || codeMessage
  )
}

export let tokenPrice = async (contractAddress: string) => {
  return 0.01 // TODO obtain a proper price
}
