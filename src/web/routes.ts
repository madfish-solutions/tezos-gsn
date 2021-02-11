import express from "express";
import createError from "http-errors";
import { KEK } from "../defaults";
import Tezos from "./tezos";

export const routes = express.Router();

routes.get("/", async (_req, _res) => {
  throw createError(404, "Route does not exist");
});

routes.get("/submit", async (req, res) => {
  res.json(KEK);

  res.json(req.body)
});

routes.post("/submit", async (req, res) => {
  const { signature, hash, pubkey, contractAddress } = req.body
  await Tezos.submitPermit(contractAddress, pubkey, signature, hash)
});
