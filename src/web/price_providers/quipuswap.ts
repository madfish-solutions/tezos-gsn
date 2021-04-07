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
  token: QuipuToken
  toolkit: TezosToolkit

  constructor(params) {
    const { mainnet } = params
    this.token = params
    if (mainnet) {
      this.toolkit = new TezosToolkit(mainnetNode)
    } else {
      this.toolkit = Toolkit
    }
  }

  info(): Token {
    return this.token
  }

  async price(): Promise<Price> {
    const pair = await this.toolkit.contract.at(this.token.pairAddress)
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
    const scale = Math.pow(10, this.token.decimals - TEZ_DECIMALS)
    const tezPrice = price.div(scale)

    return {
      price: price.toNumber(),
      decimals: this.token.decimals - TEZ_DECIMALS,
    }
  }

  scaleDecimals(input: number): number {
    const scale = Math.pow(10, 6)
    return input / scale
  }
}
