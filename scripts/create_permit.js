const {
  ContractAbstraction,
  ContractProvider,
  TezosToolkit,
} = require("@taquito/taquito")
const { InMemorySigner, importKey } = require("@taquito/signer")
const { Parser, emitMicheline } = require("@taquito/michel-codec")
const { assert } = require("console")

const { createPermitPayload, formTransferParams } = require("./lib")

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
  );
  
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


// ;(async () => {
//   try {
//     await main()
//   } catch (e) {
//     console.error(e)
//   }
// })()

main();
