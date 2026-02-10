// Brute-force bounty ID reverse lookup

const targetIds = [BigInt('626126353086499072'), BigInt('626126353086499075'), BigInt('626126353086499076')];

// DJB2 hash function (same as the contract)
function computeBountyId(owner, repo, issueNumber) {
  const canonical = `${owner.trim().toLowerCase()}|${repo.trim().toLowerCase()}|${Number(issueNumber)}`;
  let hash = BigInt(5381);
  for (let i = 0; i < canonical.length; i++) {
    hash = ((hash << BigInt(5)) + hash) ^ BigInt(canonical.charCodeAt(i));
    hash = hash & BigInt('0xFFFFFFFFFFFFFFFF');
  }
  return hash;
}

// Test repos
const testRepos = [
  { owner: 'p2arthur', repo: 'wesource_monorepo' },
  { owner: 'p2arthur', repo: 'wesource' },
  { owner: 'p2arthur', repo: 'WeSource' },
  { owner: 'algorandfoundation', repo: 'algokit-utils-ts' },
  { owner: 'algorandfoundation', repo: 'puya-ts' },
  { owner: 'algorandfoundation', repo: 'algokit-cli' },
  { owner: 'test', repo: 'test' },
  { owner: 'demo', repo: 'demo' },
  { owner: 'a', repo: 'a' },
  { owner: 'owner', repo: 'repo' },
];

console.log('Searching for repos matching bounty IDs...\n');
console.log(
  'Target IDs:',
  targetIds.map((id) => id.toString()),
);
console.log('');

let found = 0;

for (const { owner, repo } of testRepos) {
  for (let issue = 1; issue <= 100; issue++) {
    const id = computeBountyId(owner, repo, issue);
    if (targetIds.some((t) => t === id)) {
      console.log(`FOUND: ${owner}/${repo}#${issue} => ID: ${id}`);
      found++;
    }
  }
}

if (found === 0) {
  console.log('No matches found with tested repos. Trying more patterns...');

  // Try single letter combinations
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < alphabet.length; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      const owner = alphabet[i];
      const repo = alphabet[j];
      for (let issue = 1; issue <= 20; issue++) {
        const id = computeBountyId(owner, repo, issue);
        if (targetIds.some((t) => t === id)) {
          console.log(`FOUND: ${owner}/${repo}#${issue} => ID: ${id}`);
          found++;
        }
      }
    }
  }
}

console.log(`\nSearch complete. Found ${found} matches.`);
