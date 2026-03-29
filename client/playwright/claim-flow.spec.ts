import { test, expect } from '@playwright/test';

test.describe('Bounty Claim Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/bounties*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            bountyKey: 'test-key',
            repoOwner: 'octocat',
            repoName: 'hello-world',
            issueNumber: 123,
            issueUrl: 'https://github.com/octocat/hello-world/issues/123',
            amount: 10000000, // 10 ALGO in microAlgos
            creatorWallet: '0x123',
            status: 'READY_FOR_CLAIM',
            winnerId: 1,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            winner: {
              id: 1,
              username: 'octocat',
              wallet: '0x456'
            }
          }
        ])
      });
    });
  });

  test('shows claim button for READY_FOR_CLAIM bounty when winner wallet matches', async ({ page }) => {
    // Mock wallet connection (via localStorage)
    await page.addInitScript(() => {
      localStorage.setItem('activeAddress', '0x456');
      localStorage.setItem('walletType', 'traditional');
    });

    await page.goto('/bounty/1');
    await page.waitForLoadState('networkidle');

    // Should show claim button
    const claimButton = page.locator('button:has-text("Claim Bounty")');
    await expect(claimButton).toBeVisible();
    
    // Should show correct amount (10.00 ALGO)
    await expect(page.locator('text=10.00 ALGO')).toBeVisible();
  });

  test('shows link wallet button when winner has no wallet', async ({ page }) => {
    await page.route('**/api/bounties/2', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          bountyKey: 'test-key-2',
          repoOwner: 'octocat',
          repoName: 'hello-world',
          issueNumber: 124,
          issueUrl: 'https://github.com/octocat/hello-world/issues/124',
          amount: 5000000,
          creatorWallet: '0x123',
          status: 'READY_FOR_CLAIM',
          winnerId: 2,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          winner: {
            id: 2,
            username: 'alice',
            wallet: null // No wallet yet
          }
        })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('activeAddress', '0x789');
      localStorage.setItem('walletType', 'traditional');
    });

    await page.goto('/bounty/2');
    await page.waitForLoadState('networkidle');

    // Should show link wallet button
    const linkButton = page.locator('button:has-text("Link Wallet to Claim")');
    await expect(linkButton).toBeVisible();
  });

  test('shows OPEN bounty status message', async ({ page }) => {
    await page.route('**/api/bounties/3', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 3,
          bountyKey: 'test-key-3',
          repoOwner: 'octocat',
          repoName: 'hello-world',
          issueNumber: 125,
          issueUrl: 'https://github.com/octocat/hello-world/issues/125',
          amount: 10000000,
          creatorWallet: '0x123',
          status: 'OPEN',
          winnerId: null,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        })
      });
    });

    await page.goto('/bounty/3');
    await page.waitForLoadState('networkidle');

    // Should show solve message
    await expect(page.locator('text=Solve this issue on GitHub to win this bounty')).toBeVisible();
  });
});
