const COUNT = 3
const gas_stats: Array<number> = []

export const push = (gasCost: number) => {
  if (gas_stats.length >= COUNT) {
    gas_stats.shift()
  }
  gas_stats.push(gasCost)
}

export const average = () => {
  console.log(gas_stats)
  if (gas_stats.length == 0) return 0

  const total = gas_stats.reduce((acc, cost) => acc + cost)

  const avg = total / gas_stats.length
  return avg
}
