import express from "express"
import createError from "http-errors"
// import { KEK } from "../defaults"
import Tezos from "./tezos"
import { tokensPerMutez, isFeeAcceptable } from "../web/helpers"

export const routes = express.Router()

routes.get("/", async (_req, _res) => {
  throw createError(404, "Route does not exist")
})

routes.post("/submit", async (req, res) => {
  const { signature, hash, pubkey, contractAddress, callParams } = req.body

  let isValid = await Tezos.validate(
    contractAddress,
    callParams.entrypoint,
    callParams.params,
    hash
  )

  if (!isValid) {
    res.status(400).json({
      error: "hash_does_not_match_to_params",
    })
  }

  let gasEstimate = await Tezos.estimate(req.body)
  console.log(gasEstimate)

  const userPrice = req.body.fee
  let ourGasPriceInToken = await tokensPerMutez(contractAddress)
  if (!isFeeAcceptable(userPrice, ourGasPriceInToken)) {
    res.status(400).json({
      error: "fee_is_too_low",
      requested_price: userPrice,
      calculated_price: ourGasPriceInToken,
    })
  }

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
