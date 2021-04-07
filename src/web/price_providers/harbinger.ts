import { toolkit } from "../server"
import { PriceProvider, Price, Token } from "./interface"
import { GsnError } from "../helpers"

import { BigMapAbstraction, TezosToolkit } from "@taquito/taquito"
import BigNumber from "bignumber.js"

interface HarbingerToken extends Token {
  normalizer: string
}

// HACK for using real-world prices in a sandbox
const mainnetNode = "https://mainnet-tezos.giganode.io"

export class HarbingerPriceProvider implements PriceProvider {
  token: HarbingerToken
  toolkit: TezosToolkit

  constructor(params) {
    const { mainnet } = params
    this.token = params

    if (mainnet) {
      this.toolkit = new TezosToolkit(mainnetNode)
    } else {
      this.toolkit = toolkit
    }
  }

  info(): Token {
    return this.token
  }

  async price(): Promise<Price> {
    const priceNormalizer = await this.toolkit.contract.at(
      this.token.normalizer
    )
    const storage = await priceNormalizer.storage<{
      assetMap: BigMapAbstraction
    }>()

    const assetMap = storage["assetMap"]
    const pairPrices = await assetMap.get<{ computedPrice: BigNumber }>(
      this.token.name
    )
    if (pairPrices) {
      const computedPrice = pairPrices.computedPrice.toNumber()
      const tezPrice = this.scaleDecimals(computedPrice)
      const mutezPrice = this.scaleDecimals(tezPrice)
      return { price: mutezPrice, decimals: this.token.decimals }
    }

    throw new GsnError("relayer_price_provider_configuration_error", {
      description: "No such pair exists in normalizer",
      assetName: this.token.name,
      provider: "harbinger",
    })
  }

  scaleDecimals(input: number): number {
    // According to Harbinger all oracle values are scaled to 10^6.
    const scale = Math.pow(10, 6)
    return input / scale
  }
}
