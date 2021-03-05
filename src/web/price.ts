import { PriceProvider } from "./price_providers/interface"
import { DummyPriceProvider } from "./price_providers/dummy"
import { HarbingerPriceProvider } from "./price_providers/harbinger"

export let currentProvider: PriceProvider = new DummyPriceProvider()

export const initPriceProvider = (params) => {
  let type = params.type
  if (type == "harbinger") {
    let normalizer = params.normalizer
    let pairs = params.tokens
    let useMainnet = params.mainnet
    currentProvider = new HarbingerPriceProvider(normalizer, pairs, useMainnet)
  }
}

export const tokensPerMutez = async (contractAddress) => {
  return currentProvider.price(contractAddress)
}
