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

export const isFeeAcceptable = (userFee, newlyEstimatedFee) => {
  let allowedDecrease = 0.01
  if (process.env.ALLOWED_FEE_DECREASE) {
    allowedDecrease = parseFloat(process.env.ALLOWED_FEE_DECREASE)
  }

  return newlyEstimatedFee > userFee * (1.0 - allowedDecrease)
}

export const tokensPerMutez = async (contractAddress: string) => {
  return 2 // TODO obtain a proper price
}
