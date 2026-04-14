const { chromium } = require('playwright');

const webUrl = 'http://127.0.0.1:3002';
const apiBase = `${webUrl}/api`;

async function main() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    const result = {
        finalUrl: '',
        pageTitle: '',
        activeCycleText: '',
        rolePlaceholder: '',
        openOptionCount: 0,
        selectedOptionText: '',
        errorText: null,
    };

    await context.addCookies([
        { name: 'access_token', value: 'demo-token', url: webUrl },
        { name: 'refresh_token', value: 'demo-refresh', url: webUrl },
    ]);

    await page.route(`${apiBase}/**`, async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;

        if (path.endsWith('/auth/me')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'u1',
                    email: 'superadmin@sphinx.com',
                    fullName: 'Super Admin',
                    role: 'SUPER_ADMIN',
                }),
            });
            return;
        }

        if (path.endsWith('/auth/refresh')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    accessToken: 'demo-token',
                    user: {
                        id: 'u1',
                        email: 'superadmin@sphinx.com',
                        fullName: 'Super Admin',
                        role: 'SUPER_ADMIN',
                    },
                }),
            });
            return;
        }

        if (path.endsWith('/messaging/cycles')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'cycle-1',
                        name: 'Fruits',
                        imported_count: 24,
                        skipped_count: 0,
                        recipients_count: 24,
                        pending_count: 18,
                        processing_count: 1,
                        sent_count: 3,
                        failed_count: 2,
                        created_at: new Date().toISOString(),
                        source_file_name: 'fruits.xlsx',
                    },
                    {
                        id: 'cycle-2',
                        name: 'Vegetables',
                        imported_count: 12,
                        skipped_count: 0,
                        recipients_count: 12,
                        pending_count: 9,
                        processing_count: 0,
                        sent_count: 2,
                        failed_count: 1,
                        created_at: new Date().toISOString(),
                        source_file_name: 'vegetables.xlsx',
                    },
                ]),
            });
            return;
        }

        if (path.endsWith('/messaging/recipients')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    items: [
                        {
                            id: 'r1',
                            name: 'Banana',
                            email: 'banana@example.com',
                            role: 'Invigilator',
                            type: 'EST1',
                            governorate: 'Cairo',
                            address: 'Downtown',
                            building: 'A',
                            location: 'Hall 1',
                            room_est1: '20',
                            status: 'PENDING',
                            attempts_count: 0,
                            cycle: { id: 'cycle-1', name: 'Fruits' },
                        },
                        {
                            id: 'r2',
                            name: 'Apple',
                            email: 'apple@example.com',
                            role: 'Coordinator',
                            type: 'EST2',
                            governorate: 'Giza',
                            address: 'West',
                            building: 'B',
                            location: 'Hall 2',
                            room_est1: '21',
                            status: 'FAILED',
                            attempts_count: 2,
                            cycle: { id: 'cycle-1', name: 'Fruits' },
                        },
                    ],
                    total: 2,
                }),
            });
            return;
        }

        if (path.endsWith('/messaging/filters/options')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    roles: ['Invigilator', 'Coordinator', 'Supervisor'],
                    types: ['EST1', 'EST2'],
                    governorates: ['Cairo', 'Giza', 'Alexandria'],
                    sheets: [
                        { value: 'EST1', count: 12 },
                        { value: 'EST2', count: 12 },
                    ],
                }),
            });
            return;
        }

        if (path.endsWith('/messaging/templates')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'template-1',
                        name: 'Banana',
                        type: 'EMAIL',
                        subject: 'Exam reminder',
                        body: 'Hello from the template.',
                    },
                    {
                        id: 'template-2',
                        name: 'Grapes',
                        type: 'WHATSAPP',
                        subject: 'WhatsApp reminder',
                        body: 'WhatsApp body.',
                    },
                ]),
            });
            return;
        }

        if (path.endsWith('/messaging/logs')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    items: [],
                    total: 0,
                }),
            });
            return;
        }

        await route.continue();
    });

    try {
        await page.goto(`${webUrl}/en/messaging?tab=recipients`, { waitUntil: 'networkidle', timeout: 120000 });
        result.finalUrl = page.url();
        result.pageTitle = await page.title();

        const activeCycleTrigger = page.locator('button[aria-label="Active cycle"]').first();
        const roleTrigger = page.locator('button[aria-label="Role"]').first();

        await activeCycleTrigger.waitFor({ state: 'visible', timeout: 30000 });
        await roleTrigger.waitFor({ state: 'visible', timeout: 30000 });

        result.activeCycleText = (await activeCycleTrigger.textContent())?.trim() || '';
        result.rolePlaceholder = (await roleTrigger.textContent())?.trim() || '';

        await activeCycleTrigger.screenshot({ path: '.codex-logs/local-run/active-cycle-closed.png' });
        await roleTrigger.screenshot({ path: '.codex-logs/local-run/role-filter-closed.png' });

        await activeCycleTrigger.click();
        const cycleListbox = page.locator('[role="listbox"]').last();
        await cycleListbox.waitFor({ state: 'visible', timeout: 15000 });
        result.selectedOptionText = (await cycleListbox.locator('[role="option"][aria-selected="true"]').first().textContent())?.trim() || '';
        await cycleListbox.screenshot({ path: '.codex-logs/local-run/active-cycle-open.png' });
        await page.keyboard.press('Escape');

        await roleTrigger.click();
        const listbox = page.locator('[role="listbox"]').last();
        await listbox.waitFor({ state: 'visible', timeout: 15000 });

        result.openOptionCount = await listbox.locator('[role="option"]').count();
        await listbox.screenshot({ path: '.codex-logs/local-run/role-filter-open.png' });
        await page.screenshot({ path: '.codex-logs/local-run/recipients-page.png', fullPage: true });
    } catch (error) {
        result.errorText = error instanceof Error ? error.message : String(error);
        try {
            await page.screenshot({ path: '.codex-logs/local-run/recipients-error.png', fullPage: true });
        } catch {
            // ignore screenshot failure
        }
    } finally {
        console.log(JSON.stringify(result, null, 2));
        await browser.close();
    }
}

void main();
