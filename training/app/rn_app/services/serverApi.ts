import { Platform } from 'react-native';

export const HOSTED_API_BASE_URL =
    typeof process.env.EXPO_PUBLIC_API_BASE_URL === 'string' && process.env.EXPO_PUBLIC_API_BASE_URL.length > 0
        ? process.env.EXPO_PUBLIC_API_BASE_URL
        : Platform.OS === 'web' && typeof globalThis.location?.origin === 'string'
            ? globalThis.location.origin
            : 'https://smc.femilawal.com';

const LOCAL_ONLY_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '10.0.2.2',
]);

const LOCAL_HOST_PATTERN =
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?(\/|$)/i;

type ProbeResult = {
    ok: boolean;
    base: string;
    error?: string;
    data?: any;
};

function withDefaultScheme(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
        return trimmed;
    }
    if (LOCAL_HOST_PATTERN.test(trimmed) || trimmed.endsWith('.local')) {
        return `http://${trimmed}`;
    }
    return `https://${trimmed}`;
}

export function normalizeApiBaseUrl(value?: string | null) {
    const trimmed = withDefaultScheme(String(value || '').trim());
    return (trimmed || HOSTED_API_BASE_URL).replace(/\/$/, '');
}

export function buildApiUrl(base: string, path: string) {
    const normalizedBase = normalizeApiBaseUrl(base);
    return `${normalizedBase}${path.startsWith('/') ? path : `/${path}`}`;
}

export function isLikelyLocalOnlyApiBaseUrl(base: string) {
    try {
        const hostname = new URL(normalizeApiBaseUrl(base)).hostname.toLowerCase();
        return LOCAL_ONLY_HOSTS.has(hostname) || hostname.endsWith('.local');
    } catch {
        return false;
    }
}

export function describeApiBaseUrl(base: string) {
    return isLikelyLocalOnlyApiBaseUrl(base)
        ? 'Local device URL detected. On Android phones, localhost reaches your computer only if you use ADB reverse; otherwise use a LAN IP or the hosted API.'
        : 'Hosted API URL';
}

function unique(values: Array<string | null | undefined>) {
    return values.filter((value, index, array): value is string =>
        Boolean(value) && array.indexOf(value) === index
    );
}

export function getApiBaseCandidates(base: string) {
    const normalized = normalizeApiBaseUrl(base);
    return unique([
        normalized,
        HOSTED_API_BASE_URL,
    ]);
}

export async function probeBackendHealth(base: string, timeoutMs = 5000): Promise<ProbeResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(buildApiUrl(base, '/api/health'), {
            signal: controller.signal,
        });

        if (!response.ok) {
            return {
                ok: false,
                base: normalizeApiBaseUrl(base),
                error: `HTTP ${response.status}`,
            };
        }

        let data: any = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        return {
            ok: true,
            base: normalizeApiBaseUrl(base),
            data,
        };
    } catch (error: any) {
        return {
            ok: false,
            base: normalizeApiBaseUrl(base),
            error: error?.message || 'Backend unreachable',
        };
    } finally {
        clearTimeout(timer);
    }
}

export async function resolveReachableApiBase(base: string, timeoutMs = 5000): Promise<ProbeResult> {
    let lastFailure: ProbeResult | null = null;

    for (const candidate of getApiBaseCandidates(base)) {
        const probe = await probeBackendHealth(candidate, timeoutMs);
        if (probe.ok) {
            return probe;
        }
        lastFailure = probe;
    }

    return lastFailure || {
        ok: false,
        base: normalizeApiBaseUrl(base),
        error: 'Backend unreachable',
    };
}
