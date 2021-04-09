import { TezosToolkit, OpKind } from "@taquito/taquito"
import { InMemorySigner } from "@taquito/signer"
import { assert } from "console"
import { hex2buf } from "@taquito/utils"
import blake from "blakejs"
import { BigNumber } from "bignumber.js"
import { GsnError, getUnpackedUniques } from "../web/helpers"
import { MichelCodecPacker } from "@taquito/taquito"

export const validate = async (
  toolkit,
  contractAddress,
  entrypoint,
  params,
  paramHash
) => {
  const contract = await toolkit.contract.at(contractAddress)

  const calculatedHash = await permitParamHash(
    toolkit,
    contract,
    entrypoint,
    params
  )

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

export const validateAddress = async (toolkit, callParams) => {
  const gsnAddress = await toolkit.signer.publicKeyHash()

  const feeTx = getFeeTxFromParams(callParams)
  const addressFromTransfer = feeTx.to_
  if (addressFromTransfer != gsnAddress) {
    throw new GsnError("wrong_fee_address", {
      actual: addressFromTransfer,
      expected: gsnAddress,
    })
  }
}

const estimateAsBatch = (toolkit, txs) =>
  toolkit.estimate.batch(
    txs.map((tParams) => ({ kind: OpKind.TRANSACTION, ...tParams }))
  )

export const estimate = async (toolkit, permitParams) => {
  const { signature, hash, pubkey, contractAddress, callParams } = permitParams

  const { entrypoint, params } = callParams

  const contract = await toolkit.contract.at(contractAddress)

  const permit = contract.methods
    .permit(pubkey, signature, hash)
    .toTransferParams({})

  const feeTransfer = contract.methods[entrypoint](...params).toTransferParams(
    {}
  )

  const estimates = await estimateAsBatch(toolkit, [permit, feeTransfer])
  return estimates.map((est) => est.suggestedFeeMutez)
}

export async function permitParamHash(
  toolkit,
  contract, //: ContractAbstraction<ContractProvider>,
  entrypoint, //: string,
  parameters //: any
) {
  const raw_packed = await toolkit.rpc.packData({
    data: contract.parameterSchema.Encode(entrypoint, ...parameters),
    type: contract.parameterSchema.root.typeWithoutAnnotations(),
  })

  return blake.blake2bHex(hex2buf(raw_packed.packed), null, 32)
}

export const createPermitPayload = async (
  toolkit: TezosToolkit,
  contractAddress,
  entrypoint,
  params
) => {
  const contract = await toolkit.contract.at(contractAddress)

  const storage = await contract.storage<{ permit_counter: BigNumber }>()

  const signerKey = await toolkit.signer.publicKey()
  const paramHash = await permitParamHash(toolkit, contract, entrypoint, params)

  const chainId = await toolkit.rpc.getChainId()
  const currentPermitCount = storage.permit_counter.toNumber()
  const unpacked = getUnpackedUniques(
    contractAddress,
    chainId,
    currentPermitCount,
    paramHash
  )

  const packed = await toolkit.rpc
    .packData(unpacked)
    .catch((e) => console.error("error:", e))

  const sig = await toolkit.signer
    .sign(packed["packed"])
    .then((s) => s.prefixSig)
  return {
    pubkey: signerKey,
    signature: sig,
    hash: paramHash,
  }
}

export const submitArbitrary = async (toolkit, fee, calls) => {
  const feeContract = await toolkit.contract.at(fee.contractAddress)
  const contract = await toolkit.contract.at(calls.contractAddress)
  let batch = toolkit.batch()

  batch = batch
    .withContractCall(
      feeContract.methods.permit(
        fee.permit.key,
        fee.permit.sig,
        fee.permit.hash
      )
    )
    .withContractCall(feeContract.methods.transfer(...fee.params))

  for (const call of calls.sequence) {
    batch = batch
      .withContractCall(
        contract.methods.permit(
          call.permit.key,
          call.permit.sig,
          call.permit.hash
        )
      )
      .withContractCall(contract.methods[call.entrypoint](...call.params))
  }

  const batchOp = await batch.send()
  return batchOp.hash
}

export const submit = async (
  toolkit,
  contractAddress,
  signerKey,
  signature,
  paramsHash,
  entrypoint,
  params
) => {
  const contract = await toolkit.contract.at(contractAddress)

  const batch = toolkit
    .batch()
    .withContractCall(contract.methods.permit(signerKey, signature, paramsHash))
    .withContractCall(contract.methods[entrypoint](...params))

  const batchOp = await batch.send()
  return batchOp.hash
}

export const initToolkit = (rpcEndpoint, secretKey) => {
  const toolkit = new TezosToolkit(rpcEndpoint)
  toolkit.setProvider({
    signer: new InMemorySigner(secretKey),
  })

  toolkit.setPackerProvider(new MichelCodecPacker())
  return toolkit
}
