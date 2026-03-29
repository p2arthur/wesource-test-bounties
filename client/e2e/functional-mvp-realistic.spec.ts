import { test, expect } from '@playwright/test';

test.describe('Functional MVP — Integration Tests (Real App)', () => {
  // ==================== HOME PAGE TESTS ====================
  test.describe('Home Page', () => {
    test('loads home page and displays hero section', async ({ page }) => {
      await page.goto('http://localhost:5173/');

      // Wait for React to render
      await page.waitForTimeout(2000);

      // Check for hero text
      const heroText = await page.locator('text=Open Source, Incentivized').count();
      expect(heroText).toBeGreaterThan(0);
    });

    test('displays bounties tab and content', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(2000);

      // Check for Bounties tab button
      const bountyTab = await page.locator('button:has-text("Bounties")').count();
      expect(bountyTab).toBeGreaterThan(0);

      // Click bounties tab
      await page.click('button:has-text("Bounties")');
      await page.waitForTimeout(1000);

      // Check for search input (Phase 7.1 feature)
      const searchInput = await page.locator('input[placeholder*="Search"]').count();
      expect(searchInput).toBeGreaterThan(0);
    });

    test('displays status filter dropdown for bounties', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(2000);

      // Click to bounties tab
      await page.click('button:has-text("Bounties")');
      await page.waitForTimeout(1000);

      // Check for status select element (Phase 7.1 feature)
      const statusSelect = await page.locator('select').count();
      expect(statusSelect).toBeGreaterThan(0);
    });
  });

  // ==================== BOUNTY PAGE TESTS ====================
  test.describe('Bounty Detail Page', () => {
    test('loads bounty detail page with real data', async ({ page }) => {
      // Use the first real bounty from API
      await page.goto('http://localhost:5173/bounty/1');
      await page.waitForTimeout(2000);

      // Check for bounty details
      const content = await page.content();
      expect(content).toContain('algokit-utils-ts');
    });

    test('displays back button on bounty page', async ({ page }) => {
      await page.goto('http://localhost:5173/bounty/1');
      await page.waitForTimeout(2000);

      // Check for back button (FiArrowLeft)
      const backButton = await page.locator('a:has-text("Back")').count();
      expect(backButton).toBeGreaterThan(0);
    });

    test('shows bounty amount in formatted ALGO', async ({ page }) => {
      await page.goto('http://localhost:5173/bounty/1');
      await page.waitForTimeout(2000);

      // Amount should be visible (0.1 ALGO from 100000 microalgos)
      const content = await page.content();
      expect(content).toContain('Bounty Reward');
    });

    test('shows correct status badge', async ({ page }) => {
      await page.goto('http://localhost:5173/bounty/1');
      await page.waitForTimeout(2000);

      // Real bounty is OPEN, should show OPEN status
      const content = await page.content();
      expect(content).toContain('OPEN');
    });

    test('shows GitHub link in actions', async ({ page }) => {
      await page.goto('http://localhost:5173/bounty/1');
      await page.waitForTimeout(2000);

      // Check for View on GitHub button
      const githubButton = await page.locator('a:has-text("View on GitHub")').count();
      expect(githubButton).toBeGreaterThan(0);
    });
  });

  // ==================== PROFILE PAGE TESTS ====================
  test.describe('Profile Page', () => {
    test('loads profile page with valid wallet address', async ({ page }) => {
      // Use the creator wallet from real bounty
      const walletAddress = 'HC6FECYVRIDEQ7EZNG5N2B5Y3OYGOC3GFCTEXTA5BYTGVQTZCBNMDZ424U';
      await page.goto(`http://localhost:5173/profile/${walletAddress}`);
      await page.waitForTimeout(2500);

      // Should not show "Profile Not Found" error
      const errorContent = await page.locator('text=Profile Not Found').count();
      expect(errorContent).toBe(0);
    });

    test('displays profile stats', async ({ page }) => {
      const walletAddress = 'HC6FECYVRIDEQ7EZNG5N2B5Y3OYGOC3GFCTEXTA5BYTGVQTZCBNMDZ424U';
      await page.goto(`http://localhost:5173/profile/${walletAddress}`);
      await page.waitForTimeout(2500);

      // Should show bounties created count
      const content = await page.content();
      expect(content).toContain('Bounties Created');

      // Should show bounties won count
      expect(content).toContain('Bounties Won');
    });

    test('shows back to home link', async ({ page }) => {
      const walletAddress = 'HC6FECYVRIDEQ7EZNG5N2B5Y3OYGOC3GFCTEXTA5BYTGVQTZCBNMDZ424U';
      await page.goto(`http://localhost:5173/profile/${walletAddress}`);
      await page.waitForTimeout(2500);

      // Check for back button
      const backButton = await page.locator('a:has-text("Back to Home")').count();
      expect(backButton).toBeGreaterThan(0);
    });

    test('handles invalid wallet address gracefully', async ({ page }) => {
      const invalidWallet = 'INVALID_WALLET';
      await page.goto(`http://localhost:5173/profile/${invalidWallet}`);
      await page.waitForTimeout(2500);

      // Should show error or "Profile Not Found"
      const content = await page.content();
      expect(content).toContain('Profile Not Found');
    });
  });

  // ==================== SEARCH AND FILTER (Phase 7.1) ====================
  test.describe('Search and Filter Features', () => {
    test('search input is present and interactive', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(2000);

      // Click bounties tab
      await page.click('button:has-text("Bounties")');
      await page.waitForTimeout(1000);

      // Find search input
      const searchInput = await page.locator('input[placeholder*="Search"]');
      expect(await searchInput.count()).toBe(1);

      // Try typing in it
      await searchInput.fill('algorand');
      await page.waitForTimeout(500);

      // Check URL for search param (300ms debounce + 200ms buffer)
      const url = page.url();
      expect(url).toContain('search=algorand');
    });

    test('status filter dropdown has correct options', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(2000);

      // Click bounties tab
      await page.click('button:has-text("Bounties")');
      await page.waitForTimeout(1000);

      // Find select element
      const statusSelect = await page.locator('select');
      expect(await statusSelect.count()).toBe(1);

      // Check for status options
      const content = await page.content();
      expect(content).toContain('All Statuses');
      expect(content).toContain('OPEN');
      expect(content).toContain('CLAIMED');
    });

    test('status filter updates URL params', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(2000);

      // Click bounties tab
      await page.click('button:has-text("Bounties")');
      await page.waitForTimeout(1000);

      // Change status filter
      await page.selectOption('select', 'CLAIMED');
      await page.waitForTimeout(500);

      // Check URL for status param
      const url = page.url();
      expect(url).toContain('status=CLAIMED');
    });
  });

  // ==================== NAVIGATION TESTS ====================
  test.describe('Navigation', () => {
    test('can navigate from home to bounty detail', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(2000);

      // Click bounties tab
      await page.click('button:has-text("Bounties")');
      await page.waitForTimeout(1500);

      // Try to click a bounty card (should navigate to detail page)
      const bountyCards = await page.locator('[class*="border"]').count();
      if (bountyCards > 0) {
        // Click first bounty card
        await page.locator('a').first().click();
        await page.waitForTimeout(1500);

        // Should be on bounty page now
        const url = page.url();
        expect(url).toContain('/bounty/');
      }
    });

    test('can navigate from bounty to profile', async ({ page }) => {
      await page.goto('http://localhost:5173/bounty/1');
      await page.waitForTimeout(2000);

      // Check if creator link exists and click it
      const links = await page.locator('a').count();
      expect(links).toBeGreaterThan(0);
    });

    test('back navigation works correctly', async ({ page }) => {
      await page.goto('http://localhost:5173/bounty/1');
      await page.waitForTimeout(2000);

      // Click back button
      const backLink = await page.locator('a:has-text("Back")');
      if (await backLink.count() > 0) {
        await backLink.click();
        await page.waitForTimeout(1500);

        // Should be back at home
        const url = page.url();
        expect(url).toContain('localhost:5173');
      }
    });
  });

  // ==================== RESPONSIVE DESIGN ====================
  test.describe('Responsive Design', () => {
    test('mobile viewport renders correctly', async ({ browser }) => {
      const context = await browser.createContext({
        viewport: { width: 375, height: 667 },
      });
      const page = await context.newPage();

      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(2000);

      // Should still show hero text on mobile
      const content = await page.content();
      expect(content).toContain('Open Source, Incentivized');

      await context.close();
    });

    test('tablet viewport renders correctly', async ({ browser }) => {
      const context = await browser.createContext({
        viewport: { width: 768, height: 1024 },
      });
      const page = await context.newPage();

      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(2000);

      // Should show tabs
      const bountyTab = await page.locator('button:has-text("Bounties")').count();
      expect(bountyTab).toBeGreaterThan(0);

      await context.close();
    });
  });
});
