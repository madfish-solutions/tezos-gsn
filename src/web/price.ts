import { PriceProvider, Token } from "./price_providers/interface"
import { DummyPriceProvider } from "./price_providers/dummy"
import { HarbingerPriceProvider } from "./price_providers/harbinger"
import { QuipuswapPriceProvider } from "./price_providers/quipuswap"
import { GsnError } from "./helpers"

export let tokens: { [token: string]: PriceProvider } = {}

export const initPriceProvider = (providers: Array<Token>) => {
  for (const token of providers) {
    const type = token.type
    const parse = (param) => {
      if (type == "harbinger") {
        return new HarbingerPriceProvider(param)
      } else if (type == "quipuswap") {
        return new QuipuswapPriceProvider(param)
      }
      throw new GsnError("price_configuration_error", {
        kind: "unknown_price_provider_type",
        value: type,
      })
    }
    let provider = parse(token)

    const key = token.address + token.tokenId
    if (tokens.hasOwnProperty(key)) {
      throw new GsnError("price_configuration_error", {
        kind: "duplicate_price_provider",
        value: {
          address: token.address,
          tokenId: token.tokenId,
        },
      })
    }
    tokens[key] = provider
  }
}

export const tokensPerMutez = async (address, tokenId = 0) => {
  const tokenKey = address + tokenId
  if (!tokens.hasOwnProperty(tokenKey)) {
    throw new GsnError("unsupported_token_address_or_id", {
      tokenId: tokenId,
      address: address,
    })
  }

  const provider = tokens[tokenKey]
  return provider.price()
}

export const supportedTokens = async () => {
  let info: Array<Token> = []
  for (const provider of Object.values(tokens)) {
    info.push(provider!.info() as Token)
  }
  return info
}
