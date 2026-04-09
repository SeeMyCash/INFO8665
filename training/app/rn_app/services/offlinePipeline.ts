import { Platform } from 'react-native';
import type { OfflinePipelineStatus, OfflineRunOptions, PipelineResponse } from './offlineTypes';

const OFFLINE_UNSUPPORTED_ERROR =
  'On-device inference is available only in the Android build with bundled models.';

type OfflinePipelineModule = {
  getOfflinePipelineStatus: () => Promise<OfflinePipelineStatus>;
  runOfflineInference: (uri: string, options: OfflineRunOptions) => Promise<PipelineResponse>;
  releaseOfflinePipeline: () => Promise<void>;
};

let androidModule: OfflinePipelineModule | null | undefined;
let androidModuleError: string | null = null;

function loadAndroidModule(): OfflinePipelineModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  if (androidModule !== undefined) {
    return androidModule;
  }

  try {
    // Explicitly requiring the Android implementation protects us if Metro resolves this base file on Android.
    const module = require('./offlinePipeline.android') as OfflinePipelineModule;
    if (
      typeof module?.getOfflinePipelineStatus === 'function'
      && typeof module?.runOfflineInference === 'function'
      && typeof module?.releaseOfflinePipeline === 'function'
    ) {
      androidModule = module;
      return androidModule;
    }
    androidModuleError = 'Bundled Android offline runtime is missing required exports.';
  } catch (error) {
    androidModuleError = error instanceof Error ? error.message : String(error || 'Unknown offline runtime load error.');
  }

  androidModule = null;
  return null;
}

function unsupportedStatus(): OfflinePipelineStatus {
  const platformSpecificError = Platform.OS === 'android' && androidModuleError
    ? `${OFFLINE_UNSUPPORTED_ERROR} ${androidModuleError}`
    : OFFLINE_UNSUPPORTED_ERROR;

  return {
    supported: false,
    ready: false,
    mode: 'offline',
    platform: Platform.OS,
    pipeline: {
      detector: null,
      bill_reader: null,
      coin_classifier: null,
      spoof_guard: null,
    },
    availableModels: [],
    error: platformSpecificError,
    details: {
      executionProviders: [],
      manifestGeneratedAt: null,
    },
  };
}

export async function getOfflinePipelineStatus(): Promise<OfflinePipelineStatus> {
  const android = loadAndroidModule();
  if (android) {
    return android.getOfflinePipelineStatus();
  }
  return unsupportedStatus();
}

export async function runOfflineInference(
  uri: string,
  options: OfflineRunOptions,
): Promise<PipelineResponse> {
  const android = loadAndroidModule();
  if (android) {
    return android.runOfflineInference(uri, options);
  }
  return { error: unsupportedStatus().error || OFFLINE_UNSUPPORTED_ERROR };
}

export async function releaseOfflinePipeline(): Promise<void> {
  const android = loadAndroidModule();
  if (android) {
    await android.releaseOfflinePipeline();
  }
  return;
}
