require('dotenv').config()

const {
  ContractAbstraction,
  ContractProvider,
  TezosToolkit,
} = require("@taquito/taquito")
const { InMemorySigner, importKey } = require("@taquito/signer")
const { Parser, emitMicheline } = require("@taquito/michel-codec")
const { assert } = require("console")
import Tezos from "../src/web/tezos"
import { formTransferParams } from "./lib"

async function main() {

  const args = require("minimist")(process.argv.slice(2))

  let secretKey = args.secret
  let contractAddress = args.contract_address
  let tokenId = args.tokenid || 0
  let to = args.to
  let amount = args.amount

  let relayerAddress = args.relayer_address
  let relayerFee = args.fee || 1

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
    relayerFee: dummyFee
  })



  let preOutput = {
    pubkey: prePermitParams.pubkey,
    signature: prePermitParams.signature,
    hash: prePermitParams.hash,
    contractAddress: contractAddress,
    to: to,
    tokenId: tokenId,
    amount: amount,
    fee: dummyFee,
    callParams: {
      entrypoint: entrypoint,
      params: preTransferParams
    }
  }

  let estimate = await Tezos.estimate(preOutput)
  estimate += 10 // to compensate for dummy estimate occupying not enough bytes 

  //TODO multiply estimate by price per mutez

  let [transferParams, permitParams] = await forgeTxAndParams({
    to,
    tokenId,
    amount,
    contractAddress,
    entrypoint,
    relayerAddress,
    relayerFee: estimate
  })

  let output = {
    pubkey: permitParams.pubkey,
    signature: permitParams.signature,
    hash: permitParams.hash,
    contractAddress: contractAddress,
    to: to,
    tokenId: tokenId,
    amount: amount,
    fee: dummyFee,
    callParams: {
      entrypoint: entrypoint,
      params: transferParams
    }
  }

  console.log(JSON.stringify(output))

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


const getBytesToSignFromErrors = (errors) => {
  const errors_with = errors.map((x) => x.with).filter((x) => x !== undefined)
  if (errors_with.length != 1) {
    throw [
      'errors_to_missigned_bytes: expected one error to fail "with" michelson, but found:',
      errors_with,
    ]
  } else {
    const error_with = errors_with[0]
    const p = new Parser()
    const michelsonCode = p.parseJSON(error_with)
    if (error_with.prim !== "Pair") {
      throw [
        'errors_to_missigned_bytes: expected a "Pair", but found:',
        error_with.prim,
      ]
    } else {
      const error_with_args = error_with.args
      if (error_with_args.length !== 2) {
        throw [
          'errors_to_missigned_bytes: expected two arguments to "Pair", but found:',
          error_with_args,
        ]
      } else {
        if (error_with_args[0].string.toLowerCase() !== "missigned") {
          throw [
            'errors_to_missigned_bytes: expected a "missigned" annotation, but found:',
            error_with_args[0],
          ]
        } else {
          if (typeof error_with_args[1].bytes !== "string") {
            throw [
              "errors_to_missigned_bytes: expected bytes, but found:",
              error_with_args[1].bytes,
            ]
          } else {
            return error_with_args[1].bytes
          }
        }
      }
    }
  }
}


;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(e)
  }
})()

