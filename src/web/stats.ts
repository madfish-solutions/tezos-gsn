import * as DB from "../db"

const AVG_COUNT = 10

export let gas: any = {}
export let fee: any = {}

export const initStats = (tokens) => {
  for (const token of tokens) {
    gas[token] = new Stats()
    fee[token] = new Stats()
  }
}

export const add = (
  hash,
  payload,
  feeTokenIdentifier,
  gasEstimate,
  feeEstimate,
  userFee
) => {
  const transaction: DB.ITransaction = {
    hash,
    userFee,
    gasEstimate,
    feeEstimate,
    payload: JSON.stringify(payload),
    feeToken: feeTokenIdentifier,
  }
  DB.Transaction()
    .insert(transaction)
    .then((res) => console.log(res))
}

export const get = async () => {
  const transactions = await DB.Transaction()
    .select("feeToken")
    .avg({ avgGasEstimate: "gas_estimate" })
    .avg({ avgOurFeeEstimate: "fee_estimate" })
    .avg({ avgUserFee: "user_fee" })
    .sum({ totalGasEstimate: "gas_estimate" })
    .sum({ totalOurFeeEstimate: "fee_estimate" })
    .sum({ totalUserFee: "user_fee" })
    .groupBy("feeToken")
  return transactions
}

export class Stats {
  average: Array<number> = []

  total = 0

  push = (value: number) => {
    if (this.average.length >= AVG_COUNT) {
      this.average.shift()
    }
    this.average.push(value)

    this.total += value
  }

  getAverage = () => {
    console.log(this.average)
    if (this.average.length == 0) return 0

    const total = this.average.reduce((acc, cost) => acc + cost)

    const avg = total / this.average.length
    return avg
  }
}
