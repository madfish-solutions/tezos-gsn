import express from "express"
import createError from "http-errors"
import * as Tezos from "./tezos"
import { tokensPerMutez, supportedTokens } from "./price"
import { GsnError, validateFeeSlippage } from "./helpers"

export const routes = express.Router()

routes.get("/", async () => {
  throw createError(404, "Route does not exist")
})

routes.post("/estimate", async (req, res) => {
  const estimate = await Tezos.estimate(req.body)
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
  const tokenPrice = await tokensPerMutez(contractAddress, feeTx.token_id)
  const ourFee =
    tokenPrice.price * gasEstimate * Math.pow(10, tokenPrice.decimals)

  validateFeeSlippage(userFee, ourFee)

  const result = await Tezos.submit(
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
  const price = await tokensPerMutez(tokenAddress, parseInt(tokenId))
  res.json(price)
})

routes.get("/tokens", async (_, res) => {
  const tokens = await supportedTokens()
  res.json({
    relayer: {
      address: await Tezos.selfAddress(),
      pubkey: await Tezos.selfPubkey(),
    },
    tokens: tokens,
  })
})

routes.use(function errorHandler(err, _, res, next) {
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
