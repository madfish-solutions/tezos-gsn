import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("accounts", (t) => {
    t.string("id").unique().primary().notNullable();
    t.integer("walletId").unique().notNullable();

    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTableIfExists("accounts");
}
