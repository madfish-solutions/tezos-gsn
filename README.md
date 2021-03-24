# Tezos GSN

Super-alpha version of Tezos Gas Station Network relayer.
You will be able to send tokens and pay gas fees in the same exact tokens when its done. Stay tuned!

## Getting started

```
yarn
cp .env.example .env
yarn start
```

Place your wallet private key into SECRET_KEY enviroment variable

## Configuring the price provider

For now only Harbinger price provider is available.

Refer to `price_provider.json` as an example configuration.
You gonna need the normalizer contract address and your pair name so it can be retreived from normalizer's contract storage.
Make sure you got your decimals right and specified a proper token id.

Use `"mainnet": true` if your you want to retreive prices from mainnet normalizer even in a testnet.

## Routes

* GET `/tokens` - returns all tokens supported by this relayer configured in the `price_provider.json`
* GET `/price?tokenAddress=<token-address>&tokenId=<token-id>` - to request price of the specific token as known by the relayer
* POST `/submit` - accepts, validates and sends users permit and transfer to the Tezos network. Refer to `scripts/create_permit.ts` for and inputs format example and preparation of a relayer-ready transaction.


## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b features/my-new-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin features/my-new-feature`
5. Submit a pull request
