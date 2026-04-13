import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Pressable, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useSettings } from '../contexts/SettingsContext';
import { useHistory } from '../contexts/HistoryContext';
import { useThemeColors } from '../contexts/ThemeContext';
import { DEMO_FLOW_OPTIONS, getDemoScenario } from '../demo/demoFlows';
import GradientButton from '../components/GradientButton';
import AnimatedCard from '../components/AnimatedCard';
import { useToast } from '../components/Toast';
import { spacing, radii } from '../theme';

function Section({ title, icon, tc, typ }: { title: string; icon: any; tc: any; typ: any; children?: React.ReactNode } & { children?: React.ReactNode }) {
    return null; // placeholder — will be overridden below
}

export default function SettingsScreen() {
    const { settings, update, reset, clearStorage: clearSettingsStorage } = useSettings();
    const { entries, clearStorage: clearHistoryStorage, count: historyCount } = useHistory();
    const { tc, isDark, typography: typ } = useThemeColors();
    const { show } = useToast();
    const selectedDemoScenario = getDemoScenario(settings.demoFlowMode);
    const [, requestCameraPermission] = useCameraPermissions();
    const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

    const handleReset = () => {
        reset();
        show('Settings reset to defaults', 'success');
    };

    const handleClearAllData = () => {
        const doClear = async () => {
            await clearSettingsStorage();
            await clearHistoryStorage();
            show('All data cleared', 'success');
        };

        if (Platform.OS === 'web') {
            // Web doesn't have Alert.alert; just do it
            if (window.confirm('Clear all saved settings and history? This cannot be undone.')) {
                doClear();
            }
        } else {
            Alert.alert(
                'Clear All Data',
                'This will erase all saved settings and scan history from this device. This action cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: doClear },
                ]
            );
        }
    };

    const handleRequestPermissions = async () => {
        setPermissionStatus('Requesting…');

        if (Platform.OS === 'web') {
            if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                setPermissionStatus('Not supported in this browser');
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                stream.getTracks().forEach((t) => t.stop());
                setPermissionStatus('Camera and microphone granted');
                show('Permissions granted', 'success');
            } catch (e: any) {
                const msg = e?.name === 'NotAllowedError'
                    ? 'Blocked by browser — open Site Settings to re-enable'
                    : `Permission error: ${e?.message || String(e)}`;
                setPermissionStatus(msg);
                show(msg, 'error');
            }
        } else {
            // Native — camera via expo-camera; mic requires expo-av (not installed)
            const result = await requestCameraPermission();
            if (result.granted) {
                setPermissionStatus('Camera granted');
                show('Camera permission granted', 'success');
            } else if (result.canAskAgain) {
                setPermissionStatus('Camera denied — tap again to retry');
            } else {
                setPermissionStatus('Camera blocked — open device Settings to re-enable');
                show('Open device Settings to re-enable camera access', 'error');
            }
        }
    };

    const cardStyle = {
        backgroundColor: tc.surface,
        borderRadius: radii.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: tc.border,
    };

    const renderSection = (title: string, icon: string, children: React.ReactNode, delay: number) => (
        <AnimatedCard delay={delay}>
            <View style={cardStyle}>
                <View style={styles.cardHeader}>
                    <Ionicons name={icon as any} size={18} color={tc.primary} />
                    <Text style={[styles.cardTitle, typ.h3, { color: tc.textPrimary }]}>{title}</Text>
                </View>
                {children}
            </View>
        </AnimatedCard>
    );

    const renderRow = (label: string, description: string | undefined, children: React.ReactNode) => (
        <View style={[styles.settingRow, { borderBottomColor: tc.border }]}>
            <View style={{ flex: 1 }}>
                <Text style={[typ.bodyBold, { color: tc.textPrimary }]}>{label}</Text>
                {description ? <Text style={[typ.caption, { color: tc.textMuted, marginTop: 2 }]}>{description}</Text> : null}
            </View>
            {children}
        </View>
    );

    const renderThreshold = (
        options: number[],
        current: number,
        onSelect: (v: number) => void,
        testIdPrefix?: string,
    ) => (
        <View style={styles.thresholdRow}>
            {options.map((v) => (
                <Pressable
                    key={v}
                    onPress={() => onSelect(v)}
                    style={[
                        styles.thresholdBtn,
                        { backgroundColor: tc.surfaceElevated },
                        current === v && { backgroundColor: tc.primary },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${v}`}
                    accessibilityState={{ selected: current === v }}
                    testID={testIdPrefix ? `${testIdPrefix}-${String(v).replace('.', '_')}` : undefined}
                >
                    <Text style={[
                        typ.caption,
                        { color: tc.textSecondary },
                        current === v && { color: '#FFF', fontWeight: '700' },
                    ]}>
                        {typeof v === 'number' && v < 1 ? `${Math.round(v * 100)}%` : v}
                    </Text>
                </Pressable>
            ))}
        </View>
    );

    const segmentControl = (options: { label: string; value: string }[], value: string, onChange: (v: string) => void) => (
        <View style={[styles.segmentWrap, { backgroundColor: tc.surfaceElevated }]}>
            {options.map((opt) => (
                <Pressable
                    key={opt.value}
                    onPress={() => onChange(opt.value)}
                    style={[styles.segmentBtn, value === opt.value && { backgroundColor: tc.primary }]}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: value === opt.value }}
                >
                    <Text style={[
                        typ.caption,
                        { color: tc.textSecondary },
                        value === opt.value && { color: '#FFF', fontWeight: '700' },
                    ]}>
                        {opt.label}
                    </Text>
                </Pressable>
            ))}
        </View>
    );

    const switchTrack = (active: boolean, color?: string) => ({
        false: tc.surfaceElevated,
        true: (color || tc.primary) + '66',
    });

    const switchThumb = (active: boolean, color?: string) =>
        active ? (color || tc.primary) : tc.textMuted;

    const renderDemoOption = (option: (typeof DEMO_FLOW_OPTIONS)[number]) => {
        const selected = settings.demoFlowMode === option.value;
        return (
            <Pressable
                key={option.value}
                onPress={() => update({ demoFlowMode: option.value })}
                style={[
                    styles.demoOption,
                    {
                        backgroundColor: selected ? tc.primary + '12' : tc.surfaceElevated,
                        borderColor: selected ? tc.primary : tc.border,
                    },
                ]}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                testID={`demo-flow-${option.value}`}
            >
                <View style={styles.demoOptionHeader}>
                    <Text style={[typ.bodyBold, { color: tc.textPrimary, flex: 1 }]}>{option.label}</Text>
                    <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={selected ? tc.primary : tc.textMuted}
                    />
                </View>
                <Text style={[typ.caption, { color: tc.textMuted }]}>{option.summary}</Text>
            </Pressable>
        );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: tc.background }]} contentContainerStyle={styles.scroll}>
            {/* Appearance */}
            {renderSection('Appearance', 'color-palette-outline', <>
                {renderRow('Dark Mode', 'Switch between light and dark theme', (
                    <Switch
                        value={settings.darkMode}
                        onValueChange={(v) => update({ darkMode: v })}
                        trackColor={switchTrack(settings.darkMode)}
                        thumbColor={switchThumb(settings.darkMode)}
                    />
                ))}
            </>, 0)}

            {/* API */}
            {renderSection('API Connection', 'server-outline', <>
                {renderRow('Base URL', 'FastAPI backend address', (
                    <TextInput
                        value={settings.apiBaseUrl}
                        onChangeText={(v) => update({ apiBaseUrl: v })}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="http://localhost:8080"
                        placeholderTextColor={tc.textMuted}
                        style={[styles.textInput, typ.mono, {
                            backgroundColor: tc.surfaceElevated,
                            color: tc.textPrimary,
                            borderColor: tc.border,
                        }]}
                    />
                ))}
            </>, 60)}

            {/* Detection */}
            {renderSection('Detection', 'scan-outline', <>
                {renderRow(
                    'Detector Threshold',
                    `${Math.round(settings.confidenceThreshold * 100)}% — detector boxes below this are hidden`,
                    renderThreshold(
                        [0.1, 0.25, 0.5, 0.75],
                        settings.confidenceThreshold,
                        (v) => update({ confidenceThreshold: v }),
                        'detector-threshold'
                    )
                )}
                {renderRow(
                    'Classifier Threshold',
                    `${Math.round(settings.classifierConfidenceThreshold * 100)}% — denomination labels and totals must clear this`,
                    renderThreshold(
                        [0.5, 0.7, 0.85, 0.95],
                        settings.classifierConfidenceThreshold,
                        (v) => update({ classifierConfidenceThreshold: v }),
                        'classifier-threshold'
                    )
                )}
            </>, 120)}

            {/* Security */}
            {renderSection('Security', 'shield-checkmark-outline', <>
                {renderRow(
                    'Screen Spoof Protection',
                    'Use the screen-guard model before detector inference (manual opt-in).',
                    (
                        <Switch
                            value={settings.screenSpoofGuardEnabled}
                            onValueChange={(v) => update({ screenSpoofGuardEnabled: v })}
                            trackColor={switchTrack(settings.screenSpoofGuardEnabled, tc.warning)}
                            thumbColor={switchThumb(settings.screenSpoofGuardEnabled, tc.warning)}
                        />
                    )
                )}
            </>, 150)}

            {/* Camera */}
            {renderSection('Camera', 'videocam-outline', <>
                {renderRow('Resolution',
                    undefined,
                    segmentControl(
                        [{ label: 'Low', value: 'low' }, { label: 'Med', value: 'medium' }, { label: 'High', value: 'high' }],
                        settings.cameraResolution,
                        (v) => update({ cameraResolution: v as any })
                    )
                )}
                {renderRow('Live FPS', `${settings.liveFps} frame/sec`,
                    renderThreshold([1, 2, 3, 5, 8], settings.liveFps, (v) => update({ liveFps: v }), 'live-fps')
                )}
                {renderRow(
                    'Stability Window',
                    `${settings.liveStabilityWindowSec}s confirmation window`,
                    renderThreshold([1, 2, 3, 4, 5], settings.liveStabilityWindowSec, (v) => update({ liveStabilityWindowSec: v }), 'live-stability-window')
                )}
                {renderRow(
                    'Min Stable Frames',
                    `${settings.liveStabilityMinFrames} consecutive frames required`,
                    renderThreshold([2, 3, 4, 5, 6], settings.liveStabilityMinFrames, (v) => update({ liveStabilityMinFrames: v }), 'live-stability-frames')
                )}
                {renderRow(
                    'Box IoU Match',
                    `${Math.round(settings.liveStabilityIou * 100)}% overlap required`,
                    renderThreshold([0.3, 0.45, 0.6, 0.75], settings.liveStabilityIou, (v) => update({ liveStabilityIou: v }), 'live-stability-iou')
                )}
            </>, 180)}

            {/* TTS */}
            {renderSection('Text-to-Speech', 'volume-high-outline', <>
                {renderRow('Enable TTS', 'Announce detected values aloud', (
                    <Switch
                        value={settings.ttsEnabled}
                        onValueChange={(v) => update({ ttsEnabled: v })}
                        trackColor={switchTrack(settings.ttsEnabled)}
                        thumbColor={switchThumb(settings.ttsEnabled)}
                    />
                ))}
                {renderRow('Speed', `${settings.ttsSpeed.toFixed(1)}×`,
                    segmentControl(
                        [{ label: '0.5×', value: '0.5' }, { label: '1×', value: '1' }, { label: '1.5×', value: '1.5' }, { label: '2×', value: '2' }],
                        String(settings.ttsSpeed),
                        (v) => update({ ttsSpeed: parseFloat(v) })
                    )
                )}
            </>, 240)}

            {/* Accessibility */}
            {renderSection('Accessibility', 'accessibility-outline', <>
                {renderRow('High Contrast', 'Increases border and text contrast', (
                    <Switch
                        value={settings.highContrast}
                        onValueChange={(v) => update({ highContrast: v })}
                        trackColor={switchTrack(settings.highContrast, tc.accent)}
                        thumbColor={switchThumb(settings.highContrast, tc.accent)}
                    />
                ))}
                {renderRow('Large Fonts', 'Increase text size throughout the app', (
                    <Switch
                        value={settings.largeFonts}
                        onValueChange={(v) => update({ largeFonts: v })}
                        trackColor={switchTrack(settings.largeFonts, tc.accent)}
                        thumbColor={switchThumb(settings.largeFonts, tc.accent)}
                    />
                ))}
                {renderRow('Haptic Feedback', 'Vibrate on detection events', (
                    <Switch
                        value={settings.hapticFeedback}
                        onValueChange={(v) => update({ hapticFeedback: v })}
                        trackColor={switchTrack(settings.hapticFeedback, tc.accent)}
                        thumbColor={switchThumb(settings.hapticFeedback, tc.accent)}
                    />
                ))}
                {renderRow('Voice Commands', 'Control the camera with your voice (web only)', (
                    <Switch
                        value={settings.voiceCommandsEnabled}
                        onValueChange={(v) => update({ voiceCommandsEnabled: v })}
                        trackColor={switchTrack(settings.voiceCommandsEnabled, tc.accent)}
                        thumbColor={switchThumb(settings.voiceCommandsEnabled, tc.accent)}
                    />
                ))}
            </>, 300)}

            {/* Permissions */}
            {renderSection('Permissions', 'shield-outline', <>
                {renderRow(
                    'Camera & Microphone',
                    permissionStatus ?? (Platform.OS === 'web'
                        ? 'Re-prompt the browser for camera and microphone access'
                        : 'Re-prompt the OS for camera access'),
                    (
                        <GradientButton
                            title="Request"
                            onPress={handleRequestPermissions}
                            variant="outline"
                            size="sm"
                            icon={<Ionicons name="mic-outline" size={14} color={tc.primary} />}
                        />
                    )
                )}
            </>, 310)}

            {/* Demo flows */}
            {renderSection('Demo Flows', 'flash-outline', <>
                <Text style={[typ.caption, styles.demoIntro, { color: tc.textMuted }]}>
                    Arm a scripted demo flow. On the Scan tab, pressing Start Camera will trigger the selected scenario immediately.
                </Text>
                <View style={styles.demoOptionList}>
                    {DEMO_FLOW_OPTIONS.map(renderDemoOption)}
                </View>
                {selectedDemoScenario && (
                    <View
                        style={[
                            styles.demoStatus,
                            {
                                backgroundColor: tc.warning + '12',
                                borderColor: tc.warning + '33',
                            },
                        ]}
                    >
                        <Ionicons name="megaphone-outline" size={16} color={tc.warning} />
                        <Text style={[typ.caption, { color: tc.textSecondary, flex: 1 }]}>
                            {selectedDemoScenario.activationHint}
                        </Text>
                    </View>
                )}
            </>, 330)}

            {/* Debug */}
            {renderSection('Developer', 'code-slash-outline', <>
                {renderRow('Debug Mode', 'Show API configuration and debug panels', (
                    <Switch
                        value={settings.debugModeEnabled}
                        onValueChange={(v) => update({ debugModeEnabled: v })}
                        trackColor={switchTrack(settings.debugModeEnabled)}
                        thumbColor={switchThumb(settings.debugModeEnabled)}
                    />
                ))}
            </>, 360)}

            {/* Data & Storage */}
            {renderSection('Data & Storage', 'folder-outline', <>
                {renderRow('Scan History', `${historyCount} entries saved`, (
                    <View style={[styles.storageBadge, { backgroundColor: tc.surfaceElevated }]}>
                        <Text style={[typ.badge, { color: tc.accent }]}>{historyCount}</Text>
                    </View>
                ))}
                {renderRow('Settings', 'Preferences saved to device', (
                    <Ionicons name="checkmark-circle" size={18} color={tc.accent} />
                ))}
                <View style={{ marginTop: spacing.md }}>
                    <GradientButton
                        title="Clear All Data"
                        onPress={handleClearAllData}
                        variant="outline"
                        size="sm"
                        icon={<Ionicons name="trash-outline" size={16} color={tc.error} />}
                        accessibilityHint="Erases all saved settings and scan history from this device"
                    />
                </View>
            </>, 360)}

            {/* Reset */}
            <AnimatedCard delay={420}>
                <View style={styles.resetWrap}>
                    <GradientButton
                        title="Reset All to Defaults"
                        onPress={handleReset}
                        variant="outline"
                        size="sm"
                        icon={<Ionicons name="refresh-outline" size={16} color={tc.primary} />}
                    />
                </View>
            </AnimatedCard>

            <View style={{ height: spacing.huge }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: spacing.lg, gap: spacing.lg },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center',
        gap: spacing.sm, marginBottom: spacing.md,
    },
    cardTitle: {},
    settingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: spacing.sm, borderBottomWidth: 0.5, gap: spacing.md,
    },
    textInput: {
        borderRadius: radii.sm,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderWidth: 1, minWidth: 200,
    },
    thresholdRow: { flexDirection: 'row', gap: spacing.xs },
    thresholdBtn: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.sm,
    },
    demoIntro: {
        marginBottom: spacing.md,
        lineHeight: 18,
    },
    demoOptionList: {
        gap: spacing.sm,
    },
    demoOption: {
        borderRadius: radii.md,
        borderWidth: 1,
        padding: spacing.md,
        gap: spacing.xs,
    },
    demoOptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    demoStatus: {
        marginTop: spacing.md,
        borderWidth: 1,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    segmentWrap: {
        flexDirection: 'row', gap: 2, borderRadius: radii.sm, padding: 2,
    },
    segmentBtn: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
        borderRadius: radii.sm - 2,
    },
    resetWrap: { alignItems: 'center' },
    storageBadge: {
        paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full,
        minWidth: 28, alignItems: 'center',
    },
});
