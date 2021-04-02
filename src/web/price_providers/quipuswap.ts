import { Toolkit } from "../tezos"
import { PriceProvider, Price, Token } from "./interface"
import { GsnError } from "../helpers"

import { TezosToolkit } from "@taquito/taquito"
import BigNumber from "bignumber.js"

interface QuipuToken extends Token {
  pairAddress: string
}

const TEZ_DECIMALS = 6

// HACK for using real-world prices in a sandbox
const mainnetNode = "https://mainnet-tezos.giganode.io"

export class QuipuswapPriceProvider implements PriceProvider {
  tokens: QuipuToken[]
  toolkit: TezosToolkit

  constructor(tokens: QuipuToken[], useMainnet = false) {
    this.tokens = tokens
    if (useMainnet) {
      this.toolkit = new TezosToolkit(mainnetNode)
    } else {
      this.toolkit = Toolkit
    }
  }

  async supported(): Promise<Token[]> {
    return this.tokens
  }

  async price(contractAddress: string, tokenId: number): Promise<Price> {
    const token = this.tokens.find(
      (el) => el.contractAddress == contractAddress && el.tokenId == tokenId
    )
    if (token == undefined) {
      throw new GsnError("unsupported_token_address_or_id", {
        tokenId: tokenId,
        address: contractAddress,
        provider: "quipuswap",
      })
    }

    const pair = await this.toolkit.contract.at(token.pairAddress)
    console.log("pair", pair)
    const imStorage = await pair.storage<{
      storage: {
        tez_pool: BigNumber
        token_pool: BigNumber
      }
    }>()
    const { tez_pool, token_pool } = imStorage.storage

    const price = token_pool.div(tez_pool)
    // TODO figure out the decimals
    const scale = Math.pow(10, token.decimals - TEZ_DECIMALS)
    const tezPrice = price.div(scale)

    return { price: price.toNumber(), decimals: token.decimals - TEZ_DECIMALS }
  }

  scaleDecimals(input: number): number {
    const scale = Math.pow(10, 6)
    return input / scale
  }
}
