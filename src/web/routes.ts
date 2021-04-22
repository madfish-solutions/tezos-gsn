import express, { Router } from "express"
import createError from "http-errors"
import * as GsnToolkit from "./gsntoolkit"
import { toolkit } from "./server"
import * as Stats from "./stats"
import { tokensPerMutez, supportedTokens } from "./price"
import { GsnError, validateFeeSlippage } from "./helpers"

export const routes = express.Router()
let faucetTimeout = false

routes.get("/", async () => {
  throw createError(404, "Route does not exist")
})

routes.post("/estimate", async (req, res) => {
  const [transfer, permit] = await GsnToolkit.estimate(toolkit, req.body)
  res.json(transfer + permit)
})

routes.post("/submit", async (req, res) => {
  const { signature, hash, pubkey, contractAddress, callParams } = req.body

  await GsnToolkit.validateAddress(toolkit, callParams)

  await GsnToolkit.validate(
    toolkit,
    contractAddress,
    callParams.entrypoint,
    callParams.params,
    hash
  )

  const [transferEstimate, permitEstimate] = await GsnToolkit.estimate(
    toolkit,
    req.body
  )
  const gasEstimate = transferEstimate + permitEstimate
  const feeTx = GsnToolkit.getFeeTxFromParams(req.body.callParams)

  const userFee = feeTx.amount
  const tokenPrice = await tokensPerMutez(contractAddress, feeTx.token_id)
  const ourFee =
    tokenPrice.price * gasEstimate * Math.pow(10, tokenPrice.decimals)

  validateFeeSlippage(userFee, ourFee)

  const operation = await GsnToolkit.submit(
    toolkit,
    contractAddress,
    pubkey,
    signature,
    hash,
    callParams.entrypoint,
    callParams.params
  )

  // track stats in case of success
  const tokenIdentifier = contractAddress + ":" + feeTx.token_id

  Stats.add(
    operation.hash,
    req.body,
    tokenIdentifier,
    gasEstimate,
    ourFee,
    userFee
  )

  res.json({
    hash: operation.hash,
    results: operation.results,
  })
})

routes.get("/stats", async (req, res) => {
  const gas = {}
  console.log(Stats.gas)
  for (const token of Object.keys(Stats.gas)) {
    gas[token] = {
      average: Stats.gas[token].getAverage(),
      total: Stats.gas[token].total,
    }
  }
  const fee = {}
  for (const token of Object.keys(Stats.fee)) {
    fee[token] = {
      average: Stats.fee[token].getAverage(),
      total: Stats.fee[token].total,
    }
  }
  res.json({ gas, fee })
})

routes.get("/faucet", async (req, res) => {
  if (faucetTimeout) {
    return res.json("Faucet is blocked. Please try again in 10 seconds")
  }
  faucetTimeout = true
  setTimeout(() => {
    faucetTimeout = false
  }, 10_000)

  const { address } = req.query
  const tokenAddress = "KT1HT65Jw3wUPHshjH1EwCZRQbXNRTfhS6So"
  const transferHash = await GsnToolkit.pour(toolkit, tokenAddress, address)
  return res.json({ operationHash: transferHash, tokenAddress: tokenAddress })
})

routes.get("/price", async (req, res) => {
  const tokenAddress = req.query.tokenAddress
  const tokenId = req.query.tokenId as string
  const price = await tokensPerMutez(tokenAddress, parseInt(tokenId))
  res.json(price)
})

routes.post("/db", async (req, res) => {
  Stats.add(
    "gyga",
    '{"gyga": 1}',
    "KT1LEsmxw5LLUbZe3vdsDbcE39WK7tATda2h",
    10,
    100,
    1_000
  )
  res.json("ok")
})

routes.get("/tokens", async (_, res) => {
  const tokens = await supportedTokens()
  res.json({
    relayer: {
      address: await toolkit.signer.publicKeyHash(),
      pubkey: await toolkit.signer.publicKey(),
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
