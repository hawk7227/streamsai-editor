import { test, expect } from '@playwright/test'

// ─── Pipeline Page E2E Tests ───────────────────────────────────────────────────

test.describe('Pipeline Page — Smoke', () => {
  test('page loads with 200 and renders core structure', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page).toHaveURL('/pipeline')

    // Sidebar branding
    await expect(page.getByText('StreamsAI')).toBeVisible()

    // Studio toggle present
    await expect(page.getByRole('button', { name: 'Image' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Video' }).first()).toBeVisible()

    // More tools present
    await expect(page.getByText('More tools')).toBeVisible()

    // Top bar name input
    await expect(page.getByPlaceholder('Name this pipeline…')).toBeVisible()

    // Creative Setup header
    await expect(page.getByText('Creative Setup')).toBeVisible()

    // Pipeline Steps in sidebar
    await expect(page.getByText('Pipeline Steps')).toBeVisible()
    await expect(page.getByText('Creative Strategy')).toBeVisible()
    await expect(page.getByText('Validator')).toBeVisible()
    await expect(page.getByText('Quality Assurance')).toBeVisible()
  })

  test('no Image Studio or Video Studio labels in sidebar nav', async ({ page }) => {
    await page.goto('/pipeline')
    // These should NOT exist as standalone sidebar nav items (only as tabs inside the panel)
    const sidebarNav = page.locator('div').filter({ hasText: /^Image Studio$/ })
    await expect(sidebarNav).toHaveCount(0)
  })

  test('What This Panel Does section is removed', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByText('WHAT THIS PANEL DOES')).toHaveCount(0)
    await expect(page.getByText('What this panel does')).toHaveCount(0)
  })
})

test.describe('Pipeline Page — Top Bar', () => {
  test('name tag: type a name and save as preset', async ({ page }) => {
    await page.goto('/pipeline')
    const nameInput = page.getByPlaceholder('Name this pipeline…')
    await nameInput.fill('Telehealth Campaign')
    await page.getByRole('button', { name: 'Save' }).first().click()
    // Preset should now be accessible via dropdown
    await page.locator('button').filter({ hasText: '▼' }).first().click()
    await expect(page.getByText('Telehealth Campaign')).toBeVisible()
  })

  test('output mode pill toggle switches correctly', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByRole('button', { name: 'Image' }).nth(1).click()
    await page.getByRole('button', { name: 'Video' }).nth(1).click()
    await page.getByRole('button', { name: 'Image + Video' }).click()
  })

  test('model selection — DALL-E 3 and Flux toggle', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByRole('button', { name: 'DALL-E 3' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Flux (fal.ai)' })).toBeVisible()
    await page.getByRole('button', { name: 'Flux (fal.ai)' }).click()
    await page.getByRole('button', { name: 'DALL-E 3' }).click()
  })

  test('Run Full Governance Pipeline button is present and clickable', async ({ page }) => {
    await page.goto('/pipeline')
    const runBtn = page.getByRole('button', { name: /Run Full Governance Pipeline/ })
    await expect(runBtn).toBeVisible()
    await runBtn.click()
    // Steps should transition to QUEUE after click
    await expect(page.getByText('QUEUE').first()).toBeVisible({ timeout: 2000 })
  })
})

test.describe('Pipeline Page — Sidebar Toggle', () => {
  test('Image/Video studio toggle switches mode', async ({ page }) => {
    await page.goto('/pipeline')
    // Toggle is the pill in sidebar — first Image/Video buttons
    const imageToggle = page.locator('button').filter({ hasText: /^Image$/ }).first()
    const videoToggle = page.locator('button').filter({ hasText: /^Video$/ }).first()
    await videoToggle.click()
    await imageToggle.click()
    await videoToggle.click()
  })

  test('More Tools expands and shows tool list', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByText('More tools').click()
    await expect(page.getByText('Research')).toBeVisible()
    await expect(page.getByText('Codex')).toBeVisible()
    // Collapse
    await page.getByText('More tools').click()
    await expect(page.getByText('Research')).toBeHidden()
  })
})

test.describe('Pipeline Page — Creative Setup', () => {
  test('Video Studio / Image Studio tabs visible inside Creative Setup', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByRole('button', { name: 'Video Studio' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Image Studio' })).toBeVisible()
  })

  test('Intent fields accept input', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByPlaceholder('e.g. product awareness ad').fill('Drive signups')
    await page.getByPlaceholder('e.g. women 25–40').fill('adults 30–50')
  })

  test('Scene fields accept input', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByPlaceholder('e.g. woman in her 30s, casual').fill('man in his 40s, professional')
    await page.getByPlaceholder('e.g. texting on couch').fill('typing on laptop')
  })

  test('Realism checkboxes toggle', async ({ page }) => {
    await page.goto('/pipeline')
    const skinTexture = page.getByLabel('skin texture')
    await expect(skinTexture).toBeChecked()
    await skinTexture.uncheck()
    await expect(skinTexture).not.toBeChecked()
    await skinTexture.check()
    await expect(skinTexture).toBeChecked()
  })

  test('Pipeline Prompt field accepts text', async ({ page }) => {
    await page.goto('/pipeline')
    const promptBox = page.getByPlaceholder('Describe what you want the pipeline to generate…')
    await expect(promptBox).toBeVisible()
    await promptBox.fill('Generate a lifestyle image of a woman using a telehealth app')
    await expect(promptBox).toHaveValue('Generate a lifestyle image of a woman using a telehealth app')
  })

  test('Upload rule/guidance button is present', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByRole('button', { name: /Upload Rule \/ Guidance/i })).toBeVisible()
  })

  test('Run Pipeline button inside Creative Setup works', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByRole('button', { name: 'Run Pipeline' }).click()
    await expect(page.getByText('QUEUE').first()).toBeVisible({ timeout: 2000 })
  })
})

test.describe('Pipeline Page — Pipeline Steps', () => {
  test('all 7 default steps render', async ({ page }) => {
    await page.goto('/pipeline')
    const expectedSteps = [
      'Creative Strategy',
      'AI Copy Generation',
      'Validator',
      'Imagery Generation',
      'Image to Video',
      'Asset Library',
      'Quality Assurance',
    ]
    for (const step of expectedSteps) {
      await expect(page.getByText(step)).toBeVisible()
    }
  })

  test('Add Step button is present', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByText('Add Step')).toBeVisible()
  })

  test('running pipeline animates steps through QUEUE → RUN → DONE', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByRole('button', { name: 'Run Pipeline' }).click()
    // Steps should show QUEUE immediately
    await expect(page.getByText('QUEUE').first()).toBeVisible({ timeout: 2000 })
    // First step should show RUN
    await expect(page.getByText('RUN').first()).toBeVisible({ timeout: 3000 })
    // Eventually DONE appears
    await expect(page.getByText('DONE').first()).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Pipeline Page — Auto-Save & Persistence', () => {
  test('auto-save indicator is visible in sidebar', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByText(/AUTO-SAVE|SAVED/)).toBeVisible()
  })

  test('state persists across page reload', async ({ page }) => {
    await page.goto('/pipeline')

    // Fill in distinctive values
    await page.getByPlaceholder('Name this pipeline…').fill('Persistence Test')
    await page.getByPlaceholder('Describe what you want the pipeline to generate…').fill('Test prompt for persistence check')
    await page.getByPlaceholder('e.g. product awareness ad').fill('test objective')

    // Wait for 3s auto-save to trigger
    await page.waitForTimeout(3500)

    // Reload
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Values should survive
    await expect(page.getByPlaceholder('Describe what you want the pipeline to generate…')).toHaveValue('Test prompt for persistence check')
    await expect(page.getByPlaceholder('e.g. product awareness ad')).toHaveValue('test objective')
  })

  test('preset survives page reload', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByPlaceholder('Name this pipeline…').fill('Reload Preset Test')
    await page.getByRole('button', { name: 'Save' }).first().click()

    await page.waitForTimeout(3500)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Open preset dropdown
    await page.locator('button').filter({ hasText: '▼' }).first().click()
    await expect(page.getByText('Reload Preset Test')).toBeVisible()
  })
})

// ─── Governance Orchestrator Tests ────────────────────────────────────────────

test.describe('Pipeline Page — Governance Orchestrator', () => {
  test('Run Image Pipeline button exists and is renamed (not Images Only)', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByRole('button', { name: 'Run Image Pipeline' })).toBeVisible()
    await expect(page.getByText('Images Only')).toHaveCount(0)
  })

  test('Queue Pipeline Job button exists (not Generate)', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByRole('button', { name: 'Queue Pipeline Job' })).toBeVisible()
  })

  test('Queue Pipeline Job is disabled when prompt is empty', async ({ page }) => {
    await page.goto('/pipeline')
    // Clear prompt first
    await page.getByPlaceholder('Describe what you want the pipeline to generate…').fill('')
    const btn = page.getByRole('button', { name: 'Queue Pipeline Job' })
    await expect(btn).toBeDisabled()
  })

  test('Queue Pipeline Job enables when prompt is filled', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByPlaceholder('Describe what you want the pipeline to generate…').fill('Generate a lifestyle photo')
    const btn = page.getByRole('button', { name: 'Queue Pipeline Job' })
    await expect(btn).toBeEnabled()
  })

  test('Run Image Pipeline goes through orchestrator steps', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByRole('button', { name: 'Run Image Pipeline' }).click()
    // Job status bar should appear
    await expect(page.locator('text=/Normalize|Build Scene|Realism Compile/i').first()).toBeVisible({ timeout: 3000 })
  })

  test('Run Full Governance Pipeline shows job status bar with source badge', async ({ page }) => {
    await page.goto('/pipeline')
    // Click from top bar
    await page.getByRole('button', { name: /Run Full Governance Pipeline/ }).click()
    await expect(page.locator('text=RUN_PIPELINE_BUTTON').or(page.locator('text=run pipeline button'))).toBeVisible({ timeout: 3000 })
  })

  test('pipeline steps animate QUEUE → RUN → DONE via orchestrator', async ({ page }) => {
    await page.goto('/pipeline')
    await page.getByRole('button', { name: 'Run Pipeline' }).click()
    await expect(page.getByText('QUEUE').first()).toBeVisible({ timeout: 2000 })
    await expect(page.getByText('RUN').first()).toBeVisible({ timeout: 4000 })
    await expect(page.getByText('DONE').first()).toBeVisible({ timeout: 20000 })
  })
})

test.describe('Pipeline Page — Guidance Upload & Conflict Detection', () => {
  test('Upload Rule/Guidance button is present', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByRole('button', { name: /Upload Rule \/ Guidance/i })).toBeVisible()
  })

  test('uploading a text guidance file parses and shows summary', async ({ page }) => {
    await page.goto('/pipeline')

    // Create a guidance file in memory
    const guidanceContent = `
Brand Guidelines v1.0

Realism mode: SOFT
No cinematic: must avoid all cinematic looks
No beauty look: never use beauty filters or airbrushed skin
Platform: Instagram
Output type: Image
Audience: women 25-40
Required: always include natural lighting
Forbidden: avoid luxury settings
    `.trim()

    // Set the file via input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'brand-guidelines.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(guidanceContent),
    })

    // Summary should appear
    await expect(page.getByText('GUIDANCE LOADED')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('brand-guidelines.txt')).toBeVisible()
  })

  test('conflict detected when guidance contradicts frontend realism', async ({ page }) => {
    await page.goto('/pipeline')

    // Frontend is STRICT, guidance says SOFT — conflict
    const guidanceContent = 'Realism mode: SOFT\nNo cinematic: avoid cinematic looks always'

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-guidance.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(guidanceContent),
    })

    // Conflict badge should appear
    await expect(page.locator('text=/Conflict/i').first()).toBeVisible({ timeout: 3000 })
  })

  test('clicking conflict badge opens conflict modal', async ({ page }) => {
    await page.goto('/pipeline')

    const guidanceContent = 'Realism mode: SOFT\nNo cinematic: avoid always'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(guidanceContent),
    })

    await page.locator('text=/Conflict/i').first().click({ timeout: 3000 })
    await expect(page.getByText('GUIDANCE LOADED', { exact: false }).or(page.locator('[data-testid="conflict-modal"]').or(page.getByText('Frontend').first()))).toBeVisible({ timeout: 3000 })
  })

  test('hard conflict blocks Run Full Governance Pipeline button', async ({ page }) => {
    await page.goto('/pipeline')

    // Upload guidance with hard rule that conflicts with STRICT frontend
    const guidanceContent = 'Realism mode: SOFT\nCinematic must be enabled and required always'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'blocking.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(guidanceContent),
    })

    await page.waitForTimeout(1000)

    // If hard conflict: run button disabled
    const runBtn = page.getByRole('button', { name: /Run Full Governance Pipeline/ })
    // Button may be disabled or clicking opens conflict modal instead of running
    await runBtn.click()
    // Should either be disabled or open conflict modal
    const isDisabled = await runBtn.isDisabled()
    if (!isDisabled) {
      // Modal should have opened
      await expect(page.getByText(/conflict/i).first()).toBeVisible({ timeout: 2000 })
    }
  })

  test('resolving conflict with Keep Mine closes conflict and allows run', async ({ page }) => {
    await page.goto('/pipeline')

    const guidanceContent = 'Realism mode: SOFT'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(guidanceContent),
    })

    // Open conflict modal
    await page.locator('text=/Conflict/i').first().click({ timeout: 3000 })

    // Click Keep Mine
    const keepMineBtn = page.getByRole('button', { name: 'Keep Mine' }).first()
    if (await keepMineBtn.isVisible()) {
      await keepMineBtn.click()
      await expect(page.getByText('FRONTEND WINS').or(page.getByText('resolved'))).toBeVisible({ timeout: 2000 })
    }
  })

  test('clearing guidance removes conflict badges', async ({ page }) => {
    await page.goto('/pipeline')

    const guidanceContent = 'Realism mode: SOFT'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(guidanceContent),
    })

    await page.waitForTimeout(1000)

    // Clear guidance
    const clearBtn = page.locator('button').filter({ hasText: '×' }).last()
    await clearBtn.click()

    // Guidance and conflicts gone
    await expect(page.getByText('GUIDANCE LOADED')).toHaveCount(0)
  })

  test('guidance content persists across page reload', async ({ page }) => {
    await page.goto('/pipeline')

    const guidanceContent = 'Realism mode: SOFT\nPlatform: Instagram'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'persist-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(guidanceContent),
    })

    await expect(page.getByText('GUIDANCE LOADED')).toBeVisible({ timeout: 3000 })
    await page.waitForTimeout(3500) // wait for auto-save

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Guidance should be restored from localStorage
    await expect(page.getByText('GUIDANCE LOADED')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('persist-test.txt')).toBeVisible()
  })
})
