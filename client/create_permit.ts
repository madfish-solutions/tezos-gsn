// Sample inputs for this script can be found in `create_permit.sh`

require("dotenv").config()

const fs = require("fs")
import * as Tezos from "../src/web/tezos"
import { forgeTxAndParams, formTransferParams } from "./helpers"

import axios from "axios"

const PORT = process.env.SERVER_PORT || "7979"
const HOST = process.env.SERVER_HOST || "http://localhost"

const server = axios.create({
  baseURL: `${HOST}:${PORT}`,
  timeout: 45000,
})

async function main() {
  const args = require("minimist")(process.argv.slice(2))

  const secretKey = args.secret
  const contractAddress = args.contract_address
  const tokenId = args.tokenid || 0
  const to = args.to
  const amount = args.amount

  const relayerAddress = args.relayer_address

  Tezos.initProvider(secretKey)

  const entrypoint = "transfer"
  const dummyFee = 1

  const [preTransferParams, prePermitParams] = await forgeTxAndParams({
    to,
    tokenId,
    amount,
    contractAddress,
    entrypoint,
    relayerAddress,
    relayerFee: dummyFee,
  })

  const preOutput = {
    pubkey: prePermitParams["pubkey"],
    signature: prePermitParams["signature"],
    hash: prePermitParams["hash"],
    contractAddress: contractAddress,
    to: to,
    tokenId: tokenId,
    amount: amount,
    fee: dummyFee,
    callParams: {
      entrypoint: entrypoint,
      params: preTransferParams,
    },
  }
  const [transferEstimate, permitEstimate] = await Tezos.estimate(preOutput)
  const estimate = transferEstimate + permitEstimate + 200 // to compensate for dummy estimate occupying not enough bytes
  console.log("Gas estimate for this operation is ", estimate)

  const tokenPrice = await server
    .get(`/price?tokenAddress=${contractAddress}&tokenId=${tokenId}`)
    .then((res) => res.data)
  console.log("Token price is", tokenPrice.price, "per mutez")

  let tokenFeeEstimate =
    tokenPrice.price * estimate * Math.pow(10, tokenPrice.decimals)
  tokenFeeEstimate = Math.floor(tokenFeeEstimate)
  console.log(
    "Total fee is",
    tokenFeeEstimate / Math.pow(10, tokenPrice.decimals),
    "tokens. ",
    tokenFeeEstimate,
    "mutokens."
  )

  const [transferParams, permitParams] = await forgeTxAndParams({
    to,
    tokenId,
    amount,
    contractAddress,
    entrypoint,
    relayerAddress,
    relayerFee: tokenFeeEstimate,
  })

  const output = {
    pubkey: permitParams["pubkey"],
    signature: permitParams["signature"],
    hash: permitParams["hash"],
    contractAddress: contractAddress,
    to: to,
    tokenId: tokenId,
    amount: amount,
    fee: tokenFeeEstimate,
    callParams: {
      entrypoint: entrypoint,
      params: transferParams,
    },
  }

  fs.writeFileSync("fixtures/permit.json", JSON.stringify(output))

  const txid = await server
    .post("/submit", output)
    .then((res) => res.data)
    .catch((e) => console.error(e.response.data))
  console.log("Payment paid by GSN successfully: ", txid)
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(e)
  }
})()
