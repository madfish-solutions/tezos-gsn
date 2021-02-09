import express from "express";
import createError from "http-errors";
import { KEK } from "../defaults";

export const routes = express.Router();

routes.get("/", async (_req, _res) => {
  throw createError(404, "Route does not exist");
});

routes.get("/kek", async (_req, res) => {
  res.json(KEK);
});
