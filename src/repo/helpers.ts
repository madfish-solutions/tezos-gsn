import * as Knex from "knex";
import { knex } from "./knex";

export function withTransaction<T = any>(
  scope: (trx: Knex.Transaction) => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    let result: T;
    try {
      await knex.transaction(async (trx) => {
        try {
          result = await scope(trx);
          await trx.commit();
        } catch (err) {
          await trx.rollback(err);
        }
      });
      resolve(result!);
    } catch (err) {
      reject(err);
    }
  });
}
