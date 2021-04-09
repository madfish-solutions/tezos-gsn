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
