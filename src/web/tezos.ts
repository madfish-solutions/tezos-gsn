import { TezosToolkit } from "@taquito/taquito"
import { InMemorySigner, importKey } from "@taquito/signer"

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
    console.log("operation is ", op)
    // await op.confirmation(1)
  }

  export const initProvider = () => {
    let secretKey: string = process.env.SECRET_KEY || ""
    Toolkit.setProvider({
      signer: new InMemorySigner(secretKey),
    })
  }
}

export default Tezos
