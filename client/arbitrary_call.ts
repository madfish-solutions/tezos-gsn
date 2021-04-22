// Sample inputs for this script can be found in `create_permit.sh`

require("dotenv").config()

const fs = require("fs")
import * as GsnToolkit from "../src/web/gsntoolkit"
import { formSimpleTransferParams } from "./helpers"

import axios from "axios"

import calls from "./calls.json"

import util from "util"

const SERVER_ENDPOINT = process.env.SERVER_ENDPOINT || "http://localhost:7979"

const server = axios.create({
  baseURL: SERVER_ENDPOINT,
  timeout: 45000,
})

async function main() {
  const args = require("minimist")(process.argv.slice(2))

  const secretKey = args.secret
  const feeTokenAddress = args.fee_token_address
  const feeTokenId = args.fee_token_id || 0
  const to = args.to
  const amount = args.amount

  const relayerAddress = args.relayer_address

  const toolkit = GsnToolkit.initToolkit(process.env.RPC_PROVIDER, secretKey)
  console.log(await toolkit.signer.publicKeyHash())

  const dummyFee = 1

  let estimate = 0

  // let calls = require("calls.json")

  const preFeeTransfer = formSimpleTransferParams(
    await toolkit.signer.publicKeyHash(),
    relayerAddress,
    feeTokenId,
    dummyFee
  )

  const [
    prePermitEstimate,
    preTransferEstimate,
  ] = await GsnToolkit.estimatePermittedCall(toolkit, {
    contract: feeTokenAddress,
    entrypoint: "transfer",
    args: preFeeTransfer,
  })

  estimate += prePermitEstimate + preTransferEstimate + 200 // to compensate for dummy estimate occupying not enough bytes

  for (const call of calls) {
    const [
      permitEstimate,
      callEstimate,
    ] = await GsnToolkit.estimatePermittedCall(toolkit, call)
    estimate += permitEstimate + callEstimate
  }

  console.log("Gas estimate for this operation is ", estimate)

  const tokenPrice = await server
    .get(`/price?tokenAddress=${feeTokenAddress}&tokenId=${feeTokenId}`)
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

  const feeTransfer = formSimpleTransferParams(
    await toolkit.signer.publicKeyHash(),
    relayerAddress,
    feeTokenId,
    tokenFeeEstimate
  )

  let permitOffset = 0

  const permitParams = await GsnToolkit.createPermitPayload(
    toolkit,
    feeTokenAddress,
    "transfer",
    feeTransfer,
    permitOffset
  )

  const fee = {
    contract: feeTokenAddress,
    permit: permitParams,
    args: feeTransfer,
  }

  permitOffset += 1

  const permittedCalls: Array<any> = []
  for (const call of calls) {
    const permit = await GsnToolkit.createPermitPayload(
      toolkit,
      call.contract,
      call.entrypoint,
      call.args,
      permitOffset
    )

    permittedCalls.push({
      permit: permit,
      contract: call.contract,
      entrypoint: call.entrypoint,
      args: call.args,
    })

    permitOffset += 1
  }

  const submitPayload = {
    fee: fee,
    calls: permittedCalls,
  }
  console.log(util.inspect(submitPayload, { showHidden: false, depth: null }))

  fs.writeFileSync("arbitraryCall.json", JSON.stringify(submitPayload))

  // const txid = await server
  //   .post("/submit", {
  //     fee: fee,
  //     calls: permittedCalls,
  //   })
  //   .then((res) => res.data)
  //   .catch((e) => console.error(e.response.data))
  // console.log("Payment paid by GSN successfully: ", txid)
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(util.inspect(e, { showHidden: false, depth: null }))
  }
})()
