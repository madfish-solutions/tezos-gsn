// Sample inputs for this script can be found in `create_permit.sh`

require("dotenv").config()

const fs = require("fs")
import * as GsnToolkit from "../src/web/gsntoolkit"
import { formTransferParams } from "./helpers"

import axios from "axios"

const SERVER_ENDPOINT = process.env.SERVER_ENDPOINT || "http://localhost:7979"

const server = axios.create({
  baseURL: SERVER_ENDPOINT,
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

  const toolkit = GsnToolkit.initToolkit(process.env.RPC_PROVIDER, secretKey)

  const entrypoint = "transfer"
  const dummyFee = 1

  var preTransferParams = formTransferParams(
    await toolkit.signer.publicKeyHash(),
    to,
    tokenId,
    amount,
    relayerAddress,
    dummyFee
  )

  const prePermitParams = await GsnToolkit.createPermitPayload(
    toolkit,
    contractAddress,
    entrypoint,
    preTransferParams
  )

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
  const [transferEstimate, permitEstimate] = await GsnToolkit.estimate(
    toolkit,
    preOutput
  )
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

  var transferParams = formTransferParams(
    await toolkit.signer.publicKeyHash(),
    to,
    tokenId,
    amount,
    relayerAddress,
    tokenFeeEstimate
  )

  const permitParams = await GsnToolkit.createPermitPayload(
    toolkit,
    contractAddress,
    entrypoint,
    transferParams
  )

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
