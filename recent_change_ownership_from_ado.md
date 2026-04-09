# INFO8665 Recent Change Ownership (from ADO notebook outputs)

Source analyzed: `ado_task_comment_automation.ipynb`

## User identity map from notebook output

- User 1: **Oluwafemi Lawal <olawal7308@conestogac.on.ca>**
- User 2: **Jarius Bedward <jbedward1640@conestogac.on.ca>**
- User 3: **Cemil Caglar Yapici <cyapici1058@conestogac.on.ca>**

## Relevant task ownership extracted from notebook

- **Task 73** (YOLO26 detector training): User 3
- **Task 76** (YOLO training environment/reproducibility): User 2
- **Task 77** (model evaluation): User 1
- **Task 95** (coin classification + inference wiring): User 2
- **Task 146** (accessibility labels in UI): User 3
- **Task 191** (user acceptance testing): User 1
- **Task 219** (temporal thresholding/live feed stabilization): User 1

## File-level responsibility for current INFO8665 changes

| File                                                  | Recommended responsible user     | Evidence task(s) | Notes                                                            |
| ----------------------------------------------------- | -------------------------------- | ---------------- | ---------------------------------------------------------------- |
| `scripts/10_train_detector.py`                        | **Cemil Caglar Yapici (User 3)** | Task 73          | Detector training hyperparameter updates.                        |
| `scripts/22_train_coin_classifier.py`                 | **Jarius Bedward (User 2)**      | Task 95          | Coin classifier training ownership.                              |
| `scripts/23_eval_coin_classifier.py`                  | **Oluwafemi Lawal (User 1)**     | Task 77          | Evaluation/validation ownership.                                 |
| `scripts/24_train_bill_classifier.py`                 | **Cemil Caglar Yapici (User 3)** | Task 73          | Training pipeline ownership (inferred from model training task). |
| `scripts/25_eval_bill_classifier.py`                  | **Oluwafemi Lawal (User 1)**     | Task 77          | Evaluation/metrics ownership.                                    |
| `scripts/40_download_sagemaker_champions.py`          | **Jarius Bedward (User 2)**      | Task 76          | Tooling/environment integration ownership.                       |
| `scripts/README.md`                                   | **Jarius Bedward (User 2)**      | Task 76          | Training tooling/setup documentation.                            |
| `training/README.md`                                  | **Jarius Bedward (User 2)**      | Task 76          | Environment/runbook documentation.                               |
| `training/app/main.py`                                | **Jarius Bedward (User 2)**      | Task 95          | Inference wiring + model routing ownership.                      |
| `training/app/requirements.txt`                       | **Jarius Bedward (User 2)**      | Task 76          | Runtime/dependency environment ownership.                        |
| `training/app/rn_app/components/ImageWithOverlay.tsx` | **Oluwafemi Lawal (User 1)**     | Task 219         | Live inference visualization tied to stabilization flow.         |
| `training/app/rn_app/components/WebLiveCamera.tsx`    | **Oluwafemi Lawal (User 1)**     | Task 219         | Live camera stream path for stabilization logic.                 |
| `training/app/rn_app/contexts/SettingsContext.tsx`    | **Cemil Caglar Yapici (User 3)** | Task 146         | UI/settings accessibility ownership.                             |
| `training/app/rn_app/screens/HistoryScreen.tsx`       | **Oluwafemi Lawal (User 1)**     | Task 191         | UAT-facing result/history behavior.                              |
| `training/app/rn_app/screens/InferenceScreen.tsx`     | **Oluwafemi Lawal (User 1)**     | Task 219         | Temporal stabilization/live inference behavior.                  |
| `training/app/rn_app/screens/SettingsScreen.tsx`      | **Cemil Caglar Yapici (User 3)** | Task 146         | Accessibility/settings UX ownership.                             |
| `training/app/rn_app/package.json`                    | **Cemil Caglar Yapici (User 3)** | Task 146         | Frontend dependency surface.                                     |
| `training/app/rn_app/package-lock.json`               | **Cemil Caglar Yapici (User 3)** | Task 146         | Frontend dependency lock updates.                                |
| `training/app/rn_app/tsconfig.json`                   | **Cemil Caglar Yapici (User 3)** | Task 146         | Frontend project config updates.                                 |

## Notes

- Where no exact task title directly names a file (for example, bill classifier training script), assignment is inferred from the nearest task ownership domain in notebook outputs.
- This report is based strictly on notebook outputs plus currently changed files in `git -C INFO8665 status --short`.
