/**
 * Image component with bounding-box overlay drawn on a canvas (web only).
 *
 * On web, it appends an HTML5 canvas over the <img> element and draws detection
 * boxes scaled from the image's native resolution to the displayed size.
 * On native platforms it simply renders a plain <Image>.
 */
import React, { useEffect, useRef } from 'react';
import { Image, ImageStyle, Platform, StyleProp, View } from 'react-native';

export type Detection = {
    class_name?: string;
    confidence?: number;
    xyxy?: number[];
};

const CLASS_COLORS: Record<string, string> = {
    CAD_5: '#3B82F6',
    CAD_10: '#8B5CF6',
    CAD_20: '#10B981',
    CAD_50: '#F59E0B',
    CAD_100: '#EF4444',
    COIN: '#94A3B8',
};

type Props = {
    uri: string;
    detections: Detection[];
    style?: StyleProp<ImageStyle>;
    resizeMode?: 'contain' | 'cover';
};

export default function ImageWithOverlay({ uri, detections, style, resizeMode = 'contain' }: Props) {
    const wrapRef = useRef<any>(null);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const div = wrapRef.current as unknown as HTMLDivElement;
        if (!div) return;

        // Remove any previous overlay canvases
        div.querySelectorAll('canvas[data-bbox]').forEach((c) => c.remove());

        if (!detections.length) return;

        // Find the underlying <img> element (React Native Web renders Image as <img>)
        const img = div.querySelector('img') as HTMLImageElement | null;
        if (!img) return;

        const draw = () => {
            // Remove stale canvases again (may have been added by a race)
            div.querySelectorAll('canvas[data-bbox]').forEach((c) => c.remove());

            const nw = img.naturalWidth || 1;
            const nh = img.naturalHeight || 1;
            const rect = img.getBoundingClientRect();
            const dw = rect.width;
            const dh = rect.height;
            if (!dw || !dh) return;

            const canvas = document.createElement('canvas');
            canvas.setAttribute('data-bbox', '1');
            canvas.width = dw;
            canvas.height = dh;
            Object.assign(canvas.style, {
                position: 'absolute',
                top: `${img.offsetTop}px`,
                left: `${img.offsetLeft}px`,
                width: `${dw}px`,
                height: `${dh}px`,
                pointerEvents: 'none',
            });
            div.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // resizeMode: contain → letterbox, cover → fill
            const scale =
                resizeMode === 'contain'
                    ? Math.min(dw / nw, dh / nh)
                    : Math.max(dw / nw, dh / nh);
            const ox = (dw - nw * scale) / 2;
            const oy = (dh - nh * scale) / 2;

            for (const det of detections) {
                if (!det.xyxy || det.xyxy.length < 4) continue;
                const [x1, y1, x2, y2] = det.xyxy;

                const dx1 = ox + x1 * scale;
                const dy1 = oy + y1 * scale;
                const bw = (x2 - x1) * scale;
                const bh = (y2 - y1) * scale;

                const color = CLASS_COLORS[det.class_name || ''] || '#A78BFA';
                const conf = det.confidence != null ? Math.round(det.confidence * 100) : 0;
                const label = `${det.class_name || '?'} ${conf}%`;

                // Box
                ctx.lineWidth = 2;
                ctx.strokeStyle = color;
                ctx.strokeRect(dx1, dy1, bw, bh);

                // Translucent fill
                ctx.fillStyle = color + '22';
                ctx.fillRect(dx1, dy1, bw, bh);

                // Label background
                ctx.font = 'bold 12px sans-serif';
                const tw = ctx.measureText(label).width;
                const lh = 18;
                ctx.fillStyle = color;
                ctx.fillRect(dx1, dy1 - lh, tw + 8, lh);

                // Label text
                ctx.fillStyle = '#FFF';
                ctx.fillText(label, dx1 + 4, dy1 - 4);
            }
        };

        if (img.complete && img.naturalWidth) {
            draw();
        } else {
            img.addEventListener('load', draw, { once: true });
        }

        return () => {
            div.querySelectorAll('canvas[data-bbox]').forEach((c) => c.remove());
        };
    }, [uri, detections, resizeMode]);

    // Ensure the container has position:relative so the absolute canvas positions correctly
    // On web, View === <div>, and we set position via style.
    return (
        <View ref={wrapRef} style={{ position: 'relative' as any }}>
            <Image source={{ uri }} style={style} resizeMode={resizeMode} />
        </View>
    );
}
