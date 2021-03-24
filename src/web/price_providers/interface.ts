export interface Price {
  price: number
  decimals: number
  error?: string
}

export interface Tokens {
  [address: string]: {
    name: string
    decimals: number
    tokenId: number
  }
}

export interface PriceProvider {
  price: (contractAddress: string, tokenId: number) => Promise<Price>
  supported: () => Promise<Tokens>
}
