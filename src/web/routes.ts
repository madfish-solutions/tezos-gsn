import express from "express"
import createError from "http-errors"
// import { KEK } from "../defaults"
import Tezos from "./tezos"
import { tokensPerMutez, supportedTokens } from "./price"
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

  await Tezos.validateAddress(callParams)

  await Tezos.validate(
    contractAddress,
    callParams.entrypoint,
    callParams.params,
    hash
  )

  const gasEstimate = await Tezos.estimate(req.body)
  const feeTx = Tezos.getFeeTxFromParams(req.body.callParams)

  const userFee = feeTx.amount
  let tokenPrice = await tokensPerMutez(contractAddress, feeTx.token_id)
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
  const tokenAddress = req.query.tokenAddress
  const tokenId = req.query.tokenId as string
  let price = await tokensPerMutez(tokenAddress, parseInt(tokenId))
  res.json(price)
})

routes.get("/tokens", async (req, res) => {
  let tokens = await supportedTokens()
  res.json(tokens)
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
