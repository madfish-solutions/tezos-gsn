import { PriceProvider, Price, Tokens } from "./interface"

export class DummyPriceProvider implements PriceProvider {
  async price(): Promise<Price> {
    return { price: -1, decimals: 0 }
  }
  async supported(): Promise<Tokens> {
    return {
      tz1dummyaddress: {
        name: "DUMMY-PRICE",
        decimals: 0,
        tokenId: 0,
      },
    }
  }
}
