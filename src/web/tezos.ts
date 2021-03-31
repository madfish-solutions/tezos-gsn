import { TezosToolkit, OpKind } from "@taquito/taquito"
import { InMemorySigner } from "@taquito/signer"
import { assert } from "console"
import { hex2buf } from "@taquito/utils"
import blake from "blakejs"
import { BigNumber } from "bignumber.js"
import { GsnError, getUnpackedUniques } from "../web/helpers"

export const Toolkit = new TezosToolkit(
  process.env.RPC_PROVIDER || "http://127.0.0.1:8732"
)

export const validate = async (
  contractAddress,
  entrypoint,
  params,
  paramHash
) => {
  const contract = await Toolkit.contract.at(contractAddress)

  const calculatedHash = await permitParamHash(contract, entrypoint, params)

  if (calculatedHash != paramHash) {
    throw new GsnError("hash_does_not_match_to_params", {
      calculated: calculatedHash,
      input: paramHash,
    })
  }
}

export const getFeeTxFromParams = (callParams) => {
  return callParams.params[0][0].txs[1]
}

export const validateAddress = async (callParams) => {
  const gsnAddress = await Toolkit.signer.publicKeyHash()

  const feeTx = getFeeTxFromParams(callParams)
  const addressFromTransfer = feeTx.to_
  if (addressFromTransfer != gsnAddress) {
    throw new GsnError("wrong_fee_address", {
      actual: addressFromTransfer,
      expected: gsnAddress,
    })
  }
}

const estimateAsBatch = (txs) =>
  Toolkit.estimate.batch(
    txs.map((tParams) => ({ kind: OpKind.TRANSACTION, ...tParams }))
  )

export const estimate = async (permitParams) => {
  const { signature, hash, pubkey, contractAddress, callParams } = permitParams

  const { entrypoint, params } = callParams

  const contract = await Toolkit.contract.at(contractAddress)

  const permit = contract.methods
    .permit(pubkey, signature, hash)
    .toTransferParams({})

  const feeTransfer = contract.methods[entrypoint](...params).toTransferParams(
    {}
  )

  let totalEstimate = 0
  const estimates = await estimateAsBatch([permit, feeTransfer])
  for (const est of estimates) {
    totalEstimate += est.suggestedFeeMutez
  }

  return totalEstimate
}

export async function permitParamHash(
  contract, //: ContractAbstraction<ContractProvider>,
  entrypoint, //: string,
  parameters //: any
) {
  const raw_packed = await Toolkit.rpc.packData({
    data: contract.parameterSchema.Encode(entrypoint, ...parameters),
    type: contract.parameterSchema.root.typeWithoutAnnotations(),
  })

  return blake.blake2bHex(hex2buf(raw_packed.packed), null, 32)
}

export const createPermitPayload = async (
  contractAddress,
  entrypoint,
  params
) => {
  const contract = await Toolkit.contract.at(contractAddress)

  const storage = await contract.storage<{ permit_counter: BigNumber }>()

  const signerKey = await Toolkit.signer.publicKey()
  const paramHash = await permitParamHash(contract, entrypoint, params)

  const chainId = await Toolkit.rpc.getChainId()
  const currentPermitCount = storage.permit_counter.toNumber()
  const unpacked = getUnpackedUniques(
    contractAddress,
    chainId,
    currentPermitCount,
    paramHash
  )

  const packed = await Toolkit.rpc
    .packData(unpacked)
    .catch((e) => console.error("error:", e))

  const sig = await Toolkit.signer
    .sign(packed["packed"])
    .then((s) => s.prefixSig)
  return {
    pubkey: signerKey,
    signature: sig,
    hash: paramHash,
  }
}

export const submit = async (
  contractAddress,
  signerKey,
  signature,
  paramsHash,
  entrypoint,
  params
) => {
  const contract = await Toolkit.contract.at(contractAddress)

  const batch = Toolkit.batch()
    .withContractCall(contract.methods.permit(signerKey, signature, paramsHash))
    .withContractCall(contract.methods[entrypoint](...params))

  const batchOp = await batch.send()
  return batchOp.hash
}

export const selfAddress = () => {
  return Toolkit.signer.publicKeyHash()
}

export const selfPubkey = () => {
  return Toolkit.signer.publicKey()
}

export const initProvider = (sk = "") => {
  const secretKey = sk || process.env.SECRET_KEY
  assert(secretKey, "No secret key specified")
  Toolkit.setProvider({
    signer: new InMemorySigner(secretKey!),
  })
}
