import * as Knex from "knex"

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("transactions", (t) => {
    t.string("hash").unique().primary().notNullable()
    t.string("payload").notNullable()
    t.string("fee_token").unique().notNullable()
    t.integer("gas_estimate").notNullable()
    t.integer("fee_estimate").notNullable()
    t.integer("user_fee").notNullable()

    t.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTableIfExists("transactions")
}
