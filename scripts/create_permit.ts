require("dotenv").config()

const fs = require("fs")
import Tezos from "../src/web/tezos"

import axios from "axios"

const PORT = process.env.SERVER_PORT || "7979"
const HOST = process.env.SERVER_HOST || "http://localhost"

const server = axios.create({
  baseURL: `${HOST}:${PORT}`,
  timeout: 20000,
})

async function main() {
  const args = require("minimist")(process.argv.slice(2))

  let secretKey = args.secret
  let contractAddress = args.contract_address
  let tokenId = args.tokenid || 0
  let to = args.to
  let amount = args.amount

  let relayerAddress = args.relayer_address

  Tezos.initProvider(secretKey)

  const entrypoint = "transfer"
  const dummyFee = 1

  let [preTransferParams, prePermitParams] = await forgeTxAndParams({
    to,
    tokenId,
    amount,
    contractAddress,
    entrypoint,
    relayerAddress,
    relayerFee: dummyFee,
  })

  let preOutput = {
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
  let estimate = await Tezos.estimate(preOutput)
  estimate += 100 // to compensate for dummy estimate occupying not enough bytes
  console.log("Gas estimate for this operation is ", estimate)

  let tokenPrice = await server
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

  let [transferParams, permitParams] = await forgeTxAndParams({
    to,
    tokenId,
    amount,
    contractAddress,
    entrypoint,
    relayerAddress,
    relayerFee: tokenFeeEstimate,
  })

  let output = {
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

  let txid = await server
    .post("/submit", output)
    .then((res) => res.data)
    .catch((e) => console.error(e.response.data))
  console.log("Payment paid by GSN successfully: ", txid)
}

const forgeTxAndParams = async (params) => {
  var transferParams = formTransferParams(
    await Tezos.selfAddress(),
    params.to,
    params.tokenId,
    params.amount,
    params.relayerAddress,
    params.relayerFee
  )

  let permitParams = await Tezos.createPermitPayload(
    params.contractAddress,
    params.entrypoint,
    transferParams
  )

  return [transferParams, permitParams]
}

const formTransferParams = (
  from_,
  to_,
  tokenId,
  amount,
  relayerAddress,
  relayerFee
) => {
  let intendedTx = { to_: to_, token_id: tokenId, amount: amount }

  let feeTx = {
    to_: relayerAddress,
    token_id: tokenId,
    amount: relayerFee,
  }

  let txList = [
    [
      {
        from_: from_,
        txs: [intendedTx, feeTx],
      },
    ],
  ]

  return txList
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(e)
  }
})()
