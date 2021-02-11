// import Tezos from "../src/web/tezos"

const blake = require("blakejs");
const { buf2hex, hex2buf } = require("@taquito/utils");
const { TezosToolkit } = require('@taquito/taquito');
const { InMemorySigner, importKey } = require('@taquito/signer');


async function main() {
  const args = require('minimist')(process.argv.slice(2));
  let secretKey = args.sk
  let contractAddress = args.contract_address
  let entrypoint = args.entrypoint
  let params = args.params || null
  
  const toolkit = new TezosToolkit(process.env.RPC_PROVIDER || "http://127.0.0.1:8732");
  toolkit.setProvider({
      signer: new InMemorySigner(secretKey),
  });

  let [key, sig, hash] = await createPermitPayload(toolkit, contractAddress, entrypoint, params)

  let output = {
    "pubkey": key,
    "signature": sig,
    "hash": hash,
    "contractAddress": contractAddress
  } 

  console.log(JSON.stringify(output))
}

const getBytesToSignFromErrors = (errors) => {
  const errors_with = errors.filter(x => x.with !== undefined).map(x => x.with);
  if (errors_with.length != 1)
    throw ['errors_to_missigned_bytes: expected one error to fail "with" michelson, but found:', errors_with]
  
  const error_with = errors_with[0];
  if (error_with.prim !== 'Pair')
    throw ['errors_to_missigned_bytes: expected a "Pair", but found:', error_with.prim]
  const error_with_args = error_with.args;
  if (error_with_args.length !== 2)
    throw ['errors_to_missigned_bytes: expected two arguments to "Pair", but found:', error_with_args]

  if (error_with_args[0].string.toLowerCase() !== 'missigned') 
    throw ['errors_to_missigned_bytes: expected a "missigned" annotation, but found:', error_with_args[0]]

  if (typeof error_with_args[1].bytes !== 'string') 
    throw ['errors_to_missigned_bytes: expected bytes, but found:', error_with_args[1]]

  return error_with_args[1].bytes
}

const permitParamHash = async (tz, contract, entrypoint, parameter) => {
  console.log("entrypoint ", entrypoint)
  console.log("parameter ", parameter)
  const raw_packed = await tz.rpc.packData({
    data: contract.parameterSchema.Encode(entrypoint, parameter),
    type: contract.parameterSchema.root.typeWithoutAnnotations(),
  });
  console.log(`PACKED PARAM: ${raw_packed.packed}`);
  return blake.blake2bHex(hex2buf(raw_packed.packed), null, 32);
}

const createPermitPayload = async (tz, contractAddress, entrypoint, params) => {
  const contract = await tz.contract.at(contractAddress);
  const signerKey = await tz.signer.publicKey();
  const signature = await tz.signer.sign("dummy_data").then(s => s.prefixSig);
  const paramHash = await permitParamHash(tz, contract, entrypoint, params);

  const transferParams = contract.methods.permit(signerKey, signature, paramHash).toTransferParams();

  const bytesToSign = await tz.estimate.transfer(transferParams).catch((e) => getBytesToSignFromErrors(e.errors));

  const sig = await tz.signer.sign(bytesToSign).then(s => s.prefixSig);
  return [signerKey, sig, paramHash];
}

(async () => {
  try {
      await main();
  } catch (e) {
      console.error(e)
  }
})();