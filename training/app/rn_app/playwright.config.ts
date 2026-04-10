import { defineConfig, devices } from '@playwright/test';

const ENV = process.env as Record<string, string | undefined>;

export default defineConfig({
    testDir: './e2e',
    timeout: 90_000,
    expect: {
        timeout: 15_000,
    },
    fullyParallel: false,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4173',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
        viewport: { width: 1440, height: 1080 },
        permissions: ['camera'],
        launchOptions: {
            args: [
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream',
            ],
        },
    },
    webServer: {
        command: 'npm run build:web && npx http-server dist -p 4173 -c-1',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !ENV.CI,
        timeout: 180_000,
    },
});
