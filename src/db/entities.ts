import { knex } from "./knex"

export function Transaction() {
  return knex<ITransaction>("transactions")
}

export interface ITransaction {
  hash: string
  payload: string
  feeToken: string
  gasEstimate: number
  feeEstimate: number
  userFee: number
}
