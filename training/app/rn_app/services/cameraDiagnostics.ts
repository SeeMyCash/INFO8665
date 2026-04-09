import * as FileSystem from 'expo-file-system';

export type CameraDiagnosticsLogEntry = {
    ts: string;
    event: string;
    details?: string;
};

const LOG_FILE_NAME = 'camera-diagnostics.log';
const MAX_LOG_LINES = 400;

let cachedLines: string[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function _resolveBaseUri(): string | null {
    if (FileSystem.documentDirectory) return FileSystem.documentDirectory;
    if (FileSystem.cacheDirectory) return FileSystem.cacheDirectory;
    return null;
}

export function getCameraDiagnosticsLogUri(): string | null {
    const baseUri = _resolveBaseUri();
    if (!baseUri) return null;
    return `${baseUri}${LOG_FILE_NAME}`;
}

function _formatEntry(entry: CameraDiagnosticsLogEntry): string {
    const details = String(entry.details || '').trim();
    return details
        ? `[${entry.ts}] ${entry.event} — ${details}`
        : `[${entry.ts}] ${entry.event}`;
}

async function _hydrateCache(uri: string): Promise<void> {
    if (cachedLines !== null) return;
    try {
        const existing = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.UTF8,
        });
        cachedLines = existing
            .split(/\r?\n/)
            .map((line) => line.trimEnd())
            .filter(Boolean)
            .slice(-MAX_LOG_LINES);
    } catch {
        cachedLines = [];
    }
}

export function appendCameraDiagnosticsEntry(entry: CameraDiagnosticsLogEntry): void {
    const uri = getCameraDiagnosticsLogUri();
    if (!uri) return;

    writeQueue = writeQueue
        .then(async () => {
            await _hydrateCache(uri);
            const lines = cachedLines || [];
            lines.push(_formatEntry(entry));
            cachedLines = lines.slice(-MAX_LOG_LINES);
            await FileSystem.writeAsStringAsync(uri, `${cachedLines.join('\n')}\n`, {
                encoding: FileSystem.EncodingType.UTF8,
            });
        })
        .catch(() => {
            // Keep camera flow resilient; diagnostics should never crash inference UI.
        });
}

export async function readCameraDiagnosticsLog(): Promise<string> {
    const uri = getCameraDiagnosticsLogUri();
    if (!uri) return '';
    try {
        return await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.UTF8,
        });
    } catch {
        return '';
    }
}

export async function clearCameraDiagnosticsLog(): Promise<void> {
    const uri = getCameraDiagnosticsLogUri();
    cachedLines = [];
    if (!uri) return;
    try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
        // No-op; best effort cleanup only.
    }
}
