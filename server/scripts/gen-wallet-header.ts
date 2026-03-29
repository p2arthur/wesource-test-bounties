/**
 * Generates a valid `Authorization: Wallet` header for manual API testing.
 *
 * Usage:
 *   npx ts-node scripts/gen-wallet-header.ts
 *   npx ts-node scripts/gen-wallet-header.ts --mnemonic "word1 word2 ... word25"
 *
 * Then paste the printed header into curl or Postman.
 */
import algosdk from 'algosdk';

const args = process.argv.slice(2);
const mnemonicFlag = args.indexOf('--mnemonic');

let account: algosdk.Account;
if (mnemonicFlag !== -1 && args[mnemonicFlag + 1]) {
  const mnemonic = args[mnemonicFlag + 1];
  account = algosdk.mnemonicToSecretKey(mnemonic);
  console.log('Using provided mnemonic.\n');
} else {
  account = algosdk.generateAccount();
  console.log('Generated a fresh throwaway account.\n');
}

const message = `WeSource login: ${Date.now()}`;
const signatureBytes = algosdk.signBytes(Buffer.from(message), account.sk);
const signatureB64 = Buffer.from(signatureBytes).toString('base64');

const header = `Wallet ${account.addr}:${signatureB64}:${message}`;

console.log('─'.repeat(60));
console.log(`Address:   ${account.addr}`);
console.log(`Message:   ${message}`);
if (mnemonicFlag === -1) {
  console.log(`Mnemonic:  ${algosdk.secretKeyToMnemonic(account.sk)}`);
  console.log('           (save this if you want to reuse the address)');
}
console.log('─'.repeat(60));
console.log('\nAuthorization header (copy this):');
console.log(`\n  ${header}\n`);
console.log('─'.repeat(60));
console.log('\nExample curl (replace URL and body as needed):');
console.log(`
curl -X POST http://localhost:3000/api/bounties \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: ${header}' \\
  -d '{"repoOwner":"owner","repoName":"repo","issueNumber":1,"amount":1,"creatorWallet":"${account.addr}"}'
`);
console.log('Note: header expires in 5 minutes. Re-run this script to get a fresh one.');
