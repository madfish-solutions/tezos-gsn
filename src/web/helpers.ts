import http from "http";
import express from "express";

const { Tezos, MichelsonMap, TezosToolkit, ECKey } = require("@taquito/taquito");

export const prodErrorHandler: express.ErrorRequestHandler = (
  err,
  _req,
  res,
  _next // eslint-disable-line
) => {
  const code = err.code || err.status || 500;
  const codeMessage = http.STATUS_CODES[code];

  res.statusCode = code;
  res.end(
    code === 500 && process.env.NODE_ENV === "production"
      ? codeMessage
      : (err.length && err) || err.message || codeMessage
  );
};

export let submitPermit = async (contractAddress: string, params: object) => {
  const contract = await Tezos.contract.at(contractAddress);
  const op = await contract.methods.permit(params).send({amount: 0})
  await op.confirmation(1)
}