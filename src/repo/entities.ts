import { knex } from "./knex";

export function Accounts() {
  return knex<IAccount>("accounts");
}

export interface IAccount {
  id: string;
  walletId: number;
}
