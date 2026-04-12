/**
 * Web-only live camera component with bounding-box overlay.
 *
 * Uses navigator.mediaDevices.getUserMedia for a smooth, continuous video feed
 * and an HTML5 canvas for real-time bounding-box drawing.
 *
 * On native platforms it renders a placeholder — use CameraView instead.
 */
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { View, Text, Platform } from 'react-native';

/* ── Types ───────────────────────────────────── */

export type Detection = {
    class_id?: number;
    class_name?: string;
    display_name?: string;
    confidence?: number;
    xyxy?: number[];
};

function _hasCapturableFrame(video: HTMLVideoElement | null): video is HTMLVideoElement {
    if (!video) return false;
    return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        && video.videoWidth > 0
        && video.videoHeight > 0
        && !video.ended;
}

function _buildVideoConstraintCandidates(facing: 'front' | 'back'): Array<MediaTrackConstraints | boolean> {
    const preferredFacingMode = facing === 'back' ? 'environment' : 'user';
    const fallbackFacingMode = facing === 'back' ? 'user' : 'environment';

    return [
        {
            facingMode: { ideal: preferredFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
        },
        { facingMode: { ideal: preferredFacingMode } },
        { facingMode: preferredFacingMode },
        { facingMode: { ideal: fallbackFacingMode } },
        true,
    ];
}

function _describeCameraError(error: any): string {
    const name = String(error?.name || '').trim();
    const message = String(error?.message || '').trim();

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return 'Camera permission denied';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return 'No camera was found on this device';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
        return 'Camera is already in use by another app';
    }
    return message || 'Camera access failed';
}

export type WebLiveCameraRef = {
    /** Capture the current video frame as a JPEG Blob. */
    captureFrameBlob: () => Promise<Blob | null>;
};

type Props = {
    facing: 'front' | 'back';
    detections: Detection[];
    active: boolean;
    height?: number;
    onError?: (msg: string) => void;
    onStreamReady?: () => void;
};

/* ── Palette ─────────────────────────────────── */

const CLASS_COLORS: Record<string, string> = {
    CAD_5: '#3B82F6',
    CAD_10: '#8B5CF6',
    CAD_20: '#10B981',
    CAD_50: '#F59E0B',
    CAD_100: '#EF4444',
    COIN: '#94A3B8',
    LOONIE: '#22C55E',
    TOONIE: '#EAB308',
    NICKEL: '#60A5FA',
    DIME: '#A78BFA',
    QUARTER: '#F97316',
    NGN_NOTE: '#DC2626',
    SCREEN_SPOOF: '#DC2626',
};

/* ── Component ───────────────────────────────── */

const WebLiveCamera = forwardRef<WebLiveCameraRef, Props>(function WebLiveCamera(
    { facing, detections, active, height = 300, onError, onStreamReady },
    ref,
) {
    const containerRef = useRef<any>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const overlayRef = useRef<HTMLCanvasElement | null>(null);
    const captureRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [ready, setReady] = useState(false);
    const streamSessionRef = useRef(0);

    // Detections are kept in a ref so the render loop always reads the latest
    // value without needing to be restarted on every inference result.
    const lastDetectionsRef = useRef<Detection[]>([]);
    const renderLoopRef = useRef<number | null>(null);

    /* ── Build DOM elements once ─────────────── */
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const container = containerRef.current as unknown as HTMLDivElement;
        if (!container) return;

        container.innerHTML = '';
        Object.assign(container.style, {
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '12px',
            backgroundColor: '#000',
            width: '100%',
            height: `${height}px`,
        });

        // Video element — no autoplay attribute; play() is called explicitly
        // after srcObject is set to avoid "play() interrupted by new load" errors.
        const video = document.createElement('video');
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        Object.assign(video.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
        });
        container.appendChild(video);
        videoRef.current = video;

        // Canvas overlay — bounding boxes drawn by the render loop
        const overlay = document.createElement('canvas');
        overlay.setAttribute('aria-label', 'Currency detection overlay — bounding boxes are drawn here when currency is detected');
        overlay.setAttribute('role', 'img');
        Object.assign(overlay.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
        });
        container.appendChild(overlay);
        overlayRef.current = overlay;

        // Offscreen canvas for frame capture (never displayed)
        captureRef.current = document.createElement('canvas');

        return () => {
            _stopStream();
            container.innerHTML = '';
            videoRef.current = null;
            overlayRef.current = null;
            captureRef.current = null;
        };
    }, [height]);

    /* ── Start / stop stream ─────────────────── */
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (active) {
            void _startStream();
        } else {
            _stopStream();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, facing]);

    const waitForCapturableFrame = useCallback(
        (video: HTMLVideoElement, session: number, timeoutMs = 4000): Promise<boolean> =>
            new Promise((resolve) => {
                if (streamSessionRef.current !== session) {
                    resolve(false);
                    return;
                }
                if (_hasCapturableFrame(video)) {
                    resolve(true);
                    return;
                }

                let settled = false;
                let rafId: number | null = null;
                let timeoutId: number | null = null;

                const cleanup = () => {
                    video.removeEventListener('loadeddata', checkReady);
                    video.removeEventListener('canplay', checkReady);
                    video.removeEventListener('playing', checkReady);
                    video.removeEventListener('resize', checkReady);
                    if (rafId !== null) cancelAnimationFrame(rafId);
                    if (timeoutId !== null) window.clearTimeout(timeoutId);
                };

                const finish = (ok: boolean) => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    resolve(ok && streamSessionRef.current === session && _hasCapturableFrame(video));
                };

                const queueCheck = () => {
                    if (settled || rafId !== null) return;
                    rafId = requestAnimationFrame(() => {
                        rafId = null;
                        checkReady();
                    });
                };

                const checkReady = () => {
                    if (settled) return;
                    if (streamSessionRef.current !== session) {
                        finish(false);
                        return;
                    }
                    if (_hasCapturableFrame(video)) {
                        finish(true);
                        return;
                    }
                    queueCheck();
                };

                video.addEventListener('loadeddata', checkReady);
                video.addEventListener('canplay', checkReady);
                video.addEventListener('playing', checkReady);
                video.addEventListener('resize', checkReady);
                timeoutId = window.setTimeout(() => finish(false), timeoutMs);
                checkReady();
            }),
        [],
    );

    const startVideoPlayback = useCallback(
        (video: HTMLVideoElement, session: number, timeoutMs = 4000): Promise<boolean> =>
            new Promise((resolve) => {
                if (streamSessionRef.current !== session) {
                    resolve(false);
                    return;
                }

                let settled = false;
                let timeoutId: number | null = null;

                const cleanup = () => {
                    video.removeEventListener('loadedmetadata', tryPlay);
                    video.removeEventListener('canplay', tryPlay);
                    video.removeEventListener('playing', finishSuccess);
                    video.removeEventListener('error', finishFailure);
                    if (timeoutId !== null) window.clearTimeout(timeoutId);
                };

                const finish = (ok: boolean) => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    resolve(ok && streamSessionRef.current === session);
                };

                const finishSuccess = () => finish(true);
                const finishFailure = () => finish(_hasCapturableFrame(video));

                const tryPlay = () => {
                    if (settled || streamSessionRef.current !== session) {
                        finish(false);
                        return;
                    }

                    try {
                        const maybePromise = video.play();
                        if (maybePromise && typeof maybePromise.then === 'function') {
                            maybePromise.then(finishSuccess).catch(() => {
                                // Some mobile browsers reject the first play()
                                // call before metadata is fully settled.
                            });
                        } else if (!video.paused) {
                            finishSuccess();
                        }
                    } catch {
                        // Retry after the browser emits loadedmetadata/canplay.
                    }
                };

                video.addEventListener('loadedmetadata', tryPlay);
                video.addEventListener('canplay', tryPlay);
                video.addEventListener('playing', finishSuccess);
                video.addEventListener('error', finishFailure);
                timeoutId = window.setTimeout(() => finish(_hasCapturableFrame(video)), timeoutMs);
                tryPlay();
            }),
        [],
    );

    const requestCameraStream = useCallback(async (): Promise<MediaStream> => {
        const attempts = _buildVideoConstraintCandidates(facing);
        let lastError: any = null;

        for (const videoConstraints of attempts) {
            try {
                return await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints,
                    audio: false,
                });
            } catch (error: any) {
                lastError = error;
            }
        }

        throw lastError || new Error('Camera access failed');
    }, [facing]);

    async function _startStream() {
        _stopStream();
        const session = streamSessionRef.current;
        const video = videoRef.current;
        if (!video) return;

        try {
            const stream = await requestCameraStream();
            if (streamSessionRef.current !== session) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            streamRef.current = stream;
            video.srcObject = stream;

            // Call play() explicitly and swallow AbortError — it means a
            // competing load request fired (harmless: video is already playing).
            const startedPlayback = await startVideoPlayback(video, session);
            if (!startedPlayback && !_hasCapturableFrame(video)) {
                throw new Error('Failed to load video source');
            }

            const frameReady = await waitForCapturableFrame(video, session);
            if (!frameReady) throw new Error('Camera stream did not become ready in time');

            if (streamSessionRef.current !== session) return;
            setReady(true);
            onStreamReady?.();
        } catch (e: any) {
            if (streamSessionRef.current !== session) return;
            onError?.(_describeCameraError(e));
            setReady(false);
        }
    }

    function _stopStream() {
        streamSessionRef.current += 1;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) {
            try {
                videoRef.current.pause();
            } catch { /* ignore */ }
            videoRef.current.srcObject = null;
            videoRef.current.removeAttribute('src');
            try {
                videoRef.current.load();
            } catch { /* ignore */ }
        }
        setReady(false);
    }

    /* ── Keep detections ref in sync ────────────
     * Never touch the canvas here — that's the render loop's job.
     * Update the canvas aria-label so screen readers reflect detection state. */
    useEffect(() => {
        lastDetectionsRef.current = detections;
        const canvas = overlayRef.current;
        if (!canvas) return;
        if (detections.length === 0) {
            canvas.setAttribute('aria-label', 'Currency detection overlay — no detections');
        } else {
            const names = detections
                .map((d) => d.display_name || d.class_name || 'unknown')
                .join(', ');
            canvas.setAttribute('aria-label', `Detected: ${names}`);
        }
    }, [detections]);

    /* ── Continuous render loop ──────────────────
     * Runs at the display refresh rate (requestAnimationFrame) so the
     * overlay is always in sync with the video frame. Detections come from
     * the ref so they update without restarting the loop.
     * Canvas dimensions are only reset when they actually change — avoids
     * the per-frame clear that caused the visible shutter at 1 fps.        */
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        if (!ready) {
            // Stop loop and clear overlay when stream goes away
            if (renderLoopRef.current !== null) {
                cancelAnimationFrame(renderLoopRef.current);
                renderLoopRef.current = null;
            }
            const canvas = overlayRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx?.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }

        const loop = () => {
            const canvas = overlayRef.current;
            const video = videoRef.current;
            if (!canvas || !video) return;

            // Resize only when necessary — setting .width/.height always clears the canvas
            const rect = canvas.getBoundingClientRect();
            const cw = Math.max(1, Math.round(rect.width));
            const ch = Math.max(1, Math.round(rect.height));
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw;
                canvas.height = ch;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) { renderLoopRef.current = requestAnimationFrame(loop); return; }

            ctx.clearRect(0, 0, cw, ch);

            const dets = lastDetectionsRef.current;
            if (dets.length && video.videoWidth && video.videoHeight) {
                const vw = video.videoWidth;
                const vh = video.videoHeight;

                // object-fit: cover → scale to fill + center
                const scale = Math.max(cw / vw, ch / vh);
                const ox = (cw - vw * scale) / 2;
                const oy = (ch - vh * scale) / 2;

                for (const det of dets) {
                    if (!det.xyxy || det.xyxy.length < 4) continue;
                    const [x1, y1, x2, y2] = det.xyxy;

                    const dx1 = ox + x1 * scale;
                    const dy1 = oy + y1 * scale;
                    const bw = (x2 - x1) * scale;
                    const bh = (y2 - y1) * scale;

                    const tag = String(det.display_name || det.class_name || '?');
                    const color = CLASS_COLORS[tag] || CLASS_COLORS[det.class_name || ''] || '#A78BFA';
                    const conf = det.confidence != null ? Math.round(det.confidence * 100) : 0;
                    const label = `${tag} ${conf}%`;

                    // Box
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = color;
                    ctx.strokeRect(dx1, dy1, bw, bh);

                    // Translucent fill
                    ctx.fillStyle = color + '22';
                    ctx.fillRect(dx1, dy1, bw, bh);

                    // Label background
                    ctx.font = 'bold 14px sans-serif';
                    const tw = ctx.measureText(label).width;
                    const lh = 22;
                    ctx.fillStyle = color;
                    ctx.fillRect(dx1, dy1 - lh, tw + 10, lh);

                    // Label text
                    ctx.fillStyle = '#FFF';
                    ctx.fillText(label, dx1 + 5, dy1 - 6);
                }
            }

            renderLoopRef.current = requestAnimationFrame(loop);
        };

        renderLoopRef.current = requestAnimationFrame(loop);

        return () => {
            if (renderLoopRef.current !== null) {
                cancelAnimationFrame(renderLoopRef.current);
                renderLoopRef.current = null;
            }
        };
    }, [ready]);

    /* ── Frame capture ───────────────────────── */
    const captureFrameBlob = useCallback(async (): Promise<Blob | null> => {
        const video = videoRef.current;
        const canvas = captureRef.current;
        const session = streamSessionRef.current;
        if (!video || !canvas || !streamRef.current) return null;

        if (!_hasCapturableFrame(video)) {
            const frameReady = await waitForCapturableFrame(video, session);
            if (!frameReady) return null;
        }
        if (streamSessionRef.current !== session) return null;

        if (!ready) setReady(true);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
        });
    }, [ready, waitForCapturableFrame]);

    useImperativeHandle(ref, () => ({ captureFrameBlob }), [captureFrameBlob]);

    /* ── Render ──────────────────────────────── */
    if (Platform.OS !== 'web') {
        return (
            <View style={{ height, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#FFF' }}>Use native CameraView on this platform</Text>
            </View>
        );
    }

    return (
        <View
            ref={containerRef}
            style={{
                width: '100%',
                height,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#000',
            }}
        />
    );
});

export default WebLiveCamera;
