export interface Price {
  price: number
  decimals: number
  error?: string
}

export interface Token {
  contractAddress: string
  name: string
  decimals: number
  tokenId: number
}

export interface PriceProvider {
  price: (contractAddress: string, tokenId: number) => Promise<Price>
  supported: () => Promise<Token[]>
}
