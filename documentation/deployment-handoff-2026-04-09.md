# Deployment And Handoff Notes (2026-04-09)

## Scope
This note captures the requested workflow:

1. Preserve current mobile/offline work on a separate branch.
2. Move back to `dev` and apply only UI settings changes:
   - Hide debug panel and API config behind a new Debug Mode toggle.
   - Default Debug Mode to OFF.
   - Default app theme to light mode.
3. Deploy updated web app bundle to the AWS Auto Scaling Group (ASG).
4. Verify deployment and survivability with Spot instance replacement.

## Branching And Commits

### Mobile work preserved
- Branch created: `dev-mobile`
- Commit: `f1061c5`
- Commit message: `feat(mobile): preserve Android offline app work and diagnostics handoff`
- Related handoff doc: `documentation/mobile-work-handoff-2026-04-09.md`

### Mainline (`dev`) update
- Pulled latest from `origin/dev` (fast-forward).
- Commit: `93597c9`
- Commit message: `feat(rn): gate API/debug panels behind debug mode and default to light theme`

## Code Changes Implemented On `dev`

### 1) Settings model and defaults
File: `training/app/rn_app/contexts/SettingsContext.tsx`

- Replaced `showDebugPanel` setting with `debugModeEnabled`.
- Default settings now:
  - `debugModeEnabled: false`
  - `darkMode: false`
- Added migration behavior:
  - If legacy `showDebugPanel` exists and `debugModeEnabled` is missing, map old value to `debugModeEnabled`.

### 2) Inference screen gating
File: `training/app/rn_app/screens/InferenceScreen.tsx`

- API configuration panel/modal rendering is now gated by `settings.debugModeEnabled`.
- Debug panel rendering is now gated by `settings.debugModeEnabled`.

### 3) Settings UI
File: `training/app/rn_app/screens/SettingsScreen.tsx`

- Renamed toggle label to `Debug Mode`.
- Toggle now binds to `settings.debugModeEnabled`.

## Validation Performed

### Backend/API tests
Command:
```powershell
pytest training/app/tests/test_api.py -q
```
Result:
- `21 passed`

### RN TypeScript check
Command:
```powershell
cd training/app/rn_app
npx tsc --noEmit
```
Result:
- Fails due pre-existing unrelated typing issues.
- No new failures were introduced by this change set.

## AWS Deployment Procedure Used

### Environment
- Account: `REDACTED_ACCOUNT_ID`
- Region: `us-east-1`
- ASG: `smc-inference-asg`
- Launch template: `REDACTED_LAUNCH_TEMPLATE` (version `8`)
- Artifact bucket: `smc-phase2-artifacts-redacted`
- Active artifact key: `inference-app/current/inference_app.zip`

### Steps executed

1. Downloaded current deployed bundle and unpacked it.
2. Rebuilt RN web assets:
```powershell
cd training/app/rn_app
npx expo export --platform web --output-dir dist
```
3. Replaced RN static bundle inside deploy package.
4. Backed up current S3 artifact:
```powershell
aws s3 cp s3://smc-phase2-artifacts-redacted/inference-app/current/inference_app.zip `
  s3://smc-phase2-artifacts-redacted/inference-app/current/backups/inference_app-20260409_194140.zip
```
5. Uploaded updated artifact to the live `current` key.
6. Triggered ASG rolling replacement:
```powershell
aws autoscaling start-instance-refresh `
  --auto-scaling-group-name smc-inference-asg `
  --preferences MinHealthyPercentage=0,InstanceWarmup=180
```

### Deployment incident and fix (important)

The first refresh (`REDACTED_REFRESH_ID_1`) completed at ASG level, but runtime was not healthy:

- Target group showed `Target.FailedHealthChecks` on `:8080`.
- Diagnostics via SSM showed cloud-init `scripts-user` failed and `/opt/smc-inference/venv` was missing.
- Root cause: the uploaded zip had Windows `\` entry separators.
  - Linux `unzip` warned: `appears to use backslashes as path separators`.
  - In this bootstrap, `set -e` caused the script to stop on the non-zero unzip exit code.

Fix applied:

1. Repacked artifact with POSIX `/` zip entry names.
2. Backed up broken upload:
   - `inference-app/current/backups/inference_app-BROKEN-WINDOWSZIP-20260409_1955.zip`
3. Re-uploaded corrected artifact to:
   - `inference-app/current/inference_app.zip`
4. Triggered second ASG refresh:
   - `REDACTED_REFRESH_ID_2`
5. Verified final healthy state:
   - ASG instance: `REDACTED_INSTANCE_ID` (`InService`, `Healthy`)
   - Target group health: `healthy`
   - Service on instance: `ActiveState=active`, `SubState=running`
   - Local app check on instance: `curl http://127.0.0.1:8080/api/health` succeeded

## Spot Survivability Rationale

The service is resilient to Spot replacement because:

- ASG launches instances from a fixed launch template.
- Instance bootstrap/user-data pulls the app artifact from stable S3 key:
  - `s3://smc-phase2-artifacts-redacted/inference-app/current/inference_app.zip`
- On Spot interruption or replacement, a new instance rehydrates from that same key.
- Instance refresh is the same replacement mechanism used to verify this behavior.

## Rollback Procedure

If needed, rollback by restoring backup artifact to `current` and running another instance refresh:

```powershell
aws s3 cp `
  s3://smc-phase2-artifacts-redacted/inference-app/current/backups/inference_app-20260409_194140.zip `
  s3://smc-phase2-artifacts-redacted/inference-app/current/inference_app.zip

aws autoscaling start-instance-refresh `
  --auto-scaling-group-name smc-inference-asg `
  --preferences MinHealthyPercentage=0,InstanceWarmup=180
```
