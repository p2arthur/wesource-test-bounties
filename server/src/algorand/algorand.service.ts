import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { Arc56Contract } from '@algorandfoundation/algokit-utils/types/app-arc56';
import * as fs from 'fs';
import * as path from 'path';
import algosdk from 'algosdk';
import axios from 'axios';

export interface OnChainBounty {
  bountyId: bigint;
  totalValue: bigint; // in microAlgos
  isPaid: boolean;
  winnerAddress: string | null; // null if zero address
}

export interface BountyCreationTransaction {
  bountyId: bigint;
  bountyValue: bigint;
  txId: string;
  sender: string;
  timestamp: number;
}

@Injectable()
export class AlgorandService implements OnModuleInit {
  private readonly logger = new Logger(AlgorandService.name);
  private algorand: AlgorandClient;
  private appSpec: Arc56Contract;
  private appId: bigint;
  private managerAddress: string;
  private algodClient: algosdk.Algodv2;
  private indexerBaseUrl: string;

  onModuleInit() {
    this.initialize();
  }

  private initialize() {
    const algodServer = process.env.ALGOD_SERVER || 'http://localhost';
    const algodPort = process.env.ALGOD_PORT || '';
    const algodToken = process.env.ALGOD_TOKEN || '';
    const appIdEnv = process.env.SOURCE_FACTORY_APP_ID;
    const managerMnemonic = process.env.MANAGER_MNEMONIC;

    // Indexer configuration (defaults to TestNet via Algonode)
    const indexerServer = process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud';
    const indexerPort = process.env.INDEXER_PORT || '';
    this.indexerBaseUrl = indexerPort ? `${indexerServer}:${indexerPort}` : indexerServer;
    this.logger.log(`Indexer configured at ${this.indexerBaseUrl}`);

    if (!appIdEnv) {
      this.logger.warn('SOURCE_FACTORY_APP_ID not set. Algorand integration disabled.');
      return;
    }

    this.appId = BigInt(appIdEnv);

    // Initialize raw algod client for box queries (works without manager)
    this.algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort || undefined);
    this.logger.log(`Algod client initialized for ${algodServer}. App ID: ${this.appId}`);

    // Load ARC-56 app spec (needed for write operations)
    const appSpecPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'contracts',
      'smart_contracts',
      'artifacts',
      'source_factory',
      'SourceFactory.arc56.json',
    );

    if (fs.existsSync(appSpecPath)) {
      this.appSpec = JSON.parse(fs.readFileSync(appSpecPath, 'utf-8')) as Arc56Contract;
      this.logger.log(`Loaded ARC-56 app spec from ${appSpecPath}`);
    } else {
      // Fallback: try relative to server root
      const altPath = path.join(
        process.cwd(),
        '..',
        'contracts',
        'smart_contracts',
        'artifacts',
        'source_factory',
        'SourceFactory.arc56.json',
      );
      if (fs.existsSync(altPath)) {
        this.appSpec = JSON.parse(fs.readFileSync(altPath, 'utf-8')) as Arc56Contract;
        this.logger.log(`Loaded ARC-56 app spec from ${altPath}`);
      } else {
        this.logger.warn('SourceFactory.arc56.json not found. Withdraw operations disabled.');
      }
    }

    // Manager setup is optional - only needed for withdrawals
    if (managerMnemonic && this.appSpec) {
      // Initialize AlgorandClient for write operations
      this.algorand = AlgorandClient.fromConfig({
        algodConfig: {
          server: algodServer,
          port: algodPort || undefined,
          token: algodToken,
        },
      });

      // Create manager account from mnemonic
      const managerAccount = this.algorand.account.fromMnemonic(managerMnemonic);
      this.managerAddress = managerAccount.addr.toString();
      this.logger.log(`Manager configured: ${this.managerAddress}`);
    } else if (!managerMnemonic) {
      this.logger.warn('MANAGER_MNEMONIC not set. Bounty claims will fail, but read operations work.');
    }
  }

  /**
   * Computes the deterministic bounty ID from repo info (same algorithm as client)
   */
  computeBountyId(repoOwner: string, repoName: string, issueNumber: number): bigint {
    const canonicalOwner = repoOwner.trim().toLowerCase();
    const canonicalRepo = repoName.trim().toLowerCase();
    const canonicalIssueNumber = Number(issueNumber);
    const canonical = `${canonicalOwner}|${canonicalRepo}|${canonicalIssueNumber}`;

    // djb2 hash algorithm (same as client)
    let hash = BigInt(5381);
    for (let i = 0; i < canonical.length; i++) {
      hash = ((hash << BigInt(5)) + hash) ^ BigInt(canonical.charCodeAt(i));
      hash = hash & BigInt('0xFFFFFFFFFFFFFFFF'); // Keep as 64-bit
    }
    return hash;
  }

  /**
   * Withdraws bounty to the winner's wallet address
   */
  async withdrawBounty(repoOwner: string, repoName: string, issueNumber: number, winnerWallet: string): Promise<{ txId: string }> {
    if (!this.algorand || !this.appSpec) {
      throw new Error('Algorand service not initialized. Check environment configuration.');
    }

    const bountyId = this.computeBountyId(repoOwner, repoName, issueNumber);

    this.logger.log(`Withdrawing bounty ${bountyId} to ${winnerWallet}`);

    // Build box reference for the bounty
    const boxKeyPrefix = Buffer.from('b__');
    const bountyIdBytes = Buffer.alloc(8);
    bountyIdBytes.writeBigUInt64BE(bountyId);
    const boxKey = Buffer.concat([boxKeyPrefix, bountyIdBytes]);

    // Get app client
    const appClient = this.algorand.client.getAppClientById({
      appSpec: this.appSpec,
      appId: this.appId,
      defaultSender: this.managerAddress,
    });

    // Call withdraw_bounty method
    const result = await appClient.send.call({
      method: 'withdraw_bounty',
      args: [bountyId, winnerWallet],
      boxReferences: [{ appId: this.appId, name: boxKey }],
    });

    this.logger.log(`Bounty ${bountyId} withdrawn successfully. TxID: ${result.txIds[0]}`);

    return { txId: result.txIds[0] };
  }

  /**
   * Fetches all bounty boxes from the on-chain contract and parses their data.
   * Returns an array of on-chain bounty states.
   */
  async getOnChainBounties(): Promise<OnChainBounty[]> {
    if (!this.algodClient || !this.appId) {
      this.logger.warn('Algorand service not configured. Cannot fetch on-chain bounties.');
      return [];
    }

    const bounties: OnChainBounty[] = [];
    const boxPrefix = Buffer.from('b__');

    try {
      // Get all box names for the app
      const boxesResponse = await this.algodClient.getApplicationBoxes(Number(this.appId)).do();

      for (const boxDesc of boxesResponse.boxes) {
        const boxName = Buffer.from(boxDesc.name);

        // Check if this is a bounty box (has 'b__' prefix)
        if (!boxName.subarray(0, 3).equals(boxPrefix)) {
          continue;
        }

        // Extract bounty ID from box name (8 bytes after prefix)
        const bountyIdBytes = boxName.subarray(3, 11);
        const bountyId = bountyIdBytes.readBigUInt64BE(0);

        console.log(`Fetching on-chain data for bounty ID ${bountyId}...`);

        // Fetch box contents
        const boxResponse = await this.algodClient.getApplicationBoxByName(Number(this.appId), boxName).do();
        const boxValue = Buffer.from(boxResponse.value);

        // Parse BountyDataType struct:
        // - bounty_total_value: uint64 (8 bytes)
        // - bounty_paid: bool (1 byte)
        // - bounty_winner: address (32 bytes)
        const totalValue = boxValue.readBigUInt64BE(0);
        const isPaid = boxValue[8] !== 0;
        const winnerBytes = boxValue.subarray(9, 41);

        // Check if winner is zero address
        const isZeroAddress = winnerBytes.every((b) => b === 0);
        const winnerAddress = isZeroAddress ? null : algosdk.encodeAddress(winnerBytes);

        bounties.push({
          bountyId,
          totalValue,
          isPaid,
          winnerAddress,
        });
      }

      this.logger.log(`Fetched ${bounties.length} bounties from on-chain.`);
      return bounties;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch on-chain bounties: ${message}`);
      return [];
    }
  }

  /**
   * Fetches a single bounty box by its computed bounty ID.
   */
  async getOnChainBounty(bountyId: bigint): Promise<OnChainBounty | null> {
    if (!this.algodClient || !this.appId) {
      return null;
    }

    const boxPrefix = Buffer.from('b__');
    const bountyIdBytes = Buffer.alloc(8);
    bountyIdBytes.writeBigUInt64BE(bountyId);
    const boxName = Buffer.concat([boxPrefix, bountyIdBytes]);

    try {
      const boxResponse = await this.algodClient.getApplicationBoxByName(Number(this.appId), boxName).do();
      const boxValue = Buffer.from(boxResponse.value);

      const totalValue = boxValue.readBigUInt64BE(0);
      const isPaid = boxValue[8] !== 0;
      const winnerBytes = boxValue.subarray(9, 41);
      const isZeroAddress = winnerBytes.every((b) => b === 0);
      const winnerAddress = isZeroAddress ? null : algosdk.encodeAddress(winnerBytes);

      return {
        bountyId,
        totalValue,
        isPaid,
        winnerAddress,
      };
    } catch {
      return null;
    }
  }

  /**
   * Returns true if the service can perform read operations (fetch on-chain state)
   */
  isReadConfigured(): boolean {
    return !!this.algodClient && !!this.appId;
  }

  /**
   * Returns true if the service can perform write operations (withdraw bounties)
   */
  isConfigured(): boolean {
    return !!this.algorand && !!this.appSpec && !!this.managerAddress;
  }

  /**
   * Fetches bounty creation transactions from the indexer.
   * This queries historical transactions to find all create_bounty method calls.
   * Returns parsed bounty data including bounty_id and bounty_value.
   */
  async getBountyCreationTransactions(): Promise<BountyCreationTransaction[]> {
    if (!this.appId || !this.indexerBaseUrl) {
      this.logger.warn('App ID or Indexer not configured. Cannot fetch transactions.');
      return [];
    }

    const transactions: BountyCreationTransaction[] = [];
    let nextToken: string | undefined;

    // Method selector for create_bounty(uint64,uint64)void
    // ARC-4 method selector is first 4 bytes of SHA-512/256 of method signature
    const createBountySelector = Buffer.from([0x2c, 0x5b, 0x7f, 0x85]); // Pre-computed selector

    try {
      do {
        // Build URL for indexer query
        let url = `${this.indexerBaseUrl}/v2/transactions?application-id=${this.appId}&tx-type=appl&limit=100`;
        if (nextToken) {
          url += `&next=${nextToken}`;
        }

        const response = await axios.get(url);
        const data = response.data;

        for (const txn of data.transactions || []) {
          // Check if this is an application call
          if (txn['tx-type'] !== 'appl' || !txn['application-transaction']) {
            continue;
          }

          const appTxn = txn['application-transaction'];
          const args = appTxn['application-args'] || [];

          if (args.length < 3) {
            continue; // create_bounty needs selector + 2 args
          }

          // Decode first arg (method selector)
          const selector = Buffer.from(args[0], 'base64');

          // Check if this is create_bounty by matching the first 4 bytes
          if (
            selector.length >= 4 &&
            selector[0] === createBountySelector[0] &&
            selector[1] === createBountySelector[1] &&
            selector[2] === createBountySelector[2] &&
            selector[3] === createBountySelector[3]
          ) {
            // Decode bounty_id and bounty_value from args
            const bountyIdBytes = Buffer.from(args[1], 'base64');
            const bountyValueBytes = Buffer.from(args[2], 'base64');

            if (bountyIdBytes.length === 8 && bountyValueBytes.length === 8) {
              const bountyId = bountyIdBytes.readBigUInt64BE(0);
              const bountyValue = bountyValueBytes.readBigUInt64BE(0);

              transactions.push({
                bountyId,
                bountyValue,
                txId: txn.id,
                sender: txn.sender,
                timestamp: txn['round-time'] || 0,
              });

              this.logger.debug(`Found create_bounty tx: bountyId=${bountyId}, value=${bountyValue} microAlgos`);
            }
          }
        }

        nextToken = data['next-token'];
      } while (nextToken);

      this.logger.log(`Found ${transactions.length} bounty creation transactions from indexer.`);
      return transactions;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch transactions from indexer: ${message}`);
      return [];
    }
  }

  /**
   * Returns the app ID for external reference
   */
  getAppId(): bigint | null {
    return this.appId ?? null;
  }
}
