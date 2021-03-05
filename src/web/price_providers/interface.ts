export interface Price {
  price: number
  decimals: number
}

export interface PriceProvider {
  price: (contractAddress: string) => Promise<Price>
}
