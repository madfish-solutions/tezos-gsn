import { TezosToolkit } from "@taquito/taquito"
import { InMemorySigner, importKey } from "@taquito/signer"
import { permitParamHash } from "../../scripts/lib"

export const Toolkit = new TezosToolkit(
  process.env.RPC_PROVIDER || "http://127.0.0.1:8732"
)

namespace Tezos {
  export const submitPermit = async (
    contractAddress,
    signerKey,
    signature,
    paramsHash
  ) => {
    const contract = await Toolkit.contract.at(contractAddress)
    const op = await contract.methods
      .permit(signerKey, signature, paramsHash)
      .send({ amount: 0 })

    console.log("operation is ", op.hash)
    return op.hash
    // await op.confirmation(1)
  }
  export const performCall = async (contractAddress, entrypoint, params) => {
    const contract = await Toolkit.contract.at(contractAddress)
    const op = await contract.methods[entrypoint](...params).send({ amount: 0 })
    return op.hash
  }

  export const validate = async (
    contractAddress,
    entrypoint,
    params,
    paramHash
  ) => {
    const contract = await Toolkit.contract.at(contractAddress)

    let calculatedHash = await permitParamHash(
      Toolkit,
      contract,
      entrypoint,
      params
    )

    if (calculatedHash != paramHash) {
      return false
    }

    return true
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

  export const initProvider = () => {
    console.log("init with secret key ", process.env.SECRET_KEY)
    let secretKey: string = process.env.SECRET_KEY || ""
    Toolkit.setProvider({
      signer: new InMemorySigner(secretKey),
    })
  }
}

export default Tezos
