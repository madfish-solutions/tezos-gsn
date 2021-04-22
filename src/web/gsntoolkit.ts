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

// does not validate estimate
export const validateFeeTransfer = async (toolkit, fee) => {
  const contract = await toolkit.contract.at(fee.contract)

  const calculatedHash = await permitParamHash(
    toolkit,
    contract,
    "transfer",
    fee.args
  )

  if (calculatedHash != fee.permit.hash) {
    throw new GsnError("hash_does_not_match_to_params", {
      calculated: calculatedHash,
      input: fee.permit.hash,
    })
  }

  const gsnAddress = await toolkit.signer.publicKeyHash()
  const addressFromTransfer = fee.args[0][0].txs[0].to_
  if (addressFromTransfer != gsnAddress) {
    throw new GsnError("wrong_fee_address", {
      actual: addressFromTransfer,
      expected: gsnAddress,
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

const transferParamsToBatchOps = (txs) =>
  txs.map((tParams) => ({ kind: OpKind.TRANSACTION, ...tParams }))

const estimateAsBatch = (toolkit, txs) =>
  toolkit.estimate.batch(transferParamsToBatchOps(txs))

export const estimateCalls = async (toolkit, contractAddress, calls) => {
  const contract = await toolkit.contract.at(contractAddress)
  const transferParams: Array<any> = []
  for (const call of calls) {
    const { entrypoint, args } = call
    const transferParam = contract.methods[entrypoint](
      ...args
    ).toTransferParams({})
    transferParams.push(transferParam)
  }
  const estimates = await estimateAsBatch(toolkit, transferParams)
  return estimates.map((est) => est.suggestedFeeMutez)
}

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
  params,
  permitCounterOffset = 0
) => {
  const contract = await toolkit.contract.at(contractAddress)

  const storage = await contract.storage<{ permit_counter: BigNumber }>()

  const signerKey = await toolkit.signer.publicKey()
  const paramHash = await permitParamHash(toolkit, contract, entrypoint, params)

  const chainId = await toolkit.rpc.getChainId()
  const currentPermitCount =
    storage.permit_counter.toNumber() + permitCounterOffset
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

export const submitArbitrary = async (
  toolkit,
  fee,
  calls,
  perform_estimation = false
) => {
  const feeContract = await toolkit.contract.at(fee.contract)

  const transferParams: Array<any> = []

  const feePermit = feeContract.methods
    .permit(fee.permit.pubkey, fee.permit.signature, fee.permit.hash)
    .toTransferParams({})
  const feeTransfer = feeContract.methods
    .transfer(...fee.args)
    .toTransferParams({})

  transferParams.push(feePermit)
  transferParams.push(feeTransfer)

  for (const call of calls) {
    const contract = await toolkit.contract.at(call.contract)
    const callPermit = contract.methods
      .permit(call.permit.pubkey, call.permit.signature, call.permit.hash)
      .toTransferParams({})
    const entrypointCall = contract.methods[call.entrypoint](
      ...call.args
    ).toTransferParams({})
    transferParams.push(callPermit)
    transferParams.push(entrypointCall)
  }

  let batchOps = transferParamsToBatchOps(transferParams)
  if (perform_estimation) {
    return toolkit.estimate.batch(batchOps)
  } else {
    return toolkit.batch(batchOps).send()
  }

  // batch = await batch
  //   .withContractCall(
  //     feeContract.methods.permit(
  //       fee.permit.key,
  //       fee.permit.sig,
  //       fee.permit.hash
  //     )
  //   )
  //   .withContractCall(feeContract.methods.transfer(...fee.params))

  // for (const call of calls.sequence) {
  //   const contract = await toolkit.contract.at(call.contract)

  //   batch = await batch
  //     .withContractCall(
  //       contract.methods.permit(
  //         call.permit.key,
  //         call.permit.sig,
  //         call.permit.hash
  //       )
  //     )
  //     .withContractCall(contract.methods[call.entrypoint](...call.params))
  // }
}

export const estimatePermittedCall = async (toolkit, call) => {
  const permit = await createPermitPayload(
    toolkit,
    call.contract,
    call.entrypoint,
    call.args
  )

  return estimateCalls(toolkit, call.contract, [
    {
      entrypoint: "permit",
      args: Object.values(permit),
    },
    {
      entrypoint: call.entrypoint,
      args: call.args,
    },
  ])
}

export const pour = async (toolkit, contractAddress, destination) => {
  const contract = await toolkit.contract.at(contractAddress)

  const decimals = 6
  const amount = Math.pow(10, decimals)

  const op = await contract.methods
    .transfer([
      {
        from_: await toolkit.signer.publicKeyHash(),
        txs: [{ to_: destination, token_id: 0, amount: amount }],
      },
    ])
    .send()

  return op.hash
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
  return batchOp
}

export const initToolkit = (rpcEndpoint, secretKey) => {
  const toolkit = new TezosToolkit(rpcEndpoint)
  toolkit.setProvider({
    signer: new InMemorySigner(secretKey),
  })

  toolkit.setPackerProvider(new MichelCodecPacker())
  return toolkit
}
