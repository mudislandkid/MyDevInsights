import type { Page, Locator } from '@playwright/test'

/**
 * Test helper utilities for E2E tests
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the dashboard to load completely
   */
  async waitForDashboardLoad(): Promise<void> {
    // Wait for the main content to be visible
    await this.page.waitForSelector('[data-testid="dashboard"]', {
      state: 'visible',
      timeout: 10000,
    })

    // Wait for loading skeletons to disappear
    await this.page.waitForSelector('.animate-pulse', {
      state: 'hidden',
      timeout: 15000,
    })
  }

  /**
   * Get all project cards on the dashboard
   */
  async getProjectCards(): Promise<Locator[]> {
    const cards = await this.page.locator('[data-testid="project-card"]').all()
    return cards
  }

  /**
   * Search for projects by name
   */
  async searchProjects(query: string): Promise<void> {
    const searchInput = this.page.locator('[data-testid="search-input"]')
    await searchInput.fill(query)
    // Wait for debounce (300ms)
    await this.page.waitForTimeout(400)
  }

  /**
   * Filter projects by framework
   */
  async filterByFramework(framework: string): Promise<void> {
    const frameworkSelect = this.page.locator('[data-testid="framework-filter"]')
    await frameworkSelect.click()
    await this.page.locator(`text="${framework}"`).click()
  }

  /**
   * Filter projects by language
   */
  async filterByLanguage(language: string): Promise<void> {
    const languageSelect = this.page.locator('[data-testid="language-filter"]')
    await languageSelect.click()
    await this.page.locator(`text="${language}"`).click()
  }

  /**
   * Filter projects by status
   */
  async filterByStatus(status: string): Promise<void> {
    const statusSelect = this.page.locator('[data-testid="status-filter"]')
    await statusSelect.click()
    await this.page.locator(`text="${status}"`).click()
  }

  /**
   * Open project details modal
   */
  async openProjectDetails(projectName: string): Promise<void> {
    const card = this.page.locator(`[data-testid="project-card"]:has-text("${projectName}")`)
    const detailsButton = card.locator('[data-testid="view-details-button"]')
    await detailsButton.click()

    // Wait for modal to open
    await this.page.waitForSelector('[data-testid="project-detail-modal"]', {
      state: 'visible',
      timeout: 5000,
    })
  }

  /**
   * Close project details modal
   */
  async closeProjectDetails(): Promise<void> {
    const closeButton = this.page.locator('[data-testid="close-modal-button"]')
    await closeButton.click()

    // Wait for modal to close
    await this.page.waitForSelector('[data-testid="project-detail-modal"]', {
      state: 'hidden',
      timeout: 5000,
    })
  }

  /**
   * Trigger AI analysis for a project
   */
  async analyzeProject(projectName: string): Promise<void> {
    const card = this.page.locator(`[data-testid="project-card"]:has-text("${projectName}")`)
    const analyzeButton = card.locator('[data-testid="analyze-button"]')
    await analyzeButton.click()
  }

  /**
   * Wait for toast notification with specific message
   */
  async waitForToast(message: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(`[data-sonner-toast]:has-text("${message}")`, {
      state: 'visible',
      timeout,
    })
  }

  /**
   * Check if error boundary is displayed
   */
  async isErrorBoundaryVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector('text="Something went wrong"', {
        state: 'visible',
        timeout: 1000,
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Simulate offline mode
   */
  async goOffline(): Promise<void> {
    await this.page.context().setOffline(true)
  }

  /**
   * Simulate online mode
   */
  async goOnline(): Promise<void> {
    await this.page.context().setOffline(false)
  }

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await this.page.screenshot({
      path: `screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    })
  }
}
