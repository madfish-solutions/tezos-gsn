import { Toolkit } from "../tezos"
import { PriceProvider, Price, Tokens } from "./interface"
import { GsnError } from "../helpers"

import { BigMapAbstraction, TezosToolkit } from "@taquito/taquito"
import BigNumber from "bignumber.js"

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

  async supported(): Promise<Tokens> {
    return this.tokens
  }

  async price(contractAddress: string, tokenId: number): Promise<Price> {
    let priceNormalizer = await this.toolkit.contract.at(this.normalizerAddress)
    let storage = await priceNormalizer.storage<{
      assetMap: BigMapAbstraction
    }>()

    if (!this.tokens.hasOwnProperty(contractAddress)) {
      throw new GsnError("unsupported_token_contract", {
        address: contractAddress,
        provider: "harbinger",
      })
    }

    let asset = this.tokens[contractAddress]
    if (asset.tokenId != tokenId) {
      throw new GsnError("unsupported_token_id", {
        tokenId: tokenId,
        supportedTokenId: asset.tokenId,
        address: contractAddress,
        provider: "harbinger",
      })
    }

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

    throw new GsnError("relayer_price_provider_configuration_error", {
      description: "No such pair exists in normalizer",
      assetName: asset.name,
      provider: "harbinger",
    })
  }

  scaleDecimals(input: number): number {
    // According to Harbinger all oracle values are scaled to 10^6.
    const scale = Math.pow(10, 6)
    return input / scale
  }
}
