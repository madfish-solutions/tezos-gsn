import { TezosToolkit, OpKind } from "@taquito/taquito"
import { InMemorySigner, importKey } from "@taquito/signer"
import { getUnpackedUniques } from "../../scripts/lib"
import { assert } from "console"
import { buf2hex, hex2buf } from "@taquito/utils"
import blake from "blakejs"
import { BigNumber } from 'bignumber.js';

export const Toolkit = new TezosToolkit(
  process.env.RPC_PROVIDER || "http://127.0.0.1:8732"
)

namespace Tezos {
  export const validate = async (
    contractAddress,
    entrypoint,
    params,
    paramHash
  ) => {
    const contract = await Toolkit.contract.at(contractAddress)

    let calculatedHash = await permitParamHash(
      contract,
      entrypoint,
      params
    )

    if (calculatedHash != paramHash) {
      return false
    }

    return true
  }

  const estimateAsBatch = (txs) =>
    Toolkit.estimate.batch(
      txs.map((tParams) => ({ kind: OpKind.TRANSACTION, ...tParams }))
    )

  export const estimate = async (permitParams) => {
    const {
      signature,
      hash,
      pubkey,
      contractAddress,
      callParams,
    } = permitParams

    const { entrypoint, params } = callParams

    const contract = await Toolkit.contract.at(contractAddress)

    let permit = contract.methods
      .permit(pubkey, signature, hash)
      .toTransferParams({})

    let feeTransfer = contract.methods[entrypoint](...params).toTransferParams(
      {}
    )

    let totalEstimate = 0
    let estimates = await estimateAsBatch([permit, feeTransfer])
    for (let est of estimates) {
      totalEstimate += est.suggestedFeeMutez
    }

    return totalEstimate
  }

  export async function permitParamHash(
    contract, //: ContractAbstraction<ContractProvider>,
    entrypoint, //: string,
    parameters //: any
  ) {
    const wrapped_param = contract.methods[entrypoint](
      ...parameters
    ).toTransferParams().parameter.value
    const wrapped_param_type = contract.entrypoints.entrypoints[entrypoint]
  
    const raw_packed = await Toolkit.rpc
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

  export const createPermitPayload = async (contractAddress, entrypoint, params) => {
    const contract = await Toolkit.contract.at(contractAddress)
  
    const storage = await contract.storage<{permit_counter: BigNumber}>()
  
    const signerKey = await Toolkit.signer.publicKey()
    const paramHash = await permitParamHash(contract, entrypoint, params)
  
    const chainId = await Toolkit.rpc.getChainId()
    const currentPermitCount = storage.permit_counter.toNumber()
    // console.log("permit count is", currentPermitCount)
    const unpacked = getUnpackedUniques(
      contractAddress,
      chainId,
      currentPermitCount,
      paramHash
    )
  
    const packed = await Toolkit.rpc
      .packData(unpacked)
      .catch((e) => console.error("error:", e))
  
    const sig = await Toolkit.signer.sign(packed["packed"]).then((s) => s.prefixSig)
    return {
      pubkey: signerKey,
      signature: sig,
      hash: paramHash
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

    const batch = await Toolkit.batch()
      .withContractCall(
        contract.methods.permit(signerKey, signature, paramsHash)
      )
      .withContractCall(contract.methods[entrypoint](...params))

    let batchOp = await batch.send()
    return batchOp.hash
  }

  export const initProvider = (sk = "") => {
    let secretKey: string = process.env.SECRET_KEY || sk
    assert(secretKey, "No secret key specified7")
    Toolkit.setProvider({
      signer: new InMemorySigner(secretKey),
    })
  }

  export const selfAddress = () => {
    return Toolkit.signer.publicKeyHash()
  }
}

export default Tezos
