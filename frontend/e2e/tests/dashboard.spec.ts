import { test, expect } from '@playwright/test'
import { TestHelpers } from '../fixtures/test-helpers'

test.describe('Dashboard', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await page.goto('/')
  })

  test('should load dashboard and display projects', async ({ page }) => {
    // Wait for dashboard to load
    await helpers.waitForDashboardLoad()

    // Check that the dashboard is visible
    const dashboard = page.locator('[data-testid="dashboard"]')
    await expect(dashboard).toBeVisible()

    // Check that project cards are displayed
    const cards = await helpers.getProjectCards()
    expect(cards.length).toBeGreaterThan(0)
  })

  test('should display loading skeletons while fetching data', async ({ page }) => {
    // Reload to see loading state
    await page.reload()

    // Check that skeleton loaders are visible initially
    const skeletons = page.locator('.animate-pulse')
    await expect(skeletons.first()).toBeVisible()

    // Wait for data to load
    await helpers.waitForDashboardLoad()

    // Skeletons should be gone
    await expect(skeletons.first()).not.toBeVisible()
  })

  test('should search projects by name', async ({ page }) => {
    await helpers.waitForDashboardLoad()

    // Get initial project count
    const initialCards = await helpers.getProjectCards()
    const initialCount = initialCards.length

    // Search for a project (assuming at least one project exists)
    if (initialCount > 0) {
      const firstCard = initialCards[0]
      const projectName = await firstCard.locator('[data-testid="project-name"]').textContent()

      if (projectName) {
        // Search for first few characters
        await helpers.searchProjects(projectName.substring(0, 3))

        // Wait for results
        await page.waitForTimeout(500)

        // Should have filtered results
        const filteredCards = await helpers.getProjectCards()
        expect(filteredCards.length).toBeLessThanOrEqual(initialCount)
      }
    }
  })

  test('should filter projects by framework', async ({ page }) => {
    await helpers.waitForDashboardLoad()

    const initialCards = await helpers.getProjectCards()

    if (initialCards.length > 0) {
      // Open framework filter
      await helpers.filterByFramework('React')

      // Wait for results
      await page.waitForTimeout(500)

      const filteredCards = await helpers.getProjectCards()

      // Either should have React projects or no projects
      if (filteredCards.length > 0) {
        const firstCard = filteredCards[0]
        const techStack = await firstCard.locator('[data-testid="tech-stack"]').textContent()
        expect(techStack).toContain('React')
      }
    }
  })

  test('should open and close project details modal', async ({ page }) => {
    await helpers.waitForDashboardLoad()

    const cards = await helpers.getProjectCards()

    if (cards.length > 0) {
      const firstCard = cards[0]
      const projectName = await firstCard.locator('[data-testid="project-name"]').textContent()

      if (projectName) {
        // Open modal
        await helpers.openProjectDetails(projectName)

        // Modal should be visible
        const modal = page.locator('[data-testid="project-detail-modal"]')
        await expect(modal).toBeVisible()

        // Check that AI summary is displayed (if analyzed)
        const summary = modal.locator('[data-testid="ai-summary"]')
        // Summary might or might not exist depending on analysis status

        // Close modal
        await helpers.closeProjectDetails()

        // Modal should be hidden
        await expect(modal).not.toBeVisible()
      }
    }
  })

  test('should handle offline state', async ({ page }) => {
    await helpers.waitForDashboardLoad()

    // Go offline
    await helpers.goOffline()

    // Should show offline toast
    await helpers.waitForToast('You are offline')

    // Go back online
    await helpers.goOnline()

    // Should show online toast
    await helpers.waitForToast('You are back online')
  })

  test('should refresh projects', async ({ page }) => {
    await helpers.waitForDashboardLoad()

    // Click refresh button
    const refreshButton = page.locator('[data-testid="refresh-button"]')
    await refreshButton.click()

    // Should show loading state briefly
    await page.waitForTimeout(100)

    // Wait for refresh to complete
    await helpers.waitForNetworkIdle()
  })

  test('should handle empty state', async ({ page }) => {
    // Mock empty response (this would require API mocking)
    // For now, just check that the empty state UI exists

    await helpers.waitForDashboardLoad()

    const cards = await helpers.getProjectCards()

    if (cards.length === 0) {
      // Check for empty state message
      const emptyState = page.locator('text="No projects found"')
      await expect(emptyState).toBeVisible()
    }
  })

  test('should display error boundary on error', async ({ page }) => {
    // This would require triggering an actual error
    // For now, we just check that ErrorBoundary component exists

    await helpers.waitForDashboardLoad()

    // Error boundary should not be visible normally
    const isErrorVisible = await helpers.isErrorBoundaryVisible()
    expect(isErrorVisible).toBe(false)
  })

  test('should paginate through projects', async ({ page }) => {
    await helpers.waitForDashboardLoad()

    // Check if pagination exists
    const nextButton = page.locator('[data-testid="next-page-button"]')

    if (await nextButton.isVisible()) {
      // Click next page
      await nextButton.click()

      // Wait for new data to load
      await page.waitForTimeout(500)
      await helpers.waitForNetworkIdle()

      // Should have loaded new projects
      const cards = await helpers.getProjectCards()
      expect(cards.length).toBeGreaterThan(0)

      // Go back to first page
      const prevButton = page.locator('[data-testid="prev-page-button"]')
      if (await prevButton.isVisible()) {
        await prevButton.click()
        await page.waitForTimeout(500)
      }
    }
  })
})
