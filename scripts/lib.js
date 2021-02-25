const { buf2hex, hex2buf } = require("@taquito/utils")
const blake = require("blakejs")

const createPermitPayload = async (tz, contractAddress, entrypoint, params) => {
  const contract = await tz.contract.at(contractAddress)

  const storage = await contract.storage()

  const signerKey = await tz.signer.publicKey()
  const paramHash = await permitParamHash(tz, contract, entrypoint, params)

  const chainId = await tz.rpc.getChainId()
  const currentPermitCount = storage.permit_counter.toNumber()
  // console.log("permit count is", currentPermitCount)
  const unpacked = getUnpackedUniques(
    contractAddress,
    chainId,
    currentPermitCount,
    paramHash
  )

  const packed = await tz.rpc
    .packData(unpacked)
    .catch((e) => console.error("error:", e))

  const sig = await tz.signer.sign(packed.packed).then((s) => s.prefixSig)
  return [signerKey, sig, paramHash]
}

function formTransferParams(
  from_,
  to_,
  tokenId,
  amount,
  relayerAddress,
  relayerFee
) {
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


function getUnpackedUniques(
  contractAddress,
  chainId,
  currentPermitCount,
  permitHash
) {
  return {
    data: {
      prim: "Pair",
      args: [
        {
          prim: "Pair",
          args: [{ string: contractAddress }, { string: chainId }],
        },
        {
          prim: "Pair",
          args: [{ int: currentPermitCount.toString() }, { bytes: permitHash }],
        },
      ],
    },
    type: {
      prim: "pair",
      args: [
        { prim: "pair", args: [{ prim: "address" }, { prim: "chain_id" }] },
        { prim: "pair", args: [{ prim: "nat" }, { prim: "bytes" }] },
      ],
    },
  }
}

exports.formTransferParams = formTransferParams
exports.createPermitPayload = createPermitPayload
