import express from "express"
import createError from "http-errors"
// import { KEK } from "../defaults"
import Tezos from "./tezos"
import { tokensPerMutez } from "./price"
import { GsnError, validateFeeSlippage } from "./helpers"

export const routes = express.Router()

routes.get("/", async (_req, _res) => {
  throw createError(404, "Route does not exist")
})

routes.post("/estimate", async (req, res) => {
  let estimate = await Tezos.estimate(req.body)
  res.json(estimate)
})

routes.post("/submit", async (req, res) => {
  const { signature, hash, pubkey, contractAddress, callParams } = req.body

  try {
    await Tezos.validateAddress(callParams)

  await Tezos.validate(
    contractAddress,
    callParams.entrypoint,
    callParams.params,
    hash
  )

  const gasEstimate = await Tezos.estimate(req.body)

  const userFee = Tezos.getFeeTxFromParams(req.body.callParams).amount
  let tokenPrice = await tokensPerMutez(contractAddress)
  let ourFee =
    tokenPrice.price * gasEstimate * Math.pow(10, tokenPrice.decimals)

  validateFeeSlippage(userFee, ourFee)

  let result = await Tezos.submit(
    contractAddress,
    pubkey,
    signature,
    hash,
    callParams.entrypoint,
    callParams.params
  )
  res.json(result)
})

routes.get("/price", async (req, res) => {
  let { tokenAddress } = req.query
  let price = await tokensPerMutez(tokenAddress)
  res.json(price)
})

routes.use(function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  if (err instanceof GsnError) {
    return res.status(400).json({
      error: err.message,
      ...err.data,
    })
  }
  res.status(400).json({
    error: err.name,
    id: err.id,
    message: err.message,
  })
})
