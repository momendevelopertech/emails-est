const { chromium } = require('playwright');
const baseUrl = 'http://127.0.0.1:3002';

async function main() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const result = {
        loginUrl: '',
        recipientsUrl: '',
        triggerText: '',
        optionCount: 0,
        selectedOptionText: '',
        errorText: null,
    };

    try {
        await page.goto(`${baseUrl}/en/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.locator('input[autocomplete="username"]').waitFor({ state: 'visible', timeout: 120000 });
        await page.locator('input[autocomplete="username"]').fill('superadmin@sphinx.com');
        await page.locator('input[type="password"]').fill('Admin@123456');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/en\/messaging\/upload/, { timeout: 45000 });
        result.loginUrl = page.url();

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2500);
        await page.locator('a[href="/en/messaging?tab=recipients"]').click();
        await page.waitForURL(/\/en\/messaging\?tab=recipients/, { timeout: 30000 });
        result.recipientsUrl = page.url();

        const activeCycleTrigger = page.locator('button[aria-label="Active cycle"]').first();
        await activeCycleTrigger.waitFor({ state: 'visible', timeout: 30000 });
        result.triggerText = (await activeCycleTrigger.textContent())?.trim() || '';
        await activeCycleTrigger.screenshot({ path: '.codex-logs/local-run/select-closed.png' });
        await activeCycleTrigger.click();

        const listbox = page.locator('[role="listbox"]').last();
        await listbox.waitFor({ state: 'visible', timeout: 15000 });
        const selectedOption = listbox.locator('[role="option"][aria-selected="true"]').first();
        result.optionCount = await listbox.locator('[role="option"]').count();
        result.selectedOptionText = (await selectedOption.textContent())?.trim() || '';

        await listbox.screenshot({ path: '.codex-logs/local-run/select-open.png' });
    } catch (error) {
        try {
            const alertText = await page.locator('[role="alert"]').first().textContent({ timeout: 2000 });
            result.errorText = alertText?.trim() || (error instanceof Error ? error.message : String(error));
        } catch {
            result.errorText = error instanceof Error ? error.message : String(error);
        }
    } finally {
        console.log(JSON.stringify(result, null, 2));
        await browser.close();
    }
}

void main();
