export type DemoFlowMode = 'off' | 'foreignCurrency' | 'screenSpoof' | 'budgetGuard';

export type DemoFlowOption = {
    value: DemoFlowMode;
    label: string;
    summary: string;
};

export type DemoBudgetSummary = {
    weeklyBudget: number;
    spentSoFar: number;
    detectedSpend: number;
    projectedSpend: number;
    overBy: number;
};

export type DemoScenario = {
    mode: Exclude<DemoFlowMode, 'off'>;
    label: string;
    summary: string;
    activationHint: string;
    previewTitle: string;
    previewBody: string;
    alertTitle: string;
    alertMessage: string;
    voiceMessage: string;
    boxColor: string;
    boxLabel: string;
    bannerTone: 'error' | 'warning';
    result: {
        kind: 'demo';
        result: any;
    };
    budgetSummary?: DemoBudgetSummary;
};

const LARGE_BOX: [number, number, number, number] = [80, 80, 920, 920];

const foreignCurrencyDetection = {
    class_id: 900,
    class_name: 'NGN_NOTE',
    display_name: 'Likely Foreign Currency',
    confidence: 0.98,
    xyxy: LARGE_BOX,
    box_area_ratio: 0.71,
};

const spoofDetection = {
    class_id: 901,
    class_name: 'SCREEN_SPOOF',
    display_name: 'Screen spoof detected',
    confidence: 0.97,
    xyxy: LARGE_BOX,
    box_area_ratio: 0.76,
};

const hundredDollarDetection = {
    class_id: 4,
    class_name: 'CAD_100',
    display_name: 'CAD $100 bill',
    confidence: 0.99,
    xyxy: LARGE_BOX,
    box_area_ratio: 0.69,
};

const budgetSummary: DemoBudgetSummary = {
    weeklyBudget: 120,
    spentSoFar: 40,
    detectedSpend: 100,
    projectedSpend: 140,
    overBy: 20,
};

export const DEMO_FLOW_OPTIONS: DemoFlowOption[] = [
    {
        value: 'off',
        label: 'Live Inference',
        summary: 'Use the real camera and backend pipeline.',
    },
    {
        value: 'foreignCurrency',
        label: 'Foreign Currency',
        summary: 'Start Camera triggers an anti-counterfeit alert for likely foreign currency or colored paper.',
    },
    {
        value: 'screenSpoof',
        label: 'Screen Spoof',
        summary: 'Start Camera triggers an anti-spoofing alert immediately.',
    },
    {
        value: 'budgetGuard',
        label: 'Budget Guard',
        summary: 'Start Camera detects a $100 bill and warns about crossing the weekly budget.',
    },
];

const DEMO_SCENARIOS: Record<Exclude<DemoFlowMode, 'off'>, DemoScenario> = {
    foreignCurrency: {
        mode: 'foreignCurrency',
        label: 'Foreign Currency',
        summary: 'Simulates a counterfeit/foreign-currency warning for likely foreign currency or colored paper.',
        activationHint: 'Start Camera to trigger a non-CAD currency warning immediately.',
        previewTitle: 'Foreign currency simulation',
        previewBody: 'The demo camera view highlights likely foreign currency or simply colored paper instead of Canadian currency.',
        alertTitle: 'Foreign currency detected',
        alertMessage: 'This currency is not Canadian dollars. It is likely foreign currency or simply colored paper.',
        voiceMessage: 'This currency is not Canadian dollars. It is likely foreign currency or simply colored paper.',
        boxColor: '#DC2626',
        boxLabel: 'Likely Foreign Currency',
        bannerTone: 'error',
        result: {
            kind: 'demo',
            result: {
                detector: {
                    detections: [foreignCurrencyDetection],
                },
                detections: [foreignCurrencyDetection],
                spoof_check: {
                    enabled: false,
                    suspected: false,
                    blocked: false,
                },
                pipeline_models: {
                    detector: 'demo-foreign-currency',
                },
            },
        },
    },
    screenSpoof: {
        mode: 'screenSpoof',
        label: 'Screen Spoof',
        summary: 'Simulates the anti-spoofing model blocking a camera view of another screen.',
        activationHint: 'Start Camera to trigger a spoofing alert immediately.',
        previewTitle: 'Screen spoof simulation',
        previewBody: 'The demo camera view marks the scene as a display spoof instead of real cash.',
        alertTitle: 'Screen spoofing attempt detected',
        alertMessage: 'Screen spoofing attempt detected. Please use real currency.',
        voiceMessage: 'Screen spoofing attempt detected. Please use real currency.',
        boxColor: '#DC2626',
        boxLabel: 'Screen spoof detected',
        bannerTone: 'error',
        result: {
            kind: 'demo',
            result: {
                detector: {
                    detections: [spoofDetection],
                },
                detections: [spoofDetection],
                spoof_check: {
                    enabled: true,
                    suspected: true,
                    blocked: true,
                },
                pipeline_models: {
                    spoof_guard: 'demo-screen-spoof',
                },
            },
        },
    },
    budgetGuard: {
        mode: 'budgetGuard',
        label: 'Budget Guard',
        summary: 'Simulates a financial warning when a detected $100 bill would push weekly spending over budget.',
        activationHint: 'Start Camera to trigger a $100 budget warning immediately.',
        previewTitle: 'Budget guard simulation',
        previewBody: 'The demo camera view locks onto a CAD $100 bill and shows the weekly budget risk.',
        alertTitle: 'Budget warning',
        alertMessage: 'Detected a CAD $100 bill. Spending it this week would put you over your weekly budget.',
        voiceMessage: 'Detected a CAD $100 bill. Spending it this week would put you over your weekly budget.',
        boxColor: '#F59E0B',
        boxLabel: 'CAD $100 bill',
        bannerTone: 'warning',
        budgetSummary,
        result: {
            kind: 'demo',
            result: {
                detector: {
                    detections: [hundredDollarDetection],
                },
                detections: [hundredDollarDetection],
                spoof_check: {
                    enabled: false,
                    suspected: false,
                    blocked: false,
                },
                candidates: [
                    {
                        rank: 1,
                        target: {
                            class_name: 'CAD_100',
                            confidence: 0.99,
                            xyxy: LARGE_BOX,
                        },
                        classification: {
                            result: {
                                top_predictions: [
                                    {
                                        class: 'CAD_100',
                                        confidence: 0.99,
                                    },
                                ],
                            },
                        },
                    },
                ],
                classification: {
                    result: {
                        top_predictions: [
                            {
                                class: 'CAD_100',
                                confidence: 0.99,
                            },
                        ],
                    },
                },
                pipeline_models: {
                    detector: 'demo-budget-guard',
                    bill_reader: 'demo-budget-guard',
                },
            },
        },
    },
};

export function getDemoScenario(mode: DemoFlowMode): DemoScenario | null {
    if (mode === 'off') return null;
    return DEMO_SCENARIOS[mode];
}
