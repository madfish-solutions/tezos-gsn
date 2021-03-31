const AVG_COUNT = 10

export default class GasStats {
  gas_stats: Array<number> = []

  push = (gasCost: number) => {
    if (this.gas_stats.length >= AVG_COUNT) {
      this.gas_stats.shift()
    }
    this.gas_stats.push(gasCost)
  }

  average = () => {
    console.log(this.gas_stats)
    if (this.gas_stats.length == 0) return 0

    const total = this.gas_stats.reduce((acc, cost) => acc + cost)

    const avg = total / this.gas_stats.length
    return avg
  }
}
