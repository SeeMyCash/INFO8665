import { expect, test, type Page } from '@playwright/test';

type DemoCase = {
    testId: string;
    expectedAlert: string;
    expectedVoice: string;
    expectedPreviewLabel: string;
    expectedBudgetText?: string;
};

const DEMO_CASES: DemoCase[] = [
    {
        testId: 'demo-flow-foreignCurrency',
        expectedAlert: 'This currency is not Canadian dollars. It is likely foreign currency or simply colored paper.',
        expectedVoice: 'This currency is not Canadian dollars. It is likely foreign currency or simply colored paper.',
        expectedPreviewLabel: 'Likely Foreign Currency',
    },
    {
        testId: 'demo-flow-screenSpoof',
        expectedAlert: 'Screen spoofing attempt detected. Please use real currency.',
        expectedVoice: 'Screen spoofing attempt detected. Please use real currency.',
        expectedPreviewLabel: 'Screen spoof detected',
    },
    {
        testId: 'demo-flow-budgetGuard',
        expectedAlert: 'Detected a CAD $100 bill. Spending it this week would put you over your weekly budget.',
        expectedVoice: 'Detected a CAD $100 bill. Spending it this week would put you over your weekly budget.',
        expectedPreviewLabel: 'CAD $100 bill',
        expectedBudgetText: 'Projected weekly spend becomes CAD $140.00. That is CAD $20.00 over budget.',
    },
];

async function launchScanScreen(page: Page) {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await page.goto('/');
    await expect(page.getByTestId('landing-start-scanning')).toBeVisible();
    await page.getByTestId('landing-start-scanning').click();
    await expect(page.getByTestId('tab-settings')).toBeVisible();
}

async function chooseDemoFlow(page: Page, testId: string) {
    await page.getByTestId('tab-settings').click();
    await expect(page.getByTestId(testId)).toBeVisible();
    await page.getByTestId(testId).click();
    await page.getByTestId('tab-scan').click();
    await expect(page.getByTestId('demo-flow-ready')).toBeVisible();
    await expect(page.getByTestId('scan-start-camera')).toBeVisible();
}

for (const demoCase of DEMO_CASES) {
    test(`demo flow ${demoCase.testId} triggers the scripted camera warning`, async ({ page }) => {
        await launchScanScreen(page);
        await chooseDemoFlow(page, demoCase.testId);

        await page.getByTestId('scan-start-camera').click();

        await expect(page.getByTestId('demo-camera-preview')).toBeVisible();
        await expect(page.getByTestId('demo-bounding-box')).toContainText(demoCase.expectedPreviewLabel);
        await expect(page.getByTestId('demo-alert-banner')).toContainText(demoCase.expectedAlert);
        await expect(page.getByTestId('voice-output-text')).toHaveText(demoCase.expectedVoice);
        await expect(page.getByTestId('scan-replay-demo')).toBeVisible();

        if (demoCase.expectedBudgetText) {
            await expect(page.getByTestId('budget-summary-card')).toContainText(demoCase.expectedBudgetText);
        } else {
            await expect(page.getByTestId('budget-summary-card')).toHaveCount(0);
        }

        await expect(page.getByTestId('scan-stop-camera')).toBeVisible();
    });
}
