import { RequestHandler } from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402-avm/express';
import { registerExactAvmScheme } from '@x402-avm/avm/exact/server';
import { HTTPFacilitatorClient } from '@x402-avm/core/server';
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm';

/**
 * Creates Express x402 payment middleware that gates specific routes
 * behind Algorand USDC micropayments.
 *
 * Requires environment variables:
 *   AVM_ADDRESS          – Algorand address to receive payments
 *   FACILITATOR_URL      – URL of the x402 facilitator (default: GoPlausible public facilitator)
 *   X402_BOUNTY_PRICE    – USD price string for creating a bounty (default: "$0.01")
 */
export function createX402Middleware(): RequestHandler {
  const payTo = process.env.AVM_ADDRESS;
  if (!payTo) {
    throw new Error(
      'AVM_ADDRESS environment variable is required for x402 payment middleware. ' +
        'Set it to the 58-character Algorand address that should receive payments.',
    );
  }

  const facilitatorUrl = process.env.FACILITATOR_URL || 'https://facilitator.goplausible.xyz';
  const bountyPrice = process.env.X402_BOUNTY_PRICE || '$0.01';

  // Define which routes require payment
  const routes = {
    'POST /api/bounties': {
      accepts: {
        scheme: 'exact' as const,
        network: ALGORAND_TESTNET_CAIP2 as `${string}:${string}`,
        payTo,
        price: bountyPrice,
      },
      description: 'Create a new bounty – requires USDC micropayment on Algorand',
    },
  };

  // Set up the x402 resource server with the remote facilitator
  const facilitatorClient = new HTTPFacilitatorClient({
    url: facilitatorUrl,
  });
  const server = new x402ResourceServer(facilitatorClient);
  registerExactAvmScheme(server);

  return paymentMiddleware(routes, server);
}
