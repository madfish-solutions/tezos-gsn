const AVG_COUNT = 10

export let gas: any = {}
export let fee: any = {}

export const initStats = (tokens) => {
  for (const token of tokens) {
    gas[token] = new Stats()
    fee[token] = new Stats()
  }
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
