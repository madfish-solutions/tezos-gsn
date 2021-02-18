// import Tezos from "../src/web/tezos"

const blake = require("blakejs")
const { buf2hex, hex2buf } = require("@taquito/utils")
const {
  ContractAbstraction,
  ContractProvider,
  TezosToolkit,
} = require("@taquito/taquito")
const { InMemorySigner, importKey } = require("@taquito/signer")
const { Parser, emitMicheline } = require("@taquito/michel-codec")
const { assert } = require("console")

function getUnpackedUniques(contractAddress, chainId, currentPermitCount, permitHash) {
  return {
    data: { "prim": "Pair",
    "args":
      [ { "prim": "Pair",
          "args":
            [ { "string": contractAddress },
              { "string": chainId } ] },
        { "prim": "Pair",
          "args":
            [ { "int": currentPermitCount.toString() },
              { "bytes": permitHash } ] } 
      ] },
    type: { "prim": "pair",
            "args":
              [ { "prim": "pair",
                  "args": [ { "prim": "address" }, { "prim": "chain_id" } ] },
                { "prim": "pair",
                  "args": [ { "prim": "nat" }, { "prim": "bytes" } ] } ] },
  }
}

async function main() {
  const args = require("minimist")(process.argv.slice(2))

  let secretKey = args.secret
  let contractAddress = args.contract_address
  let tokenId = args.tokenid || 0
  let to = args.to
  let amount = args.amount

  let relayerAddress = args.relayer_address
  let relayerFee = args.fee

  const toolkit = new TezosToolkit(
    process.env.RPC_PROVIDER || "http://127.0.0.1:8732"
  )
  toolkit.setProvider({
    signer: new InMemorySigner(secretKey),
  })

  var params = formTransferParams(
    // await toolkit.signer.publicKeyHash(),
    "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
    to,
    tokenId,
    amount,
    relayerAddress,
    1// relayerFee
  )

  let entrypoint = "transfer"

  let [key, sig, hash] = await createPermitPayload(
    toolkit,
    contractAddress,
    entrypoint,
    params
  )

  let output = {
    pubkey: key,
    signature: sig,
    hash: hash,
    contractAddress: contractAddress,
    to: to,
    tokenId: tokenId,
    amount: amount,
    fee: relayerFee,
    callParams: {
      entrypoint: entrypoint,
      params: params
    }
  }

  console.log(JSON.stringify(output))
}

const formTransferParams = (from_, to_, tokenId, amount, relayerAddress, relayerFee) => {
  let intendedTx = { to_: to_, token_id: tokenId, amount: amount }

  let dummyFeeTx = {
    to_: relayerAddress,
    token_id: tokenId,
    amount: relayerFee, //TODO properly estimate fee
  }

  let txList = [
    [
      {
        from_: from_,
        txs: [intendedTx, dummyFeeTx],
      },
    ],
  ]

  return txList
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

async function permitParamHash(
  tz,
  contract, //: ContractAbstraction<ContractProvider>,
  entrypoint, //: string,
  parameters //: any
) {
  const wrapped_param = contract.methods[entrypoint](
    ...parameters
  ).toTransferParams().parameter.value
  const wrapped_param_type = contract.entrypoints.entrypoints[entrypoint]

  const raw_packed = await tz.rpc
    .packData({
      data: wrapped_param,
      type: wrapped_param_type,
    })
    .catch((e) => console.error("error:", e))
  var packed_param
  if (raw_packed) {
    packed_param = raw_packed.packed
  } else {
    throw `packing ${wrapped_param} failed`
  }

  return buf2hex(blake.blake2b(hex2buf(packed_param), null, 32))
}


const createPermitPayload = async (tz, contractAddress, entrypoint, params) => {
  const contract = await tz.contract.at(contractAddress)

  const storage = await contract.storage();

  const signerKey = await tz.signer.publicKey()
  const paramHash = await permitParamHash(tz, contract, entrypoint, params)

  const chainId = await tz.rpc.getChainId()
  const currentPermitCount = storage.permit_counter.toNumber()
  console.log("permit count is", currentPermitCount)
  const unpacked = getUnpackedUniques(contractAddress, chainId, currentPermitCount, paramHash)

  const packed = await tz.rpc
    .packData(unpacked)
    .catch((e) => console.error("error:", e))

  console.log("bytes to sign ", packed.packed)

  const sig = await tz.signer.sign(packed.packed).then((s) => s.prefixSig)
  return [signerKey, sig, paramHash]
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(e)
  }
})()
