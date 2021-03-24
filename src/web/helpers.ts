import http from "http"
import express from "express"

export class GsnError extends Error {
  data: object
  constructor(message, data) {
    super(message)
    this.name = "GsnError"
    this.data = data
  }
}

export const prodErrorHandler: express.ErrorRequestHandler = (
  err,
  _req,
  res,
  _next // eslint-disable-line
) => {
  console.log("prod encountered error", err)

  const code = err.code || err.status || 500
  const codeMessage = http.STATUS_CODES[code]

  res.statusCode = code
  res.end(
    code === 500 && process.env.NODE_ENV === "production"
      ? codeMessage
      : (err.length && err) || err.message || codeMessage
  )
}

export const validateFeeSlippage = (userFee, newlyEstimatedFee) => {
  let allowedDecrease = 0.01
  if (process.env.ALLOWED_FEE_DECREASE) {
    allowedDecrease = parseFloat(process.env.ALLOWED_FEE_DECREASE)
  }
  if (newlyEstimatedFee > userFee) {
    throw new GsnError("fee_is_too_low", {
      error: "fee_is_too_low",
      requestedPrice: userFee,
      minAllowedPrice: newlyEstimatedFee,
    })
  }
}

export const getUnpackedUniques = (
  contractAddress,
  chainId,
  currentPermitCount,
  permitHash
) => {
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
