export interface Price {
  price: number
  decimals: number
}

export interface Token {
  address: string
  name: string
  decimals: number
  tokenId: number
  type: string
}

export interface PriceProvider {
  price: () => Promise<Price>
  info: () => Token
}
