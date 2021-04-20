import express from "express"
import createError from "http-errors"
import * as GsnToolkit from "./gsntoolkit"
import { toolkit } from "./server"
import GasStats from "./gas_stats"
import { tokensPerMutez, supportedTokens } from "./price"
import { GsnError, validateFeeSlippage } from "./helpers"

export const routes = express.Router()

export const transferGasStats = new GasStats()
export const permitGasStats = new GasStats()

routes.get("/", async () => {
  throw createError(404, "Route does not exist")
})

routes.post("/estimate", async (req, res) => {
  const [transfer, permit] = await GsnToolkit.estimate(toolkit, req.body)
  res.json(transfer + permit)
})

routes.post("/submit", async (req, res) => {
  if (req.body.hasOwnProperty("signature")) {
    return await submitAsOptimizedTransfer(req, res)
  } else if (req.body.hasOwnProperty("fee")) {
    return await submitAsArbitraryCalls(req, res)
  }
})

const submitAsArbitraryCalls = async (req, res) => {
  const { fee, calls } = req.body
  await GsnToolkit.validateFeeTransfer(toolkit, fee)
}

const submitAsOptimizedTransfer = async (req, res) => {
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

  const result = await GsnToolkit.submit(
    toolkit,
    contractAddress,
    pubkey,
    signature,
    hash,
    callParams.entrypoint,
    callParams.params
  )

  // add gas used stats in case of success
  transferGasStats.push(transferEstimate)
  permitGasStats.push(permitEstimate)

  return res.json(result)
}

routes.post("/debug_add_gas", async (req, res) => {
  let { gas } = req.body
  transferGasStats.push(parseInt(gas))
  res.json(true)
})

routes.get("/average_transfer_gas", async (req, res) => {
  res.json(transferGasStats.average())
})

routes.get("/average_permit_gas", async (req, res) => {
  res.json(permitGasStats.average())
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
