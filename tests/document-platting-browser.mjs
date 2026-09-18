import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Reuse the repository's existing browser-test dependency.
const require = createRequire(new URL('../sites/main/package.json', import.meta.url));
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:5200';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const output = new URL('../sites/document/dist/platting-smoke/', import.meta.url);
await mkdir(output, { recursive: true });
try {
    for (const path of ['orange', 'orange/orlando']) {
        await page.goto(`${base}/checklists/platting/${path}`);
        await page.locator('input[name="option-florida-001"]').first().waitFor();
        assert.equal(await page.locator('input[name="option-orange-county-recording-001"]').count(), 0);
        if (path.includes('orlando')) assert.equal(await page.locator('input[name="option-orange-county-unincorporated-001"]').count(), 0);
        for (const theme of ['light', 'dark']) {
            await page.emulateMedia({ colorScheme: theme });
            await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
            await page.screenshot({ path: fileURLToPath(new URL(`${path.replaceAll('/', '-')}-${theme}.png`, output)), fullPage: true });
        }
    }
    // Same-title items must remain separate through controls, notes, and PDF export.
    await page.route('**/checklists/platting/orange.json', async route => {
        const response = await route.fetch();
        const data = await response.json();
        data.Sections = [{ title: 'Identity regression', items: ['test-a', 'test-b'].map(id => ({ id, title: 'Same title', statement: id, code: 'QA review', options: 'YesNo' })) }];
        await route.fulfill({ json: data });
    });
    await page.goto(`${base}/checklists/platting/orange`);
    const notes = page.getByRole('textbox', { name: 'Denial reason for Same title' });
    await notes.nth(0).fill('First independent note');
    await notes.nth(1).fill('Second independent note');
    await page.locator('input[name="option-test-a"][value="yes"]').check();
    assert(await page.locator('input[name="option-test-b"][value="no"]').isChecked());
    assert.equal(await notes.count(), 1);
    assert.equal(await notes.first().inputValue(), 'Second independent note');
    await page.locator('input[name="option-test-a"][value="no"]').check();
    assert.equal(await notes.nth(0).inputValue(), 'First independent note');
    await page.locator('input[name="option-test-a"][value="yes"]').check();
    await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
    await page.getByRole('checkbox').check();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const download = await downloadPromise;
    await download.saveAs(fileURLToPath(new URL('same-title.pdf', output)));
    console.log('Both platting routes and independent same-title controls/notes passed; theme screenshots saved.');
} finally {
    await browser.close();
}
