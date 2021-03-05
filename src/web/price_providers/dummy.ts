import { PriceProvider, Price } from "./interface"

export class DummyPriceProvider implements PriceProvider {
  async price(contractAddress: string): Promise<Price> {
    return { price: -1, decimals: 0 }
  }
}
