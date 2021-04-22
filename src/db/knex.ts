import Knex from "knex";
import { KNEX } from "./defaults";

export const knex = Knex(KNEX);
