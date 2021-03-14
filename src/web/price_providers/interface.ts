export interface Price {
  price: number
  decimals: number
  error?: string
}

export interface PriceProvider {
  price: (contractAddress: string) => Promise<Price>
}
