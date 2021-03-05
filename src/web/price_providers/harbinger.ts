import { Toolkit } from "../tezos"
import { PriceProvider, Price } from "./interface"

import { BigMapAbstraction, TezosToolkit } from "@taquito/taquito"
import BigNumber from "bignumber.js"

interface Tokens {
  [address: string]: {
    name: string
    decimals: number
  }
}

// HACK for using real-world prices in a sandbox
const mainnetNode = "https://mainnet-tezos.giganode.io"

export class HarbingerPriceProvider implements PriceProvider {
  tokens: Tokens = {}
  normalizerAddress: string
  toolkit: TezosToolkit

  constructor(
    normalizerAddress: string,
    tokens: Tokens,
    useMainnet: boolean = false
  ) {
    this.tokens = tokens
    this.normalizerAddress = normalizerAddress

    if (useMainnet) {
      this.toolkit = new TezosToolkit(mainnetNode)
    } else {
      this.toolkit = Toolkit
    }
  }

  async price(contractAddress: string): Promise<Price> {
    let priceNormalizer = await this.toolkit.contract.at(this.normalizerAddress)
    let storage = await priceNormalizer.storage<{
      assetMap: BigMapAbstraction
    }>()

    let asset = this.tokens[contractAddress]

    let assetMap = storage["assetMap"]
    let pairPrices = await assetMap.get<{ computedPrice: BigNumber }>(
      asset.name
    )
    if (pairPrices) {
      let computedPrice = pairPrices.computedPrice.toNumber()
      let tezPrice = this.scaleDecimals(computedPrice)
      let mutezPrice = this.scaleDecimals(tezPrice)
      return { price: mutezPrice, decimals: asset.decimals }
    }

    return { price: -1, decimals: 0 }
  }

  scaleDecimals(input: number): number {
    // According to Harbinger all oracle values are scaled to 10^6.
    const scale = Math.pow(10, 6)
    return input / scale
  }
}
