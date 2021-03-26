import { PriceProvider } from "./price_providers/interface"
import { DummyPriceProvider } from "./price_providers/dummy"
import { HarbingerPriceProvider } from "./price_providers/harbinger"

export let currentProvider: PriceProvider = new DummyPriceProvider()

export const initPriceProvider = (params) => {
  const type = params.type
  if (type == "harbinger") {
    const normalizer = params.normalizer
    const tokens = params.tokens
    const useMainnet = params.mainnet
    currentProvider = new HarbingerPriceProvider(normalizer, tokens, useMainnet)
  }
}

export const tokensPerMutez = async (contractAddress, tokenId = 0) => {
  return currentProvider.price(contractAddress, tokenId)
}

export const supportedTokens = async () => {
  return currentProvider.supported()
}
