import { test, expect, type Page } from '@playwright/test'

const livesOf = async (page: Page) => {
  const label = await page.locator('[class*="livesRow"]').getAttribute('aria-label')
  return Number(/Lives: (\d+)/.exec(label ?? '')?.[1] ?? -1)
}

const tileYs = (page: Page) =>
  page.$$eval('.tile', els =>
    els.map(e => {
      const m = /translateY\(([-\d.]+)px\)/.exec((e as HTMLElement).style.transform || '')
      return m ? Math.round(parseFloat(m[1])) : null
    }),
  )

test.describe('LetterDrop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/letter-drop')
  })

  test('starts, spawns tiles, and shows the HUD', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible()
    await page.getByRole('button', { name: 'Start Game' }).click()

    await expect(page.locator('.tile').first()).toBeVisible({ timeout: 10_000 })
    expect(await livesOf(page)).toBe(3)
  })

  test('rejects a wrong answer without costing a life', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Game' }).click()
    await expect(page.locator('.tile').first()).toBeVisible({ timeout: 10_000 })

    const input = page.locator('[class*="answerInput"]')
    await input.fill('DEFINITELYNOTAWORD')
    await input.press('Enter')

    expect(await livesOf(page)).toBe(3)
  })

  // Regression: fall progress is derived from performance.now(), so a pause
  // used to advance every tile and drain lives on resume.
  test('pausing does not advance tiles or cost lives', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Game' }).click()
    await expect(page.locator('.tile').first()).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(4000)

    const livesBefore = await livesOf(page)
    const ysBefore = await tileYs(page)
    expect(ysBefore.length).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Pause game' }).click()
    await page.waitForTimeout(8000) // longer than the fastest fall duration
    await page.getByRole('button', { name: 'Resume game' }).click()
    await page.waitForTimeout(250)

    const ysAfter = await tileYs(page)
    const livesAfter = await livesOf(page)

    expect(livesAfter, 'an 8s pause must not cost lives').toBe(livesBefore)
    expect(ysAfter.length, 'tiles must survive the pause').toBeGreaterThanOrEqual(ysBefore.length)

    const maxJump = Math.max(
      ...ysAfter.map((y, i) => (ysBefore[i] == null || y == null ? 0 : Math.abs(y - ysBefore[i]))),
      0,
    )
    expect(maxJump, 'tiles must not jump forward by the paused duration').toBeLessThan(60)
  })

  test('no tiles spawn while paused', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Game' }).click()
    await expect(page.locator('.tile').first()).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Pause game' }).click()
    const count = await page.locator('.tile').count()
    await page.waitForTimeout(6000)
    expect(await page.locator('.tile').count()).toBe(count)
  })
})
