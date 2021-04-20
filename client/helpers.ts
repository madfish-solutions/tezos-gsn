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

export const formSimpleTransferParams = (
  from: string,
  to: string,
  token_id: number,
  amount: number
) => {
  return [
    [
      {
        from_: from,
        txs: [{ to_: to, token_id: token_id, amount }],
      },
    ],
  ]
}
