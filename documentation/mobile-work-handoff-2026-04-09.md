# Mobile Work Handoff (April 9, 2026)

## Scope Completed
- Added offline-first React Native flow for on-device inference mode and cloud mode switching.
- Added bundled mobile model export + manifest workflow for Android packaging.
- Added mobile architecture poster asset and supporting project communication docs.
- Added camera diagnostics instrumentation and adb pull tooling for field debugging.
- Added Android prebuild project, icon/app-name updates, and APK build/install workflow.

## Major Functional Changes
- On-device inference mode:
  - `training/app/rn_app/services/offlinePipeline.ts`
  - `training/app/rn_app/services/offlinePipeline.android.ts`
  - `training/app/rn_app/services/offlineTypes.ts`
  - `training/app/rn_app/assets/models/*`
- Inference screen upgrades:
  - richer camera controls
  - live mode loop
  - fallback to system camera when native capture fails
  - detection overlay drawing support
  - cloud/offline endpoint switching logic
- Debugging and diagnostics:
  - app-side diagnostics log writer: `training/app/rn_app/services/cameraDiagnostics.ts`
  - diagnostics UI surfacing in app debug panel
  - adb extraction helper: `training/app/rn_app/pull_camera_diagnostics.ps1`
  - fallback logcat extraction for non-debuggable/release APKs
- Android packaging:
  - Expo prebuild Android project under `training/app/rn_app/android/`
  - app name and icon updates in app config and generated resources
  - cleartext traffic enablement for local HTTP backend/cloud dev fallback

## Security/Config Changes
- Debug mode gate introduced and expanded so debug-only panels can be hidden in normal use.
- Runtime and diagnostics details are now intended to be controlled by debug mode.
- API route and camera diagnostics were moved behind debug-focused controls.

## Build and Delivery Artifacts Added
- Android app project files under `training/app/rn_app/android/`
- Mobile model export script:
  - `scripts/42_export_mobile_bundle.py`
- Mobile model manifest:
  - `training/app/rn_app/assets/models/mobile-model-manifest.json`
- Architecture asset:
  - `documentation/assets/see-my-cash-architecture-a3.svg`

## What Was Verified
- Android SDK/toolchain usage for build and device install.
- Debug and release APK assembly succeeded from shortened Windows path (`subst` workaround).
- APK install succeeded on connected Android device.
- Camera diagnostics can be pulled from app file in debug builds.
- Camera diagnostics fallback to filtered `adb logcat` works for release builds.

## Known Open Issue
- Native in-app camera preview/capture remains unstable on tested Android device:
  - preview can render black despite permissions and ready events
  - `ERR_IMAGE_CAPTURE_FAILED` still occurs on `takePictureAsync` path
  - system camera fallback launches, but root cause in native in-app capture path is still unresolved

## Recommended Next Investigation
- Force `androidPreviewViewType="texture-view"` for `CameraView` on Android and retest.
- Validate the exact Expo Camera SDK/React Native compatibility matrix for the current versions.
- Reduce camera remount churn by minimizing rapid state-driven `CameraView` re-instantiation.
- Keep diagnostics enabled while testing and retain logcat snapshots per test run for comparison.
