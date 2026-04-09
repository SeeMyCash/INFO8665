import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Detection = {
    class_name?: string;
    display_name?: string;
    confidence?: number;
    xyxy?: number[];
};

type Props = {
    detections: Detection[];
    width: number;
    height: number;
    sourceWidth?: number | null;
    sourceHeight?: number | null;
    resizeMode?: 'contain' | 'cover';
    mirrored?: boolean;
};

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

type ProjectedDetection = {
    key: string;
    label: string;
    color: string;
    left: number;
    top: number;
    width: number;
    height: number;
    labelTop: number;
    labelMaxWidth: number;
};

function withAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) {
        return hex;
    }
    const safeAlpha = Math.max(0, Math.min(1, alpha));
    const alphaHex = Math.round(safeAlpha * 255).toString(16).padStart(2, '0');
    return `#${normalized}${alphaHex}`;
}

function projectDetection(
    detection: Detection,
    index: number,
    width: number,
    height: number,
    sourceWidth: number,
    sourceHeight: number,
    resizeMode: 'contain' | 'cover',
    mirrored: boolean,
): ProjectedDetection | null {
    if (!Array.isArray(detection.xyxy) || detection.xyxy.length < 4) {
        return null;
    }

    const x1 = Math.min(Number(detection.xyxy[0] || 0), Number(detection.xyxy[2] || 0));
    const y1 = Math.min(Number(detection.xyxy[1] || 0), Number(detection.xyxy[3] || 0));
    const x2 = Math.max(Number(detection.xyxy[0] || 0), Number(detection.xyxy[2] || 0));
    const y2 = Math.max(Number(detection.xyxy[1] || 0), Number(detection.xyxy[3] || 0));
    const boxWidth = Math.max(1, x2 - x1);
    const boxHeight = Math.max(1, y2 - y1);

    const scale = resizeMode === 'cover'
        ? Math.max(width / sourceWidth, height / sourceHeight)
        : Math.min(width / sourceWidth, height / sourceHeight);
    const offsetX = (width - (sourceWidth * scale)) / 2;
    const offsetY = (height - (sourceHeight * scale)) / 2;

    let left = offsetX + (x1 * scale);
    const top = offsetY + (y1 * scale);
    const projectedWidth = Math.max(1, boxWidth * scale);
    const projectedHeight = Math.max(1, boxHeight * scale);

    if (mirrored) {
        left = width - left - projectedWidth;
    }

    const className = String(detection.display_name || detection.class_name || '?');
    const confidence = detection.confidence != null ? Math.round(Number(detection.confidence) * 100) : 0;
    const label = confidence > 0 ? `${className} ${confidence}%` : className;
    const color = CLASS_COLORS[className] || CLASS_COLORS[String(detection.class_name || '')] || '#A78BFA';

    return {
        key: `${className}-${index}-${Math.round(left)}-${Math.round(top)}`,
        label,
        color,
        left,
        top,
        width: projectedWidth,
        height: projectedHeight,
        labelTop: Math.max(0, top - 24),
        labelMaxWidth: Math.max(80, width - Math.max(0, left) - 8),
    };
}

export default function DetectionOverlay({
    detections,
    width,
    height,
    sourceWidth,
    sourceHeight,
    resizeMode = 'contain',
    mirrored = false,
}: Props) {
    const projectedDetections = useMemo(() => {
        if (!(width > 0) || !(height > 0) || !(sourceWidth && sourceWidth > 0) || !(sourceHeight && sourceHeight > 0)) {
            return [];
        }

        return detections
            .map((detection, index) =>
                projectDetection(detection, index, width, height, sourceWidth, sourceHeight, resizeMode, mirrored)
            )
            .filter((detection): detection is ProjectedDetection => Boolean(detection));
    }, [detections, height, mirrored, resizeMode, sourceHeight, sourceWidth, width]);

    if (!projectedDetections.length) {
        return null;
    }

    return (
        <View pointerEvents="none" style={styles.overlay}>
            {projectedDetections.map((detection) => (
                <React.Fragment key={detection.key}>
                    <View
                        style={[
                            styles.box,
                            {
                                left: detection.left,
                                top: detection.top,
                                width: detection.width,
                                height: detection.height,
                                borderColor: detection.color,
                                backgroundColor: withAlpha(detection.color, 0.14),
                            },
                        ]}
                    />
                    <View
                        style={[
                            styles.label,
                            {
                                left: detection.left,
                                top: detection.labelTop,
                                backgroundColor: detection.color,
                                maxWidth: detection.labelMaxWidth,
                            },
                        ]}
                    >
                        <Text numberOfLines={1} style={styles.labelText}>
                            {detection.label}
                        </Text>
                    </View>
                </React.Fragment>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    box: {
        position: 'absolute',
        borderWidth: 2,
        borderRadius: 10,
    },
    label: {
        position: 'absolute',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    labelText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
});
