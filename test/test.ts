require("dotenv").config()

import { TezosToolkit } from "@taquito/taquito"
import { InMemorySigner, importKey } from "@taquito/signer"
import utils from "@taquito/utils"
import assert from "assert"
import util from "util"
import * as Tezos from "../src/web/tezos"
import { forgeTxAndParams, formTransferParams } from "../client/helpers"
import crypto from "crypto"
import { request } from "supertest"

import { execSync } from "child_process"

const rpcProvider = process.env.RPC_PROVIDER || "http://127.0.0.1:8732"

const gsnSecretKey = "edsk3ZBkw7qZMkLEJd7Fyt8ffPVVBuGEZ9MS5U6TjgtYQzPQVj3hgC" //trent
const aliceSecretKey = "edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq"
const bobSecretKey = "edsk3RFfvaFaxbHx8BMtEW1rKQcPtDML3LXjNqMNLCzC3wLC1bWbAt"
const eveSecretKey = "edsk3Sb16jcx9KrgMDsbZDmKnuN11v4AbTtPBgBSBTqYftd8Cq3i1e"

const gsnProvider = new TezosToolkit(rpcProvider)
const aliceProvider = new TezosToolkit(rpcProvider)
const bobProvider = new TezosToolkit(rpcProvider)
const eveProvider = new TezosToolkit(rpcProvider)

let contractAddress = ""

const gsnAddress = "tz1TfRXkAxbQ2BFqKV2dF4kE17yZ5BmJqSAP"
const aliceAddress = "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb"
const bobAddress = "tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6"
const eveAddress = "tz1MnmtP4uAcgMpeZN6JtyziXeFqqwQG6yn6"
const burnAddress = "tz1burnburnburnburnburnburnburjAYjjX"

const toTez = (num) => num * 1000000

const deepInspect = (obj) => console.log(util.inspect(obj, true, 8, true))

const getFromMap = (x, y, map) =>
  map.get({ "0": x.toString(), "1": y.toString() })

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const generateRandomAddress = () => {
  const fakeKeyHashBytes = Buffer.alloc(20)
  crypto.randomFillSync(fakeKeyHashBytes)
  return utils.b58cencode(
    new Uint8Array(fakeKeyHashBytes),
    utils.prefix[utils.Prefix.TZ1]
  )
}

const burnToBake = async () => {
  const op = await gsnProvider.contract.transfer({
    to: "tz1burnburnburnburnburnburnburjAYjjX",
    amount: 1,
    mutez: true,
  })
  return op.confirmation(1)
}

const initProviders = async () => {
  gsnProvider.setSignerProvider(
    await InMemorySigner.fromSecretKey(gsnSecretKey)
  )
  aliceProvider.setSignerProvider(
    await InMemorySigner.fromSecretKey(aliceSecretKey)
  )
  bobProvider.setSignerProvider(
    await InMemorySigner.fromSecretKey(bobSecretKey)
  )
  eveProvider.setSignerProvider(
    await InMemorySigner.fromSecretKey(eveSecretKey)
  )
}

const tezosClientImportKey = (alias, key) => {
  execSync(`tezos-client import secret key ${alias} unencrypted:${key} --force`)
}

const mint = (destination, amount) => {
  execSync(
    `stablecoin-client --user gsn mint --to ${destination} --amount ${amount}`
  )
}

const getTokenBalance = (alias) => {
  const resultBuf = execSync(
    `stablecoin-client get-balance-of --owner ${alias}`
  )
  const result = resultBuf.toString()
  return parseInt(result.split(":")[1].trim()) //omg
}

const getMintingAllowance = (alias) => {
  const resultBuf = execSync(
    `stablecoin-client get-minting-allowance --minter ${alias}`
  )
  const result = resultBuf.toString()
  return parseInt(result.split(":")[1].trim()) //omg
}

// let server
// beforeEach(() => {
//   server = require("./server")
// })
// afterEach(() => {
//   server.close()
// })

describe("test block", () => {
  before("originate", async (done) => {
    // await initProviders()
    // process.env["TEZOS_CLIENT_UNSAFE_DISABLE_DISCLAIMER"] = "Y"
    // tezosClientImportKey("gsn", gsnSecretKey)
    // tezosClientImportKey("alice", aliceSecretKey)
    // tezosClientImportKey("bob", bobSecretKey)
    // tezosClientImportKey("eve", eveSecretKey)
    // try {
    //   contractAddress = execSync("tezos-client show known contract stablecoin")
    //     .toString()
    //     .trim()
    // } catch (e) {}
    // let deployed = false
    // if (!contractAddress) {
    //   try {
    //     execSync(
    //       "stablecoin-client --user gsn deploy --master-minter gsn --contract-owner gsn --pauser gsn --default-expiry 300000 --replace-alias"
    //     )
    //     contractAddress = execSync(
    //       "tezos-client show known contract stablecoin"
    //     )
    //       .toString()
    //       .trim()
    //   } catch (e) {}
    // }
    // let mintingAllowance = getMintingAllowance("gsn")
    // if (mintingAllowance == 0) {
    //   execSync(
    //     "stablecoin-client --user gsn configure-minter --minter gsn --new-minting-allowance 999999999999999999999999999999"
    //   )
    // } else {
    //   console.log("gsn minting allowance ", mintingAllowance)
    // }
    // mint("alice", toTez(10))
    // let balance = getTokenBalance("alice")
    // console.log("alice stable balance ", balance)
    // const contract = await gsnProvider.contract.at(contractAddress)
    // let storage = await contract.storage()
    // assert.notStrictEqual(contractAddress, "")
  })

  it("gyga", () => {
    throw new Error("gyga")
  })

  // it("bob generates permit payload, alice submits it to contract", async (done) => {
  //   const contract = await gsnProvider.contract.at(contractAddress)

  //   const tokenId = 0
  //   const amount = 100
  //   const relayerFee = 15
  //   const entrypoint = "transfer"
  //   let transferParams = formTransferParams(
  //     bobAddress,
  //     eveAddress,
  //     tokenId,
  //     amount,
  //     gsnAddress,
  //     relayerFee
  //   )

  //   console.log(transferParams)

  //   const initialBobBalance = getTokenBalance("bob")

  //   const permitParams = await Tezos.createPermitPayload(
  //     contractAddress,
  //     entrypoint,
  //     transferParams
  //   )

  //   const { pubkey, signature, hash } = permitParams

  //   const res = request(server)
  //     .post("/submit")
  //     .send({
  //       pubkey: pubkey,
  //       signature: signature,
  //       hash: hash,
  //       contractAddress: contractAddress,
  //       to: eveAddress,
  //       tokenId: tokenId,
  //       amount: amount,
  //       fee: relayerFee,
  //       callParams: {
  //         entrypoint: entrypoint,
  //         params: transferParams,
  //       },
  //     })
  //     .expect(200)

  //   assert.ok(res.statusCode == 200)

  //   // burnToBake()

  //   console.log(res.body)

  //   let bobBalance = getTokenBalance("bob")
  //   console.log("bob delta ", bobBalance - initialBobBalance)
  //   assert.ok(bobBalance - initialBobBalance == amount)
  // })

  // it("gas is less than limit", async () => {
  //   const contract = await gsnProvider.contract.at(contractAddress)
  //   const transferParams = contract.methods
  //     .bet(burnAddress)
  //     .toTransferParams({ amount: 2 })
  //   const est = await gsnProvider.estimate.transfer(transferParams)
  //   console.log("Gas limit: ", est.gasLimit)
  //   assert.ok(est.gasLimit < 800_000)
  // })
})
