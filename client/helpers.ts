import * as Tezos from "../src/web/tezos"

export const forgeTxAndParams = async (params) => {
  var transferParams = formTransferParams(
    await Tezos.selfAddress(),
    params.to,
    params.tokenId,
    params.amount,
    params.relayerAddress,
    params.relayerFee
  )

  const permitParams = await Tezos.createPermitPayload(
    params.contractAddress,
    params.entrypoint,
    transferParams
  )

  return [transferParams, permitParams]
}

export const formTransferParams = (
  from_,
  to_,
  tokenId,
  amount,
  relayerAddress,
  relayerFee
) => {
  const intendedTx = { to_: to_, token_id: tokenId, amount: amount }

  const feeTx = {
    to_: relayerAddress,
    token_id: tokenId,
    amount: relayerFee,
  }

  const txList = [
    [
      {
        from_: from_,
        txs: [intendedTx, feeTx],
      },
    ],
  ]

  return txList
}
