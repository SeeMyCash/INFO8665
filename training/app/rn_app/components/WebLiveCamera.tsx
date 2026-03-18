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

        // Video element — smooth live feed
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
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

        // Canvas overlay — bounding boxes drawn here
        const overlay = document.createElement('canvas');
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
            _startStream();
        } else {
            _stopStream();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, facing]);

    async function _startStream() {
        _stopStream();
        const video = videoRef.current;
        if (!video) return;

        try {
            const facingMode = facing === 'back' ? 'environment' : 'user';
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
            streamRef.current = stream;
            video.srcObject = stream;
            await video.play();
            setReady(true);
            onStreamReady?.();
        } catch (e: any) {
            onError?.(e?.message || 'Camera access failed');
            setReady(false);
        }
    }

    function _stopStream() {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setReady(false);

        const ctx = overlayRef.current?.getContext('2d');
        if (ctx && overlayRef.current) {
            ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        }
    }

    /* ── Bounding-box overlay ────────────────── */
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const canvas = overlayRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        // Match canvas pixel resolution to its CSS display size
        const rect = canvas.getBoundingClientRect();
        const cw = rect.width || 1;
        const ch = rect.height || 1;
        canvas.width = cw;
        canvas.height = ch;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, cw, ch);

        if (!detections.length || !ready) return;

        // Video intrinsic size
        const vw = video.videoWidth || 1;
        const vh = video.videoHeight || 1;

        // object-fit: cover → scale to fill + center
        const scale = Math.max(cw / vw, ch / vh);
        const ox = (cw - vw * scale) / 2;
        const oy = (ch - vh * scale) / 2;

        for (const det of detections) {
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
    }, [detections, ready]);

    /* ── Frame capture ───────────────────────── */
    const captureFrameBlob = useCallback(async (): Promise<Blob | null> => {
        const video = videoRef.current;
        const canvas = captureRef.current;
        if (!video || !canvas || !ready) return null;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
        });
    }, [ready]);

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
