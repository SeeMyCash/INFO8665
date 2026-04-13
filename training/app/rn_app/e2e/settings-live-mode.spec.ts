import { expect, test, type Page } from '@playwright/test';

const SAMPLE_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2pWQ0AAAAASUVORK5CYII=',
    'base64',
);

function expectMultipartField(body: string, fieldName: string, value: string) {
    expect(body).toContain(`name="${fieldName}"`);
    expect(body).toContain(`\r\n\r\n${value}\r\n`);
}

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

async function uploadSampleImage(page: Page) {
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('pick-image-button').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: 'sample.png',
        mimeType: 'image/png',
        buffer: SAMPLE_PNG,
    });
}

test('still inference sends threshold settings and filters low-confidence classifier results', async ({ page }) => {
    await launchScanScreen(page);

    await page.getByTestId('tab-settings').click();
    await page.getByTestId('detector-threshold-0_75').click();
    await page.getByTestId('classifier-threshold-0_95').click();
    await page.getByTestId('tab-scan').click();

    let requestCount = 0;
    await page.route('**/api/pipeline/infer', async (route) => {
        requestCount += 1;
        const body = route.request().postDataBuffer()?.toString('latin1') ?? '';
        expectMultipartField(body, 'detector_conf_threshold', '0.75');
        expectMultipartField(body, 'classifier_conf_threshold', '0.95');
        expectMultipartField(body, 'top_k_targets', '5');

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                kind: 'pipeline',
                result: {
                    pipeline_models: {
                        detector: 'detector.pt',
                        bill_reader: 'bill.pt',
                        coin_classifier: 'coin.pt',
                        spoof_guard: null,
                    },
                    spoof_check: { enabled: true, blocked: false, suspected: false },
                    detector: {
                        type: 'detector',
                        image_width: 1280,
                        image_height: 720,
                        detections: [
                            {
                                class_name: 'COIN',
                                confidence: 0.82,
                                xyxy: [120, 140, 360, 380],
                                box_area_ratio: 0.08,
                                display_name: 'LOONIE',
                                display_confidence: 0.90,
                            },
                        ],
                    },
                    requested_top_k_targets: 5,
                    target: {
                        class_name: 'COIN',
                        confidence: 0.82,
                        xyxy: [120, 140, 360, 380],
                    },
                    classification: {
                        kind: 'coin_classifier',
                        result: {
                            top_predictions: [{ class: 'LOONIE', confidence: 0.90 }],
                        },
                    },
                    candidates: [
                        {
                            rank: 1,
                            kind: 'coin',
                            target: {
                                class_name: 'COIN',
                                confidence: 0.82,
                                xyxy: [120, 140, 360, 380],
                            },
                            classification: {
                                kind: 'coin_classifier',
                                result: {
                                    top_predictions: [{ class: 'LOONIE', confidence: 0.90 }],
                                },
                            },
                        },
                    ],
                },
                server_timing_ms: 42,
            }),
        });
    });

    await uploadSampleImage(page);
    await expect(page.getByTestId('captured-image-preview')).toBeVisible();
    await page.getByTestId('run-inference-button').click();

    await expect.poll(() => requestCount).toBeGreaterThan(0);
    await expect(page.getByText('Detections (1)')).toBeVisible();
    await expect(page.getByText('No classifier route')).toBeVisible();
    await expect(page.getByTestId('guaranteed-amount-value')).toHaveText('CAD $0.00');
    await expect(page.getByText('No confident denomination predictions yet')).toBeVisible();
});

test('first snap waits for the first camera frame instead of failing capture', async ({ page }) => {
    await launchScanScreen(page);

    let requestCount = 0;
    await page.route('**/api/pipeline/infer', async (route) => {
        requestCount += 1;
        const body = route.request().postDataBuffer()?.toString('latin1') ?? '';
        expectMultipartField(body, 'top_k_targets', '5');

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                kind: 'pipeline',
                result: {
                    pipeline_models: {
                        detector: 'detector.pt',
                        bill_reader: 'bill.pt',
                        coin_classifier: 'coin.pt',
                        spoof_guard: null,
                    },
                    spoof_check: { enabled: true, blocked: false, suspected: false },
                    detector: {
                        type: 'detector',
                        image_width: 1280,
                        image_height: 720,
                        detections: [
                            {
                                class_name: 'CAD_20',
                                confidence: 0.96,
                                xyxy: [180, 140, 980, 520],
                                box_area_ratio: 0.33,
                                display_name: 'CAD_20',
                                display_confidence: 0.98,
                            },
                        ],
                    },
                    requested_top_k_targets: 5,
                    target: {
                        class_name: 'CAD_20',
                        confidence: 0.96,
                        xyxy: [180, 140, 980, 520],
                    },
                    classification: {
                        kind: 'bill_reader',
                        result: {
                            top_predictions: [{ class: 'CAD_20', confidence: 0.98 }],
                        },
                    },
                    candidates: [
                        {
                            rank: 1,
                            kind: 'bill',
                            target: {
                                class_name: 'CAD_20',
                                confidence: 0.96,
                                xyxy: [180, 140, 980, 520],
                            },
                            classification: {
                                kind: 'bill_reader',
                                result: {
                                    top_predictions: [{ class: 'CAD_20', confidence: 0.98 }],
                                },
                            },
                        },
                    ],
                },
                server_timing_ms: 35,
            }),
        });
    });

    await page.getByTestId('scan-start-camera').click();
    await expect(page.getByRole('button', { name: /^Snap$/ })).toBeVisible();
    await page.getByRole('button', { name: /^Snap$/ }).click();

    await expect.poll(() => requestCount).toBeGreaterThan(0);
    await expect(page.getByText('Frame capture failed')).toHaveCount(0);
    await expect(page.getByTestId('captured-image-preview')).toBeVisible();
    await expect(page.getByText('Detections (1)')).toBeVisible();
});

test('still inference bootstraps the pipeline and retries the first request automatically', async ({ page }) => {
    await launchScanScreen(page);

    let inferCount = 0;
    let autoSelectCount = 0;

    await page.route('**/api/pipeline/auto_select', async (route) => {
        autoSelectCount += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                pipeline: {
                    detector: 'detector.pt',
                    bill_reader: 'bill.pt',
                    coin_classifier: 'coin.pt',
                    spoof_guard: null,
                },
            }),
        });
    });

    await page.route('**/api/pipeline/infer', async (route) => {
        inferCount += 1;
        if (inferCount === 1) {
            await route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({
                    detail: 'Pipeline models are not loaded. Call /api/pipeline/auto_select or /api/pipeline/refresh first.',
                }),
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                kind: 'pipeline',
                result: {
                    pipeline_models: {
                        detector: 'detector.pt',
                        bill_reader: 'bill.pt',
                        coin_classifier: 'coin.pt',
                        spoof_guard: null,
                    },
                    spoof_check: { enabled: true, blocked: false, suspected: false },
                    detector: {
                        type: 'detector',
                        image_width: 1280,
                        image_height: 720,
                        detections: [
                            {
                                class_name: 'CAD_20',
                                confidence: 0.96,
                                xyxy: [180, 140, 980, 520],
                                box_area_ratio: 0.33,
                                display_name: 'CAD_20',
                                display_confidence: 0.98,
                            },
                        ],
                    },
                    requested_top_k_targets: 5,
                    target: {
                        class_name: 'CAD_20',
                        confidence: 0.96,
                        xyxy: [180, 140, 980, 520],
                    },
                    classification: {
                        kind: 'bill_reader',
                        result: {
                            top_predictions: [{ class: 'CAD_20', confidence: 0.98 }],
                        },
                    },
                    candidates: [
                        {
                            rank: 1,
                            kind: 'bill',
                            target: {
                                class_name: 'CAD_20',
                                confidence: 0.96,
                                xyxy: [180, 140, 980, 520],
                            },
                            classification: {
                                kind: 'bill_reader',
                                result: {
                                    top_predictions: [{ class: 'CAD_20', confidence: 0.98 }],
                                },
                            },
                        },
                    ],
                },
                server_timing_ms: 44,
            }),
        });
    });

    await uploadSampleImage(page);
    await page.getByTestId('run-inference-button').click();

    await expect.poll(() => autoSelectCount).toBe(1);
    await expect.poll(() => inferCount).toBe(2);
    await expect(page.getByText('Pipeline models are not loaded')).toHaveCount(0);
    await expect(page.getByText('Detections (1)')).toBeVisible();
});

test('web camera falls back after an initial mobile-style startup failure', async ({ page }) => {
    await page.addInitScript(() => {
        const mediaDevices = navigator.mediaDevices;
        if (!mediaDevices?.getUserMedia) return;

        const realGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
        let requestCount = 0;
        mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
            requestCount += 1;
            const videoConstraints = constraints && typeof constraints === 'object'
                ? (constraints as any).video
                : null;

            if (
                requestCount === 1
                && videoConstraints
                && typeof videoConstraints === 'object'
                && 'width' in videoConstraints
            ) {
                const err: any = new Error('Initial constrained camera startup failed');
                err.name = 'OverconstrainedError';
                throw err;
            }

            return realGetUserMedia(constraints);
        };

        const realPlay = HTMLMediaElement.prototype.play;
        let playCount = 0;
        HTMLMediaElement.prototype.play = function (...args) {
            playCount += 1;
            if (playCount === 1) {
                return Promise.reject(new Error('Failed to load video source'));
            }
            return realPlay.apply(this, args as []);
        };

        (window as any).__cameraFallbackStats = () => ({ requestCount, playCount });
    });

    await launchScanScreen(page);

    let requestCount = 0;
    await page.route('**/api/pipeline/infer', async (route) => {
        requestCount += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                kind: 'pipeline',
                result: {
                    pipeline_models: {
                        detector: 'detector.pt',
                        bill_reader: 'bill.pt',
                        coin_classifier: 'coin.pt',
                        spoof_guard: null,
                    },
                    spoof_check: { enabled: true, blocked: false, suspected: false },
                    detector: {
                        type: 'detector',
                        image_width: 1280,
                        image_height: 720,
                        detections: [
                            {
                                class_name: 'CAD_20',
                                confidence: 0.96,
                                xyxy: [180, 140, 980, 520],
                                box_area_ratio: 0.33,
                                display_name: 'CAD_20',
                                display_confidence: 0.98,
                            },
                        ],
                    },
                    requested_top_k_targets: 5,
                    target: {
                        class_name: 'CAD_20',
                        confidence: 0.96,
                        xyxy: [180, 140, 980, 520],
                    },
                    classification: {
                        kind: 'bill_reader',
                        result: {
                            top_predictions: [{ class: 'CAD_20', confidence: 0.98 }],
                        },
                    },
                    candidates: [
                        {
                            rank: 1,
                            kind: 'bill',
                            target: {
                                class_name: 'CAD_20',
                                confidence: 0.96,
                                xyxy: [180, 140, 980, 520],
                            },
                            classification: {
                                kind: 'bill_reader',
                                result: {
                                    top_predictions: [{ class: 'CAD_20', confidence: 0.98 }],
                                },
                            },
                        },
                    ],
                },
                server_timing_ms: 35,
            }),
        });
    });

    await page.getByTestId('scan-start-camera').click();
    await expect(page.getByRole('button', { name: /^Snap$/ })).toBeVisible();
    await page.getByRole('button', { name: /^Snap$/ }).click();

    await expect.poll(() => requestCount).toBeGreaterThan(0);
    await expect(page.getByText('Failed to load video source')).toHaveCount(0);
    await expect(page.getByText('Frame capture failed')).toHaveCount(0);

    const stats = await page.evaluate(() => (window as any).__cameraFallbackStats?.());
    expect(stats?.requestCount).toBeGreaterThan(1);
    expect(stats?.playCount).toBeGreaterThan(1);
});

test('live mode uses the configured fps and keeps snapshot preview hidden', async ({ page }) => {
    await launchScanScreen(page);

    await page.getByTestId('tab-settings').click();
    await page.getByTestId('live-fps-5').click();
    await page.getByTestId('live-stability-window-1').click();
    await page.getByTestId('live-stability-frames-2').click();
    await page.getByTestId('tab-scan').click();

    let requestCount = 0;
    await page.route('**/api/pipeline/infer', async (route) => {
        requestCount += 1;
        const body = route.request().postDataBuffer()?.toString('latin1') ?? '';
        expectMultipartField(body, 'top_k_targets', '5');

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                kind: 'pipeline',
                result: {
                    pipeline_models: {
                        detector: 'detector.pt',
                        bill_reader: 'bill.pt',
                        coin_classifier: 'coin.pt',
                        spoof_guard: null,
                    },
                    spoof_check: { enabled: true, blocked: false, suspected: false },
                    detector: {
                        type: 'detector',
                        image_width: 1280,
                        image_height: 720,
                        detections: [
                            {
                                class_name: 'CAD_20',
                                confidence: 0.96,
                                xyxy: [180, 140, 980, 520],
                                box_area_ratio: 0.33,
                                display_name: 'CAD_20',
                                display_confidence: 0.98,
                            },
                        ],
                    },
                    requested_top_k_targets: 5,
                    target: {
                        class_name: 'CAD_20',
                        confidence: 0.96,
                        xyxy: [180, 140, 980, 520],
                    },
                    classification: {
                        kind: 'bill_reader',
                        result: {
                            top_predictions: [{ class: 'CAD_20', confidence: 0.98 }],
                        },
                    },
                    candidates: [
                        {
                            rank: 1,
                            kind: 'bill',
                            target: {
                                class_name: 'CAD_20',
                                confidence: 0.96,
                                xyxy: [180, 140, 980, 520],
                            },
                            classification: {
                                kind: 'bill_reader',
                                result: {
                                    top_predictions: [{ class: 'CAD_20', confidence: 0.98 }],
                                },
                            },
                        },
                    ],
                },
                server_timing_ms: 30,
            }),
        });
    });

    await page.getByTestId('scan-start-camera').click();
    await expect(page.getByTestId('toggle-live-button')).toContainText('Go Live');
    await page.getByTestId('toggle-live-button').click();

    await expect.poll(() => requestCount).toBeGreaterThan(1);
    await expect(page.getByTestId('captured-image-preview')).toHaveCount(0);
    await expect(page.getByTestId('live-stability-status')).toBeVisible();

    await page.getByTestId('toggle-live-button').click();
    await expect(page.getByTestId('captured-image-preview')).toHaveCount(0);
});
