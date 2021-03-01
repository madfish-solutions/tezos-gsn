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

exports.getUnpackedUniques = getUnpackedUniques
exports.formTransferParams = formTransferParams
