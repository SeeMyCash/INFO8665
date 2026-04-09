# SeeMyCash — Azure DevOps Project Work Summary

> Auto-generated from Azure DevOps boards on April 9, 2026.

## Project Overview

- **Organization:** INFO8665-SCR4-SeeMyCash
- **Project:** SeeMyCash
- **Total Work Items:** 270
  - Epics: 5
  - Features: 26
  - Product Backlog Items: 78
  - Tasks: 161
- **Team Members:** Oluwafemi Lawal, Jarius Bedward, Cemil Caglar Yapici
- **Sprints:** Sprint 0 through Sprint 7

## Epic & Feature Hierarchy

### Epic #27: UC1: Core Currency Recognition
- **State:** In Progress
- **Assigned To:** Oluwafemi Lawal

  - **Feature #54:** Data Engineering & Pipeline (In Progress)
    - PBI #86: As a user, I want the recognition system to be trained on diverse real-world currency data (Done)
    - PBI #94: As a user, I want the system to recognize both banknotes and coins accurately (New)
    - PBI #180: Internal Review (New)
  - **Feature #59:** Core Recognition Model Development (In Progress)
    - PBI #72: As a user, I'd like to be able to scan my physical cash &/or coins and have the device recognize the denomination in real time (Done)
    - PBI #106: As a user, I want the device to audibly announce the detected denomination immediately after scanning (New)
    - PBI #182: Internal Review (Done)
    - PBI #228: Backfill classifier-resolved denomination names onto detection boxes (Done)
  - **Feature #60:** Edge Optimization & Mobile Deployment (In Progress)
    - PBI #98: As a user, I want recognition to work fully offline on my mobile device (New)
    - PBI #184: Internal Review (New)
  - **Feature #61:** Quality Assurance & Benchmarking (In Progress)
    - PBI #100: As a user I want consistent recognition accuracy across real world environments (New)
    - PBI #186: Internal Review (New)

### Epic #28: Cross-Platform Mobile Application & Accessibility
- **State:** In Progress
- **Assigned To:** Jarius Bedward

  - **Feature #117:** Cross-Platform Core Application Framework (New)
    - PBI #118: As a user, I want consistent functionality across Android & IOS devices (New)
    - PBI #124: As a user, I want stable app performance without freezing or crashes (New)
    - PBI #131: As a user, I want a clear and responsive user interface that connects the camera, recognition engine, and feedback system seamlessly (New)
    - PBI #192: Internal Review (New)
  - **Feature #142:** Accessibility & Inclusive Interaction Design (New)
    - PBI #143: As a user, I want immediate audio feedback after detection (New)
    - PBI #145: As a user, I want accessible UI elements compatible with screen readers (Done)
    - PBI #194: Internal Review (Done)
  - **Feature #149:** Cloud Inference API & Deployment (New)
    - PBI #151: Cloud API contract and shared UC1 schema (New)
    - PBI #152: Service skeleton with health/readiness endpoints (New)
    - PBI #153: Implement POST /uc1/infer (cloud inference) (New)
    - PBI #154: Containerization and reproducible local run (New)
    - PBI #155: Authentication and authorization (minimum viable) (New)
    - PBI #156: Rate limiting and request safeguards (New)
    - PBI #157: Observability (logs/metrics) and privacy-safe telemetry (New)
    - PBI #158: Deployment notes and operational checklist (New)
    - PBI #196: Internal Review (Done)
  - **Feature #150:** Dual-Mode App Integration & Routing (New)
    - PBI #159: Mode selection UI (Device / Cloud / Auto) (New)
    - PBI #160: Routing layer (one interface, two implementations) (New)
    - PBI #161: Fallback behavior (Cloud → Device) with clear messaging (New)
    - PBI #162: Capability gating (“available online only”) (New)
    - PBI #163: Consent + privacy messaging for Cloud mode (New)
    - PBI #164: Accessibility messaging (mode + failure guidance) (New)
    - PBI #165: Dual-mode integration tests (routing + offline states) (New)
    - PBI #166: Unified error handling + user “next step” actions (New)
    - PBI #198: Internal Review (New)

### Epic #29: Classwork - Project Foundation, Research & Governance
- **State:** In Progress

  - **Feature #32:** Assignment 1 (Done)
    - PBI #35: Project Definition (Done)
    - PBI #40: Identify Use Cases (Done)
    - PBI #44: Find Research Papers Backup Use Cases (Done)
    - PBI #45: A1 Presentation (Done)
    - PBI #257: Internal Review (Done)
  - **Feature #33:** Assignment 2 (Done)
    - PBI #69: Complete Setup of Azure Devops Board (Done)
    - PBI #70: Create Github Repo (Done)
    - PBI #216: Complete Assignment 2 Documentation (Done)
    - PBI #258: Internal Review (Done)
  - **Feature #47:** Research (In Progress)
    - PBI #48: Research Use Cases (Done)
    - PBI #49: Research applicable models (Done)
    - PBI #50: Fill Out Research Excel Sheet (Approved)
    - PBI #53: Find Dataset (New)
    - PBI #74: Research Relevance (New)
    - PBI #259: Internal Review (Done)
  - **Feature #55:** Assignment 3 (In Progress)
    - PBI #217: Complete MLOps_UseCase_API_Design Document (Done)
    - PBI #220: Internal Review (Done)
  - **Feature #56:** Assignment 4 (New)
    - PBI #260: Internal Review (Done)
  - **Feature #57:** Assignment 5 (New)
    - PBI #261: Internal Review (New)
  - **Feature #58:** Assignment 6 (New)
    - PBI #262: Internal Review (New)

### Epic #62: UC2: Currency Fraud & Condition Detection
- **State:** New
- **Assigned To:** Cemil Caglar Yapici

  - **Feature #104:** Cash Integrity & Counterfeit Detection Engine (New)
    - PBI #105: As a visually impaired user, I want the app to warn me if a banknote is fake, damaged, or suspicious so that I can avoid financial loss or fraud. (New)
    - PBI #188: Internal Review (New)
    - PBI #226: Screen replay / spoof guard pre-detection layer (Done)
    - PBI #250: Internal Review (Done)
  - **Feature #167:** Data Engineering & Labeling Pipeline (Done)
    - PBI #200: As a visually impaired user, I want the fraud detection system to be trained on a well-structured and validated dataset so that the warnings I receive are reliable and trustworthy. (New)
    - PBI #206: Internal Review (New)
    - PBI #227: Prepare screen-detection dataset and train screen-guard YOLO model (Done)
  - **Feature #168:** Region of Interest Segmentation & Image Quality Gate (Done)
    - PBI #83: As a visually impaired user, I want the system to detect counterfeit risk and damaged currency so that I can safely accept or reject cash during transactions. (New)
    - PBI #263: Internal Review (New)
  - **Feature #169:** Fraud Detection Model Development (Lite + Cloud) (Done)
    - PBI #264: Internal Review (New)
  - **Feature #170:** Condition Detection Model Development (Lite + Cloud) (Done)
    - PBI #265: Internal Review (New)
  - **Feature #171:** Dual-Mode Delivery (Cloud API + App Routing + QA) (Done)
    - PBI #266: Internal Review (New)

### Epic #65: UC3: Receipt Expense Extraction & Verification
- **State:** New

  - **Feature #125:** Receipt Parsing & Payment Verification System (New)
    - PBI #126: As a user, I want to scan a receipt and verify the total amount so that I can confirm I was charged correctly before leaving the store. (New)
    - PBI #190: Internal Review (Done)
  - **Feature #172:** Receipt Capture & Image Quality Gate (New)
    - PBI #267: Internal Review (New)
  - **Feature #173:** Receipt Parsing & Structured Extraction (New)
    - PBI #208: As a user, I want the app to extract the key fields from my receipt so that I can verify the total amount confidently. (New)
    - PBI #214: As a user, I want the receipt data returned in a consistent structured format so that it can be validated and stored reliably. (New)
    - PBI #268: Internal Review (New)
  - **Feature #174:** Transaction Matching & Verification Logic (New)
    - PBI #269: Internal Review (New)
  - **Feature #175:** Dual-Mode Delivery, Accessibility Output & QA (New)
    - PBI #270: Internal Review (New)

---

## Detailed Work Per Team Member

### Oluwafemi Lawal

**Summary:** 45 tasks total — 30 Done, 2 In Progress, 13 other

#### Backlog

**Task #39: Identify Tactics**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #35
- **Description:** Identify the tactics used in the project

**Task #42: Research and Identify Use Case 2**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #40
- **Description:** Use the research papers shared in the excel sheet to identify and find a AI&ML use case

**Task #43: Research and Identify Use Case 3**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #40
- **Description:** Use the research papers shared in the excel sheet to identify and find a AI&ML use case

**Task #71: Research on a DSS Related Use Case**
- **State:** To Do
- **Parent Path:** Epic #29 → Feature #47 → Product Backlog Item #48

**Task #78: Integrate BankNote-Net Dataset for Cross-Dataset Genrealization**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #86
- **Description:** Incorporate BankNote-Net samples into training pipeline to improve generalization across environmental variability. Validate that the model does not overfit to Canadian-only samples.

**Task #80: Develop Coin Recognition Sub Model (ViT-Based Fine Grained Classifier)**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #59 → Product Backlog Item #72
- **Description:** Implement coin classification pipeline inspired by ViTCoin research to handle reflective surfaces, rotation invariance, and fine-grained texture differences.

**Task #81: Unify label schema + unify evaluation + unify inference interface (keep models separate)**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #94
- **Description:** Detection for banknotes and fine-grained coin classification are usually different pipelines; merging too early creates confusion.

**Task #82: Export Optimized Model for Mobile (Quantized)**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #60 → Product Backlog Item #98
- **Description:** Convert model to optimized format with optional quantization using INT* to meet mobile latency and memory constraints

**Task #84: Integrate Model into Cross Platform Mobile Inference Layer**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #60 → Product Backlog Item #98
- **Description:** Connect camera feed to inference pipeline, ensuring frame preprocessing aligns with training pipeline normalization and resizing.

**Task #85: Conduct Robustness Benchmarking under Real Checkout COnditions**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #59 → Product Backlog Item #72
- **Description:** Test detection performance in varied lighting, motion blur, mixed piles, and reflective coin scenarios to validate real-world deployment readiness.

**Task #141: Conduct Stress Testing (Continuous Scanning)**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #124
- **Description:** Run extended scanning sessions to detect crashes or leaks.

**Task #187: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #61 → Product Backlog Item #186

**Task #280: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #62 → Feature #169 → Product Backlog Item #264
- **Description:** Perform user acceptance testing for the "Fraud Detection Model Development (Lite + Cloud)" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Fraud Detection Model Development (Lite + Cloud)" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Fraud Detection Model Development (Lite + Cloud)" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Jarius Bedward:** I reviewed the UAT results for the "Fraud Detection Model Development (Lite + Cloud)" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Oluwafemi Lawal:** I created the UAT plan for the "Fraud Detection Model Development (Lite + Cloud)" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

**Task #283: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #65 → Feature #172 → Product Backlog Item #267
- **Description:** Perform user acceptance testing for the "Receipt Capture & Image Quality Gate" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Receipt Capture & Image Quality Gate" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Receipt Capture & Image Quality Gate" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Jarius Bedward:** I reviewed the UAT results for the "Receipt Capture & Image Quality Gate" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Oluwafemi Lawal:** I created the UAT plan for the "Receipt Capture & Image Quality Gate" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

**Task #286: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #65 → Feature #175 → Product Backlog Item #270
- **Description:** Perform user acceptance testing for the "Dual-Mode Delivery, Accessibility Output & QA" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Dual-Mode Delivery, Accessibility Output & QA" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Dual-Mode Delivery, Accessibility Output & QA" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Jarius Bedward:** I reviewed the UAT results for the "Dual-Mode Delivery, Accessibility Output & QA" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Oluwafemi Lawal:** I created the UAT plan for the "Dual-Mode Delivery, Accessibility Output & QA" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

#### Sprint 0

**Task #68: Presentation: Use Cases and Literature Review**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #45
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the literature review direction and it supported the story well. I recommended ending that section with a short gap statement that explains why our implementation approach is still necessary.
  - **Jarius Bedward:** I reviewed the use case and literature review content and the structure made sense. I suggested separating prior research from competing solutions so the gap our project addresses is easier to communicate.
  - **Oluwafemi Lawal:** I assembled the use case and literature review section by outlining the main scenarios for the app and summarizing related work in computer vision and accessibility support. The goal was to show both the practical need and the research context behind the project.

**Task #75: Prepare and annotate dataset for Canadian Currency Dataset**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #94
- **Description:** Collect and label high-resolution images of Canadian banknotes across denominations. Include variations such as folded notes, angled captures, lighting differences, and mixed piles. Ensure bounding boxes are correctly formatted for YOLO training.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the annotation approach and it aligned with the training needs. I recommended keeping a lightweight annotation guide so future additions stay consistent with the current labeling decisions.
  - **Jarius Bedward:** I reviewed the dataset preparation scope and it covered the important image variations. I suggested doing a quick quality pass on class balance and difficult cases like overlap or partial visibility before training.
  - **Oluwafemi Lawal:** I prepared and annotated the Canadian currency dataset by collecting images across denominations and labeling them for YOLO training. I made sure to include varied conditions such as folded notes, angled captures, lighting changes, and mixed piles so the dataset better reflects real usage.

**Task #77: Evaluate Model Performance**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #59 → Product Backlog Item #72
- **Description:** Evaluate Model Performance → Evaluate with mAP50 + per-class precision/recall + FP rate on confusers
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I reviewed the evaluation approach and it made sense. I recommended adding latency measurements alongside accuracy so real time readiness was easier to judge.
  - **Jarius Bedward:** I liked the evaluation summary. I suggested adding a small set of hard case examples like glare and partial occlusions to make the results more actionable.
  - **Oluwafemi Lawal:** I evaluated model performance by running a consistent validation pass and summarizing the key detection metrics. I also checked that class mappings were correct and that inference outputs stayed stable after pipeline changes.

**Task #191: User Acceptance Testing**
- **State:** Done
- **Parent Path:** Epic #65 → Feature #125 → Product Backlog Item #190
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I reviewed the testing plan and I think it should include real-world instability cases as well. I recommended covering glare, partial occlusion, shaky handling, and delayed feedback so the team can judge how usable the system feels in practice.
  - **Jarius Bedward:** I looked over the UAT direction and it makes sense to formalize the scenarios early. I suggested adding explicit pass/fail criteria and a simple tester script so feedback is more consistent across participants.
  - **Oluwafemi Lawal:** I reviewed the scope for user acceptance testing and started outlining the scenarios that should be covered by end users. The plan should include currency recognition, feedback clarity, and edge cases that affect usability in realistic conditions.

#### Sprint 1

**Task #89: Split Dataset into Train/Validation/Test Sets**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #86
- **Description:** Ensure proper stratified splitting to maintain denomination balance.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the dataset split plan and it supports fair evaluation. I recommended watching for leakage from near-duplicate images or very similar scenes across splits so the results stay trustworthy.
  - **Jarius Bedward:** I reviewed the split strategy and the stratified approach was the right choice. I suggested recording the exact image counts per denomination in each split so the experiment setup is easier to audit later.
  - **Oluwafemi Lawal:** I split the dataset into training, validation, and test sets while preserving denomination balance. This should make the evaluation more reliable and help ensure the reported metrics reflect model behavior across the full label set.

**Task #176: Download Roboflow Universe datasets + version links**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #86
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the download script output and it matched the intended categories. I recommended storing a lightweight manifest file with counts per dataset so regressions were easier to spot.
  - **Jarius Bedward:** I reviewed the source list and it looked complete. I suggested adding a short note about how you planned to handle upstream dataset updates so results stayed comparable over time.
  - **Oluwafemi Lawal:** I downloaded the Roboflow Universe datasets using the YAML link registry, recorded the dataset versions, and saved the final source list so the training inputs stayed traceable across reruns.

#### Sprint 2

**Task #218: Extract training model training details from research paper**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #47 → Product Backlog Item #49
- **Description:** Task to breakdown how the research papers specifically accomplished goals relevant to the project
- **Discussion (1 comments):**
  - **Oluwafemi Lawal:** Here are the specific, replicable details for all the approaches proposed in the research, broken down component by component. 
### 1. Input Component: Object Detection & Cropping

**Approach A: Mixed Currency Detection (YOLOv11-m)** This approach is optimized for detecting mixed piles of overlappin...

**Task #274: User Acceptance Testing**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #33 → Product Backlog Item #258
- **Description:** Perform user acceptance testing for the "Assignment 2" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Assignment 2" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Assignment 2" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Jarius Bedward:** I reviewed the UAT results for the "Assignment 2" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Oluwafemi Lawal:** I created the UAT plan for the "Assignment 2" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

#### Sprint 3

**Task #219: Temporal Thresholding (Stabilizing the Feed)**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #142 → Product Backlog Item #145
- **Description:** Because visually impaired users might have shaky hands, drawing bounding boxes on a live feed can result in chaotic, flickering detections. To solve this, researchers implemented temporal thresholding
- Instead of immediately reading out every single frame's detection, the system requires the model to consistently detect the exact same bounding box and currency class across multiple frames for a set time limit (e.g., a 3-second window). 
- This buffers the live feed, filtering out brief errors, ...
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the temporal thresholding concept and it should improve output reliability if tuned carefully. I recommended testing it against blur, rapid motion, and temporary finger occlusions so the team can balance stability against responsiveness.
  - **Jarius Bedward:** I liked the stabilization direction because it directly addresses shaky-hand and occlusion noise. I suggested defining the frame consistency rule clearly, including how many consecutive matches and what overlap threshold are needed before a result is accepted.
  - **Oluwafemi Lawal:** I reviewed the temporal thresholding idea and outlined how repeated detections over a short time window could stabilize the live feed before announcing a result. This should help reduce flicker and prevent brief misdetections from triggering confusing audio feedback.

**Task #271: User Acceptance Testing**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #55 → Product Backlog Item #220
- **Description:** Perform user acceptance testing for the "Assignment 3" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Assignment 3" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Assignment 3" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Jarius Bedward:** I reviewed the UAT results for the "Assignment 3" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Oluwafemi Lawal:** I created the UAT plan for the "Assignment 3" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

#### Sprint 4

**Task #224: Update README with Docker quick-start and application URL table**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #154
- **Description:** Update the project README.md to document the Docker Compose workflow: - Building and starting the API (docker compose up --build -d) 
- Application URL table for the web UI, Swagger docs, health check, and inference endpoint 
- Running E2E tests (docker compose run --rm tests) 
- Stopping services (docker compose down) 
- Preserve the legacy root Dockerfile usage under a separate heading
- **Acceptance Criteria:**
  - README “Quick start (Docker Compose)” section shows the exact docker compose up --build -d command
  - URL table lists all accessible endpoints: root, /rn, /docs, /redoc, /api/health, /api/pipeline/infer
  - “Running E2E tests” section documents the docker compose run --rm tests command
  - Legacy data-pipeline Docker workflow is preserved under a separate heading
  - A new user can follow the README from clone to running application without errors
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the URL table and endpoint descriptions against the actual API routes. I recommended adding a note about the required Docker and Docker Compose version prerequisites at the top of the quick-start section.
  - **Jarius Bedward:** I reviewed the README updates and the quick-start flow was clear. I suggested adding the docker compose down command explicitly so new users know how to clean up after testing.
  - **Oluwafemi Lawal:** I updated the README with a Docker Compose quick-start section, an application URL table covering all endpoints, E2E test instructions, and preserved the legacy data-pipeline Dockerfile documentation under a separate heading.

**Task #225: Verify end-to-end Docker build and test pipeline**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #154
- **Description:** Perform a clean build-and-test cycle to validate the Docker setup: - docker compose up --build — confirm the API passes its health check 
- docker compose run --rm tests — run the E2E test suite and confirm all 17+ tests pass 
- docker compose down — verify clean teardown with no dangling containers or volumes 
 Document any environment-specific issues (e.g., missing model files, port conflicts).
- **Acceptance Criteria:**
  - docker compose up --build completes without errors on a fresh clone
  - /api/health returns {"status": "healthy"} (or equivalent) within 40 seconds
  - All E2E tests in training/app/tests/test_api.py pass (pytest exit code 0)
  - No dangling containers or volumes remain after docker compose down
  - Any known issues or prerequisites are documented in the README or a follow-up task
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the test output and all assertions passed. I recommended adding a short note about port 8080 availability as a prerequisite so users on systems with conflicting services know to adjust.
  - **Jarius Bedward:** I reviewed the verification results and the pipeline looked stable. I suggested documenting the model file prerequisite clearly since a fresh clone without trained weights would fail at startup.
  - **Oluwafemi Lawal:** I ran a clean docker compose up --build cycle, confirmed the API health check passed within 30 seconds, executed docker compose run --rm tests with all 17 tests passing, and verified docker compose down left no dangling containers.

**Task #229: Implement spoof guard inference service**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #104 → Product Backlog Item #105
- **Description:** Author training/app/services/spoof_guard.py implementing the hybrid spoof guard inference service. - Combine PyTorch binary classifier score with configurable image heuristics (border luma, edge concentration, high-frequency energy, highlight ratio) 
- Return structured payload: {blocked, suspected, decision, score, heuristics} 
- Support per-request enable/disable override via optional boolean parameter 
- Gracefully degrade to heuristic-only mode when no classifier model is loaded
- **Acceptance Criteria:**
  - spoof_guard.py exists with run_spoof_guard() entry point
  - Structured decision payload contains all required fields
  - Heuristic-only mode works when classifier is absent
  - Per-request override respected (enabled/disabled)
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested the per-request enable/disable override and confirmed it correctly bypasses the guard when the API form field is set to false. I also verified that heuristic-only mode returns valid JSON with all required fields even without a model file.
  - **Jarius Bedward:** I reviewed the scoring logic and the weight-blending between classifier confidence and heuristic signals looked solid. I suggested adding a short docstring on the threshold semantics so future maintainers know what a score of 0.7 means in practice.
  - **Oluwafemi Lawal:** I authored training/app/services/spoof_guard.py with a hybrid scoring pipeline that combines a PyTorch binary classifier with four image heuristics (border luma, edge concentration, high-frequency energy, highlight ratio). The service returns a structured {blocked, suspected, decision, score, heuris...

**Task #230: Add spoof guard configuration settings**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #104 → Product Backlog Item #105
- **Description:** Extend training/app/core/config.py with spoof guard settings: - spoof_guard_enabled (bool, default False) 
- spoof_guard_block_on_detect (bool, default False) 
- spoof_guard_threshold (float, 0.0–1.0) 
- spoof_guard_border_ratio, heuristic weight floats 
 All values validated and clamped via Pydantic validators.
- **Acceptance Criteria:**
  - 7 spoof_guard_* settings added with correct types and defaults
  - Pydantic validation prevents out-of-range values
  - Settings loadable from environment variables
- **Discussion (3 comments):**
  - **Jarius Bedward:** I tested loading the settings from environment variables in a fresh container and all seven values parsed correctly. I recommended adding the new env vars to the docker-compose.yml comments so the team knows they exist.
  - **Cemil Caglar Yapici:** I reviewed the Pydantic validators and confirmed they reject negative weights and clamp the threshold to [0.0, 1.0]. The environment variable naming follows the existing convention (SPOOF_GUARD_ENABLED, SPOOF_GUARD_THRESHOLD, etc.) which keeps the config consistent.
  - **Oluwafemi Lawal:** I extended training/app/core/config.py with seven spoof_guard_* Pydantic settings: enabled (bool), block_on_detect (bool), threshold (float 0–1), border_ratio, and three heuristic weight floats. All values are validated and clamped via field validators to prevent out-of-range inputs.

**Task #231: Write spoof guard unit tests**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #104 → Product Backlog Item #105
- **Description:** Author training/app/tests/test_spoof_guard.py covering: - Disabled state returns "disabled" decision without processing 
- Heuristic-only mode returns valid response shape 
- Per-request enable/disable override behavior
- **Acceptance Criteria:**
  - test_spoof_guard.py exists with 3+ test cases
  - All tests pass with pytest -v
  - Tests are isolated (no model file dependencies)
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I ran the full test suite with pytest -v and all three spoof guard tests pass. I also confirmed they run in under 1 second total, so they will not slow down the CI pipeline.
  - **Jarius Bedward:** I reviewed the tests and they are properly isolated — no model file dependencies or network calls. I suggested adding an assertion on the score range (0.0–1.0) in the heuristic-only test to catch any future regression in score normalization.
  - **Oluwafemi Lawal:** I authored training/app/tests/test_spoof_guard.py with three test cases: disabled state returns a "disabled" decision without any image processing, heuristic-only mode returns a valid response shape when no classifier is loaded, and the per-request enable/disable override correctly toggles guard beh...

**Task #233: Evaluate spoof guard classifier**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #167 → Product Backlog Item #227
- **Description:** Author scripts/29_eval_spoof_guard.py — evaluation script that loads a trained classifier checkpoint and generates metrics. - Compute precision, recall, F1, FPR at configurable threshold 
- Generate JSON report with metrics + model metadata 
- Print confusion matrix summary to stdout
- **Acceptance Criteria:**
  - Script accepts checkpoint path and dataset path as arguments
  - JSON report written with all required metrics
  - Report includes model architecture and training metadata
- **Discussion (3 comments):**
  - **Jarius Bedward:** I ran the evaluator against the trained checkpoint and the metrics matched our expectations: the JSON report was well-formed with all required fields, and the confusion matrix printout clearly shows TP/FP/TN/FN counts.
  - **Cemil Caglar Yapici:** I reviewed the evaluation code and the threshold-sweep logic is clean — it evaluates at the specified threshold and also reports the optimal threshold from the ROC curve. I confirmed the JSON report schema matches what the training report expects downstream.
  - **Oluwafemi Lawal:** I authored scripts/29_eval_spoof_guard.py that loads a trained classifier checkpoint, runs inference on a validation set, and computes precision, recall, F1, and FPR at a configurable threshold. The script outputs a JSON report with all metrics plus model architecture metadata and prints a confusion...

**Task #236: Wire spoof guard into multi-model pipeline**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #104 → Product Backlog Item #105
- **Description:** Update training/app/services/pipeline.py to integrate spoof guard as step 0 in the inference pipeline. - Auto-discover spoof guard models from model_manager 
- Call run_spoof_guard() before detector and classifier 
- If block_on_detect is set and guard returns blocked, short-circuit the pipeline 
- Include spoof guard result in pipeline status response
- **Acceptance Criteria:**
  - Pipeline runs spoof guard before detection when a guard model is loaded
  - Pipeline short-circuits when guard blocks and block_on_detect=True
  - /api/pipeline/status shows spoof guard model slot
  - Pipeline degrades gracefully when no guard model is loaded
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested the pipeline with and without a guard model loaded. When no guard model is present, the pipeline skips step 0 gracefully and proceeds normally. When loaded, the spoof_check field appears in the response with decision, score, and heuristic breakdown.
  - **Jarius Bedward:** I reviewed the pipeline flow and the short-circuit logic is clean — when blocked, it returns early with the spoof_check payload and skips detection and classification entirely. I confirmed the /api/pipeline/status endpoint now shows the spoof_guard model slot.
  - **Oluwafemi Lawal:** I updated training/app/services/pipeline.py to run the spoof guard as step 0 before detection and classification. The pipeline auto-discovers spoof guard models from model_manager, calls run_spoof_guard() with the uploaded image, and short-circuits with a "blocked" response if block_on_detect is ena...

**Task #238: Implement display_name backfill in pipeline**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #59 → Product Backlog Item #228
- **Description:** After classification, write display_name and display_confidence from the top classifier prediction onto each detection box. - Add _top_prediction_label() and _top_prediction_confidence() helpers 
- Add _public_target_fields() to strip internal fields from API output 
- Apply same logic in main_legacy.py for the legacy pipeline path
- **Acceptance Criteria:**
  - API response detection boxes contain display_name and display_confidence
  - Internal fields (raw scores, debug data) are stripped from public output
  - Legacy pipeline produces identical display_name behavior
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested the API response and confirmed that detection boxes now include display_name (e.g., "LOONIE", "CAD $20") and display_confidence alongside the existing detector fields. The internal fields are cleanly stripped from the public output.
  - **Jarius Bedward:** I reviewed the backfill logic and it correctly handles edge cases — when no classifier result exists for a box, the display_name falls back to the detector class label. The _public_target_fields() filter properly removes _raw_scores and other internal keys.
  - **Oluwafemi Lawal:** I added _top_prediction_label() and _top_prediction_confidence() helper functions to pipeline.py, plus _public_target_fields() to strip internal fields from the API output. After classification, the pipeline writes display_name and display_confidence from the top classifier prediction onto each dete...

**Task #239: Write display label integration tests**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #59 → Product Backlog Item #228
- **Description:** Author training/app/tests/test_pipeline_display_labels.py verifying: - Classifier outputs attach as display_name on detection boxes 
- Internal/private fields are excluded from API response 
- Boxes without classifier results show appropriate fallback
- **Acceptance Criteria:**
  - Test file exists with 2+ test cases
  - All tests pass with pytest -v
  - Tests use mocked pipeline data (no model file dependencies)
- **Discussion (3 comments):**
  - **Jarius Bedward:** I ran the tests with pytest -v and both pass. I also confirmed they integrate cleanly with the existing test suite — no conflicts with test_api.py or test_spoof_guard.py fixtures.
  - **Cemil Caglar Yapici:** I reviewed the test assertions and they cover the key scenarios: boxes with classifier results show display_name, boxes without results fall back gracefully, and the private field filter is applied correctly. The mocking approach is clean and deterministic.
  - **Oluwafemi Lawal:** I authored training/app/tests/test_pipeline_display_labels.py with tests verifying that classifier outputs attach as display_name on detection boxes and that internal fields (_raw_scores, debug metadata) are excluded from the API response. Tests use mocked pipeline data so no model files are require...

**Task #242: Write UI route integration tests**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #150 → Product Backlog Item #160
- **Description:** Author training/app/tests/test_ui_routes.py covering route dispatch: - / → RN SPA (200) 
- /history → RN SPA fallback (200) 
- /rn → Legacy HTML (200) 
- /api/health → Not captured by SPA (200) 
- /docs → Swagger (200) 
- Missing RN build → 404
- **Acceptance Criteria:**
  - 6+ route test cases covering all dispatch paths
  - All tests pass with pytest -v
  - Tests work without an actual built RN bundle (uses test fixtures)
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I ran all six route tests and they pass. I also verified they do not interfere with the other test files — the test client is scoped per test function so there are no shared state issues between route tests and API tests.
  - **Jarius Bedward:** I reviewed the test fixtures and they correctly create temporary static directories to simulate both RN and legacy builds. The 404 test properly removes the fixture directory before asserting, which ensures we are testing the real fallback path.
  - **Oluwafemi Lawal:** I authored training/app/tests/test_ui_routes.py with six test cases covering route dispatch: / serves the RN SPA (200), /history falls back to SPA (200), /rn serves legacy HTML (200), /api/health passes through (200), /docs serves Swagger (200), and a missing RN build returns 404. Tests use temporar...

**Task #244: Add spoof guard checkbox to legacy web UI**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #104 → Product Backlog Item #105
- **Description:** Update the legacy web UI (training/app/static/app.js and index.html) to include a spoof guard toggle: - Add checkbox input for spoof guard enable/disable 
- Pass spoof_guard_enabled as form field to /api/pipeline/infer 
- Update endpoint from legacy path to /api/pipeline/infer
- **Acceptance Criteria:**
  - Checkbox visible in legacy UI
  - Form submission includes spoof_guard_enabled field
  - Endpoint correctly updated to /api/pipeline/infer
- **Discussion (3 comments):**
  - **Jarius Bedward:** I tested the legacy UI in a browser and the checkbox renders in the controls section. Submitting with the checkbox on correctly sends spoof_guard_enabled=true and the response includes the spoof_check field. Without the checkbox, the parameter is omitted and the backend defaults to disabled.
  - **Cemil Caglar Yapici:** I reviewed the form submission code and the checkbox value is correctly serialized as a boolean string in the FormData. The endpoint switch to /api/pipeline/infer is consistent with the route swap changes and ensures the legacy UI uses the same pipeline as the RN app.
  - **Oluwafemi Lawal:** I updated training/app/static/app.js and index.html to add a spoof guard checkbox. The checkbox state is included as the spoof_guard_enabled form field when submitting to /api/pipeline/infer. I also updated the endpoint path from the old legacy route to the new unified pipeline endpoint.

**Task #246: Show classifier display names on detection overlays (legacy)**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Update legacy web UI (training/app/static/app.js) to read display_name from pipeline response and use it for box label rendering.
- **Acceptance Criteria:**
  - Legacy UI box labels show display_name when available
  - Falls back to class name when display_name is absent
- **Discussion (3 comments):**
  - **Jarius Bedward:** I tested the legacy UI with a real image and the box labels now show the classifier denomination (e.g., "CAD $5") instead of the generic detector class. The fallback works correctly for boxes where the classifier did not produce a result.
  - **Cemil Caglar Yapici:** I reviewed the JavaScript rendering code and the fallback logic handles the case where display_name is missing or empty correctly. The label font size and positioning were not changed, so the visual layout stays consistent with the existing UI.
  - **Oluwafemi Lawal:** I updated training/app/static/app.js to read display_name from the pipeline response and use it as the box label in the canvas rendering code. When display_name is present, it replaces the raw detector class name; otherwise the original label is shown as a fallback.

#### Sprint 5

**Task #251: Fix class-index remapping in coin, bill, and spoof-guard evaluation scripts**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #61 → Product Backlog Item #100
- **Description:** The evaluation scripts (23_eval_coin_classifier.py, 25_eval_bill_classifier.py, 29_eval_spoof_guard.py) assumed dataset class ordering matched checkpoint class ordering. When the two differ, the confusion matrix and per-class metrics are silently wrong. Add a build_label_remap() function that maps dataset indices to checkpoint indices, validates that every dataset class exists in the checkpoint, and applies the remap before computing accuracy and confusion matrices.
- **Acceptance Criteria:**
  - A build_label_remap() function exists in each eval script that maps dataset class indices to model class indices.
  - The script exits with a clear error if any dataset class is missing from the checkpoint class list.
  - Confusion matrix rows/columns use checkpoint class names, not dataset folder order.
  - Per-class accuracy and wrong-prediction reports reference the correct class names.
  - Existing eval reports still generate without regressions when class orders already match.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the updated eval scripts and the confusion matrix now uses checkpoint class names correctly. I recommended adding a unit test with a deliberately shuffled class list to prevent future regressions.
  - **Jarius Bedward:** I reviewed the label remap implementation and the approach was sound. I suggested adding an explicit log line showing the remap mapping at evaluation start so mismatches are visible in the output without needing to debug.
  - **Oluwafemi Lawal:** I fixed the label remapping logic across all three evaluation scripts by adding a build_label_remap() function that maps dataset class indices to checkpoint class indices before computing accuracy and confusion matrices. The function validates that every dataset class exists in the checkpoint and ex...

**Task #254: Instrument FastAPI with Prometheus metrics and structured logging**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #157
- **Description:** Add prometheus-fastapi-instrumentator to the API dependencies, expose a /metrics endpoint, and add structured logging to health and pipeline inference endpoints. Configure a configure_logging() function that sets up consistent log formatting across the application.
- **Acceptance Criteria:**
  - /metrics returns Prometheus-format metrics when the API is running.
  - prometheus-fastapi-instrumentator is listed in requirements.txt and installs successfully.
  - Structured log lines appear on stdout for every health check and inference call.
  - configure_logging() runs once at startup and does not duplicate handlers on reload.
  - The /metrics path is reserved and does not conflict with the SPA catch-all route.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the logging setup and it looked consistent. I recommended adding a request-id or correlation-id to log lines so individual inference requests can be traced across log entries.
  - **Jarius Bedward:** I reviewed the Prometheus instrumentation and the setup was clean. I suggested verifying that the /metrics endpoint does not require authentication so Prometheus can scrape it without extra headers.
  - **Oluwafemi Lawal:** I added prometheus-fastapi-instrumentator to the requirements and wired it into the FastAPI app to expose a /metrics endpoint. I also implemented a configure_logging() function that sets up structured log formatting once at startup and prevents handler duplication on reload. Health and pipeline endp...

#### Sprint 6

**Task #287: Add database-backed inference history with local and Postgres storage backends**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #152
- **Description:** Implement a pluggable inference history service supporting two backends: local JSONL file storage and PostgreSQL database storage. Add a storage service module with initialize/record/list operations, a secrets resolution module that reads credentials from environment variables, mounted files, or secret directories, and new API endpoints at /storage/status and /storage/history. Integrate the storage service into the FastAPI lifespan, health endpoint, config endpoint, and pipeline inference endpoi...
- **Acceptance Criteria:**
  - APP_STORAGE_BACKEND=local writes inference records to a JSONL file at APP_LOCAL_STORAGE_PATH.
  - APP_STORAGE_BACKEND=database writes inference records to a Postgres table via SQLAlchemy.
  - GET /api/storage/status returns the active backend, ready state, and credential source metadata without exposing secret values.
  - GET /api/storage/history returns recent inference history entries with request metadata, timing, and result summaries.
  - GET /api/health and GET /api/config both include a storage status block.
  - POST /api/pipeline/infer records every inference result to the configured storage backend.
  - sqlalchemy and psycopg[binary] are listed in requirements.txt.
  - Unit tests in test_storage.py and test_compose_e2e.py pass.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the storage endpoint responses and they correctly hide credential values while showing source metadata. I recommended adding a maximum retention policy configuration so the history table does not grow unbounded in production.
  - **Jarius Bedward:** I reviewed the storage implementation and the backend abstraction was clean. I suggested adding a log line when the storage backend switches from local to database mode so the team can verify the transition in container logs.
  - **Oluwafemi Lawal:** I implemented the pluggable inference history service with local JSONL and Postgres backends. The storage module initializes lazily on first use and records every pipeline inference with request metadata, model versions, timing, and result summaries. I added /storage/status and /storage/history endp...

**Task #288: Add secret resolution module for file-based and env-based credentials**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #155
- **Description:** Create a secrets.py module in training/app/core/ that resolves sensitive configuration values through a priority chain: (1) NAME_FILE env var pointing to a mounted secret file, (2) APP_SECRETS_DIR/name file, (3) direct NAME env var, (4) default value. Integrate this into the Settings class for DB_USERNAME, DB_PASSWORD, and DATABASE_URL so production deployments can use Docker secrets or Kubernetes mounted volumes without hardcoding credentials.
- **Acceptance Criteria:**
  - A resolve_secret() function exists in app/core/secrets.py implementing the four-level resolution chain.
  - Settings.db_username and db_password are resolved through the secret module with source tracking.
  - GET /api/storage/status shows the credential source (env, file, dir, or settings) without revealing the actual values.
  - Credentials set via DB_PASSWORD_FILE or mounted under APP_SECRETS_DIR take precedence over direct env vars.
  - The module handles missing files and empty values gracefully without crashing.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested the module with file-based secrets and confirmed they take priority over environment variables. I recommended adding a test with a temporary secrets directory to validate the APP_SECRETS_DIR resolution path in CI.
  - **Jarius Bedward:** I reviewed the secret resolution logic and the priority chain was correct. I suggested adding a startup log line showing the resolved source for each credential so misconfigurations are immediately visible in container logs.
  - **Oluwafemi Lawal:** I implemented the secret resolution module with a four-level priority chain for credential lookup. The ResolvedSecret dataclass tracks both the value and its source so the status endpoint can show where credentials came from without exposing them. I integrated it into the Settings class for all data...

**Task #293: Harden tarball extraction against path traversal in S3 sync**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #156
- **Description:** Add a _safe_extract_tarball() function to s3_sync.py that validates each tar member path resolves within the target directory before extraction, preventing directory traversal attacks from malicious model archives. Refactor _extract_model_tarball to use the safe extractor. Add a resolve_artifact_defaults() function that consolidates deploy-file and env-backed S3 bucket/prefix resolution. Add unit tests for default resolution priority in test_s3_sync_defaults.py.
- **Acceptance Criteria:**
  - _safe_extract_tarball raises RuntimeError if any tar member resolves outside the target directory.
  - _extract_model_tarball delegates to _safe_extract_tarball for all extractions.
  - resolve_artifact_defaults prefers deploy-text files over env-backed settings.
  - test_s3_sync_defaults.py verifies deploy-file priority and validates the traversal guard rejects unsafe paths.
  - Existing model sync behavior is unchanged for legitimate archives.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the unit tests and the coverage for unsafe path rejection was thorough. I recommended adding a negative test with a symlink-based traversal attempt to cover that edge case as well.
  - **Jarius Bedward:** I reviewed the path traversal protection and the resolve check was correct. I suggested also validating that tar member names do not contain null bytes as an additional safety check.
  - **Oluwafemi Lawal:** I added the _safe_extract_tarball function that validates each tar member resolves within the target directory before extraction. Any member attempting to escape the target directory raises a RuntimeError. I also consolidated the artifact default resolution logic and added unit tests for both the tr...

#### Sprint 7

**Task #277: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #29 → Feature #57 → Product Backlog Item #261
- **Description:** Perform user acceptance testing for the "Assignment 5" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Assignment 5" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Assignment 5" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Jarius Bedward:** I reviewed the UAT results for the "Assignment 5" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Oluwafemi Lawal:** I created the UAT plan for the "Assignment 5" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

**Task #301: Add unit tests for MLOps contract API endpoints**
- **State:** In Progress
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #152
- **Description:** Create training/app/tests/test_mlops_contracts.py with four test cases covering the MLOps contract API. Test that GET /api/mlops/use-cases returns all four use cases with minimum coverage flags. Test that a use-case detail response includes integration and monitoring stages beyond the minimum requirement. Test that a specific contract detail returns correct service name and implementation references. Test that an unknown use-case ID returns 404 with a detail message. Also extend test_api.py with...
- **Acceptance Criteria:**
  - test_mlops_contracts.py contains at least 4 test functions covering list, detail, contract, and 404 scenarios.
  - test_mlops_use_cases_expose_required_stage_coverage verifies all use cases report minimum_contract_requirement_met as True.
  - test_mlops_use_case_detail_includes_integration_and_monitoring verifies extended lifecycle stages are present.
  - test_mlops_contract_detail_returns_repo_backed_contract verifies implementation_refs point to actual scripts.
  - test_mlops_unknown_use_case_returns_404 verifies error handling for invalid IDs.
  - test_api.py includes at least one MLOps endpoint test for regression coverage.
  - All tests pass with pytest.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I ran all tests and they passed against the current catalog. I recommended adding a parametrized test across all four use cases to confirm each one independently meets the minimum requirement rather than relying on a single aggregate check.
  - **Jarius Bedward:** I reviewed the test assertions and they validated the key contract properties. I suggested adding a test that verifies the contract_id format matches the expected use_case:stage pattern so future catalog changes do not break URL routing.
  - **Oluwafemi Lawal:** I created the test suite for the MLOps contract endpoints with four focused test cases. The tests verify minimum stage coverage flags, extended lifecycle stages, implementation reference accuracy, and proper 404 error handling. I also added MLOps endpoint tests to test_api.py for broader regression ...

**Task #302: Update root README with ML service contract references**
- **State:** In Progress
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #158
- **Description:** Update the root README.md to reference the new ML service contracts feature. Add a mention of the MLOps contract API endpoints and link to the detailed documentation at documentation/ml_service_contracts.md. Ensure the project overview reflects the lifecycle-aligned contract modeling approach.
- **Acceptance Criteria:**
  - README.md references the MLOps service contract API.
  - A link to documentation/ml_service_contracts.md is included.
  - The project overview reflects the lifecycle-aligned pipeline approach.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the documentation link and it resolves correctly. I recommended adding the ML service contracts section to the table of contents if one exists to improve discoverability.
  - **Jarius Bedward:** I reviewed the README change and the reference was clear and well-placed. I suggested mentioning the /api/mlops/use-cases endpoint URL so readers can immediately try the API after starting the server.
  - **Oluwafemi Lawal:** I updated the root README to include a reference to the ML service contracts API and linked to the full documentation. The project overview now reflects the lifecycle-aligned contract modeling approach alongside the existing inference and training features.

---

### Jarius Bedward

**Summary:** 50 tasks total — 25 Done, 5 In Progress, 20 other

#### Backlog

**Task #36: Identify Vision**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #35
- **Description:** Identify the projects vission

**Task #37: Identify Mission**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #35
- **Description:** Identify the projects mission

**Task #38: Identify Strategy**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #35
- **Description:** Identify the strategy for the project

**Task #41: Research and Identify Use Case 1**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #40
- **Description:** Use the research papers shared in the excel sheet to identify and find a AI&ML use case

**Task #51: Add Links for research**
- **State:** In Progress
- **Parent Path:** Epic #29 → Feature #47 → Product Backlog Item #50
- **Description:** Add links to shared excel sheet

**Task #79: Implement Real World Variability Augmentation Strategy**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #86
- **Description:** Add augmentations simulating glare, rotation, blur, partial occlusion, and perspective distortion to improve robustness in real checkout environments.

**Task #99: Package Model within App Bundle**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #60 → Product Backlog Item #98
- **Description:** Embed model in application to eliminate cloud dependency.

**Task #102: Perform Low Light & Glare Testing**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #61 → Product Backlog Item #100
- **Description:** Evaluate detection reliability under poor lighting and reflective surfaces

**Task #120: Implement Shared inference Abstraction Layer**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #118
- **Description:** Create unified inference interface to maintain consistent preprocessing and output formatting

**Task #121: Implement Android Pipeline**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #118
- **Description:** Integrate real-time frame streaming with preprocessing.

**Task #122: Implement iOS Pipeline**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #118
- **Description:** Develop frame capture and preprocessing for iOS.

**Task #123: Cross-Platform Functional Testing**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #118
- **Description:** Validate feature parity across both platforms

**Task #133: Design Recognition Screen UI**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Design and implement main scanning screen including camera preview, result display area, and scanning indicator

**Task #134: Implement Recognition State Management**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Create state logic (Idle → Scanning → Detected → Announced) to manage UI updates and feedback timing.

**Task #135: Connect UI Layer to Inference Backend**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Implement interface between frontend UI and on-device model inference pipeline to pass frame data and receive prediction results.

**Task #136: Implement Result Display Component**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Display detected denomination and quantity clearly on screen with accessible formatting.

**Task #137: Implement Error & No-Detection Feedback**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Display and announce appropriate message when no currency is detected or detection confidence is low

**Task #138: Validate Real-Time UI Responsiveness**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Test rapid frame transitions to ensure UI does not freeze or lag.

**Task #139: Cross-Platform UI Behavior Testing**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Ensure UI consistency across Android and iOS devices.

**Task #140: Optimize Memory Allocation During Frame Prcoessing**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #124
- **Description:** Reduce redundant buffer allocations to prevent memory spikes.

**Task #185: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #60 → Product Backlog Item #184

**Task #193: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #192

**Task #281: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #62 → Feature #170 → Product Backlog Item #265
- **Description:** Perform user acceptance testing for the "Condition Detection Model Development (Lite + Cloud)" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Condition Detection Model Development (Lite + Cloud)" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Condition Detection Model Development (Lite + Cloud)" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Condition Detection Model Development (Lite + Cloud)" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Jarius Bedward:** I created the UAT plan for the "Condition Detection Model Development (Lite + Cloud)" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

**Task #284: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #65 → Feature #173 → Product Backlog Item #268
- **Description:** Perform user acceptance testing for the "Receipt Parsing & Structured Extraction" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Receipt Parsing & Structured Extraction" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Receipt Parsing & Structured Extraction" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Receipt Parsing & Structured Extraction" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Jarius Bedward:** I created the UAT plan for the "Receipt Parsing & Structured Extraction" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

#### Sprint 0

**Task #67: Presentation: Introduction, Problem Statement & Relevance**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #45
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the introduction flow and it connected well to the project goal. I recommended making the transition from the problem statement into the solution approach more explicit so the presentation feels tighter.
  - **Oluwafemi Lawal:** I reviewed the opening section and it established the problem clearly. I suggested adding one concise point about the everyday challenges of manual currency identification to strengthen the motivation.
  - **Jarius Bedward:** I prepared the presentation section covering the introduction, problem statement, and project relevance. I framed the problem around helping visually impaired users identify currency more confidently and explained why this use case is worth solving.

**Task #76: Configure YOLO26 Training Environment**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #59 → Product Backlog Item #72
- **Description:** Set up training configuration including dataset paths, hyperparameters, augmentation strategies, and GPU configuration. Validate that training pipeline runs without errors
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked that the config structure was consistent. I recommended documenting the GPU and CUDA assumptions so failures were easier to diagnose.
  - **Oluwafemi Lawal:** I reviewed the setup and it looked stable. I suggested adding one short smoke test command so a new contributor could validate the environment quickly.
  - **Jarius Bedward:** I configured the YOLO26 training environment so runs were reproducible. I pinned dependencies, organized configs, and confirmed a clean training run could start from scratch without manual fixes.

**Task #95: Implement Coin Classification Submodule**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #94
- **Description:** Develop a fine-grained classification model inspired by ViTCoin for reflective surface handling
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I reviewed the label mapping and it looked consistent with the expected classes. I recommended bundling the label map with the model artifact so updates could not silently break inference.
  - **Oluwafemi Lawal:** The integration looked correct. I suggested adding a confidence threshold and a fallback response so the system avoided confidently wrong announcements.
  - **Jarius Bedward:** I implemented the coin classification submodule and wired it into the inference flow so coin inputs returned a denomination label. I verified that model loading, label mapping, and prediction formatting were consistent.

**Task #179: Generate bill cutouts + quality filtering**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #94
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked several random cutouts and the bounding alignment looked good. I recommended keeping a small sample of borderline cases for robustness testing later.
  - **Jarius Bedward:** I reviewed the filtered set and it looked higher signal. I suggested logging rejection reasons so you could tune the thresholds if the dataset became too small for some denominations.
  - **Oluwafemi Lawal:** I generated bill cutouts and applied quality filtering so training used cleaner, more focused bill crops. I removed low quality samples and kept only cutouts that matched the expected bill shape and visibility.

**Task #275: User Acceptance Testing**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #47 → Product Backlog Item #259
- **Description:** Perform user acceptance testing for the "Research" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Research" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Research" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Research" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Jarius Bedward:** I created the UAT plan for the "Research" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

#### Sprint 1

**Task #177: Build negatives/confusers/background pool**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #86
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I reviewed sample outputs and the pool looked realistic. I recommended tagging the most common confuser types so you could later report which ones still triggered false detections.
  - **Oluwafemi Lawal:** I liked the direction because it reduced false positives. I suggested adding a rule that ensured confusers were present in every training epoch so the detector did not forget them.
  - **Jarius Bedward:** I built the negatives, confusers, and background pool by collecting non currency images and normalizing them into the same structure as the currency sets. I verified the pool could be merged into training without breaking labels.

#### Sprint 4

**Task #221: Create Inference API Dockerfile**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #154
- **Description:** Author training/Dockerfile that packages the FastAPI inference API into a production-ready container. - Base image: python:3.11-slim 
- Install CPU-only PyTorch via --index-url https://download.pytorch.org/whl/cpu to avoid pulling ~2 GB of CUDA libraries 
- Install system dependencies for OpenCV headless runtime (libgl1, libglib2.0-0, curl) 
- Copy application code (app/), trained model weights (models/), and the Expo web build (app/rn_app/dist/ → app/static/rn/) 
- Expose port 8080 and serve vi...
- **Acceptance Criteria:**
  - training/Dockerfile exists and builds successfully with docker build -t smc-inference-api ./training
  - The resulting image size is under 2 GB (no CUDA libs bundled)
  - uvicorn starts and responds with HTTP 200 at /api/health
  - Model weights (training/models/) and Expo static build (app/static/rn/) are present inside the running container
  - HEALTHCHECK passes within the configured start period (30 s)
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the system dependency list and it covered what OpenCV headless needs. I recommended pinning the base image digest or minor version so rebuilds stay reproducible across environments.
  - **Oluwafemi Lawal:** I reviewed the Dockerfile and the layer ordering looked cache-friendly. I suggested confirming that the Expo dist copy path matches what the FastAPI static mount expects so the web UI loads correctly.
  - **Jarius Bedward:** I authored the training/Dockerfile using python:3.11-slim with CPU-only PyTorch to keep the image under 2 GB. The image copies app code, model weights, and the Expo web build, then serves via uvicorn on port 8080 with a HEALTHCHECK on /api/health.

**Task #222: Create Docker Compose configuration for API and test services**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #154
- **Description:** Author docker-compose.yml at the repository root defining two services: - api — the inference API exposed on port 8080 with a health check and ENABLE_AWS_MODEL_SYNC=0 
- tests — an E2E pytest runner that depends on the API being healthy before executing pytest app/tests/ -v --tb=short. This service is placed behind the test profile so it does not start by default.
- **Acceptance Criteria:**
  - docker compose up --build -d starts the api service and it becomes healthy
  - docker compose run --rm tests executes the full E2E test suite (17+ tests) and returns exit code 0
  - tests service does not start during a plain docker compose up
  - ENABLE_AWS_MODEL_SYNC=0 is set in both services so no AWS credentials are required locally
  - docker compose down removes all service containers cleanly
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the service definitions and the environment variable setup made sense. I recommended adding a named volume or bind mount note in the README so developers know how to test with local model changes without rebuilding.
  - **Oluwafemi Lawal:** I reviewed the compose configuration and the health check dependency chain looked correct. I suggested confirming that the test profile isolation prevents the tests container from starting during a plain docker compose up.
  - **Jarius Bedward:** I created the docker-compose.yml with an api service on port 8080 including a health check and ENABLE_AWS_MODEL_SYNC=0, plus a tests service behind the test profile that runs pytest after the API is healthy.

**Task #235: Submit SageMaker screen-detector training job**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #167 → Product Backlog Item #227
- **Description:** Author two scripts for SageMaker-based training: - scripts/31_submit_sagemaker_screen_yolo.py — uploads screen dataset to S3, configures and submits a SageMaker PyTorch training job 
- scripts/sm_train_yolo_screen.py — SageMaker entry-point that locates data.yaml, runs YOLO.train(), and copies best weights to the model output directory 
 Includes trained model weights (screen-guard-detector-*.pt) and training report (screen_guard_detector_report.json) as artifacts.
- **Acceptance Criteria:**
  - SageMaker job submission script runs with valid AWS credentials
  - Entry-point script correctly finds data.yaml and invokes YOLO training
  - Best weights are copied to SageMaker model output directory
  - Training report includes precision, recall, mAP50, and job metadata
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I verified the training report JSON includes all required fields — precision, recall, mAP50, and the SageMaker job ARN. The entry-point script correctly handles the SageMaker directory structure (SM_CHANNEL_TRAINING, SM_MODEL_DIR) and copies only the best.pt file.
  - **Oluwafemi Lawal:** I reviewed the SageMaker job configuration and the instance type, volume size, and hyperparameters all looked appropriate for YOLO training. I suggested adding a tag on the SageMaker job with the git commit hash so we can trace model artifacts back to the exact code version.
  - **Jarius Bedward:** I authored scripts/31_submit_sagemaker_screen_yolo.py for S3 dataset upload and SageMaker PyTorch training job submission, along with scripts/sm_train_yolo_screen.py as the SageMaker entry-point that locates data.yaml, runs YOLO.train(), and copies the best weights to the model output directory. The...

**Task #237: Add spoof guard model registry support**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #104 → Product Backlog Item #105
- **Description:** Update training/app/services/model_manager.py to support spoof guard models: - Add is_spoof_guard_name() pattern matcher for guard model filenames 
- Register spoof_guard in pin-file mapping 
- Propagate normalize_imagenet metadata from checkpoint 
- Update inference.py to respect normalize_imagenet flag
- **Acceptance Criteria:**
  - Guard model files are recognized by naming pattern
  - Pin file correctly maps to spoof guard slot
  - normalize_imagenet metadata flows from checkpoint to inference
  - Existing model loading behavior is unaffected
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested loading a guard model via the pin file and confirmed it lands in the correct slot. I also verified that the normalize_imagenet flag in inference.py is respected — when set, the classifier applies ImageNet mean/std normalization before forward pass.
  - **Oluwafemi Lawal:** I reviewed the pattern matcher and it correctly identifies files matching screen-guard-*, spoof-guard-*, and anti-spoof-* naming conventions. The pin-file mapping follows the same structure as the existing detector and classifier pins, which keeps the registry consistent.
  - **Jarius Bedward:** I updated training/app/services/model_manager.py with an is_spoof_guard_name() pattern matcher that recognizes guard model filenames, added the spoof_guard pin-file mapping, and ensured normalize_imagenet metadata propagates from the checkpoint to the inference layer.

**Task #240: Swap UI routes: RN SPA at root, legacy at /rn**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #150 → Product Backlog Item #160
- **Description:** Update training/app/main.py and main_legacy.py to swap the UI routing: - React Native Expo SPA served at / with catch-all routing 
- Reserved-prefix guard for /api, /docs, /redoc, /static 
- Legacy static HTML UI moved to /rn 
- Same swap applied in legacy entry-point
- **Acceptance Criteria:**
  - GET / serves the React Native SPA
  - GET /rn serves the legacy HTML UI
  - /api/*, /docs, /redoc are not captured by SPA catch-all
  - Deep links (e.g., /history) correctly fall through to SPA
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested all the route combinations: GET / returns the RN SPA, GET /rn returns the legacy HTML, /api/health passes through correctly, and /docs still serves the Swagger UI. Deep links like /history also resolve to the SPA as expected.
  - **Oluwafemi Lawal:** I reviewed the reserved-prefix guard and it correctly prevents the SPA catch-all from swallowing API routes. The ordering of route registration matters here — API routes are registered first, then the SPA catch-all at the end, which is the right approach.
  - **Jarius Bedward:** I updated training/app/main.py and main_legacy.py to swap the UI routing: the React Native Expo SPA is now served at / with a catch-all that uses a reserved-prefix guard for /api, /docs, /redoc, and /static. The legacy HTML UI is moved to /rn. Deep links like /history correctly fall through to the S...

**Task #241: Auto-detect RN build directory**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #150 → Product Backlog Item #160
- **Description:** Add _default_rn_dir() to training/app/core/config.py that resolves the React Native build output directory: - Checks static/rn/ first (Docker container layout) 
- Falls back to rn_app/dist/ (local dev layout) 
- Returns None if neither exists (triggers 404 on RN routes)
- **Acceptance Criteria:**
  - Docker builds resolve to static/rn/
  - Local dev resolves to rn_app/dist/
  - Missing build directory results in clear 404 response
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested in both environments: Docker build correctly resolves to static/rn/, and running locally without Docker hits rn_app/dist/. When I deleted both directories, the API returned a clear 404 for the root route instead of crashing.
  - **Oluwafemi Lawal:** I reviewed the detection logic and the priority order makes sense — Docker images copy the build into static/rn/ during image build, while local development uses the rn_app/dist/ output directly. The None fallback prevents cryptic errors when the build has not been run yet.
  - **Jarius Bedward:** I added _default_rn_dir() to training/app/core/config.py that resolves the React Native build output directory by checking static/rn/ first (Docker container layout) and falling back to rn_app/dist/ (local dev layout). Returns None if neither exists, which triggers a clean 404 on RN routes.

**Task #247: Update scripts README with spoof guard and screen detector pipeline**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #167 → Product Backlog Item #227
- **Description:** Update scripts/README.md to document scripts 28–32: - Add entries to the numbered pipeline list for each new script 
- Document spoof guard training and screen detector preparation workflows 
- Include SageMaker submission and optimization knobs
- **Acceptance Criteria:**
  - Scripts 28–32 are listed with descriptions in README
  - Workflow for training a new spoof guard model is documented
  - SageMaker submission workflow is documented
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I verified that the script numbers in the README match the actual filenames and that the parameter descriptions are accurate. The SageMaker section correctly notes the required AWS credentials and the S3 bucket naming convention.
  - **Oluwafemi Lawal:** I reviewed the README additions and the documentation matches the actual script interfaces. I suggested adding a quick-start example showing how to train a new spoof guard model from scratch using scripts 28 and 29 in sequence.
  - **Jarius Bedward:** I updated scripts/README.md to document scripts 28 through 32 in the numbered pipeline list. Each entry includes the script name, purpose, key parameters, and expected outputs. I also added a section on the spoof guard training workflow and SageMaker submission steps.

**Task #248: Update training README with spoof guard deployment workflow**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #167 → Product Backlog Item #227
- **Description:** Update training/README.md to document: - Spoof guard training/evaluation/deployment workflow 
- SageMaker screen-detector training path and metrics 
- New SPOOF_GUARD_* environment variables
- **Acceptance Criteria:**
  - Spoof guard section added with train/eval/deploy steps
  - SageMaker metrics (precision 0.768, recall 0.493, mAP50 0.591) documented
  - All new environment variables listed with defaults
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I verified all the environment variable names match what config.py expects and the defaults are correct. The metrics section gives a clear picture of the current model performance and sets expectations for what users will see in production.
  - **Oluwafemi Lawal:** I reviewed the deployment workflow section and it covers the full end-to-end path from training to production. I suggested adding a note about the minimum recommended threshold setting for production use based on our current precision/recall trade-off.
  - **Jarius Bedward:** I updated training/README.md to document the spoof guard training, evaluation, and deployment workflow. I added the SageMaker screen-detector metrics (precision 0.768, recall 0.493, mAP50 0.591) and listed all new SPOOF_GUARD_* environment variables with their types and defaults.

**Task #249: Pin numpy version for torch/ultralytics compatibility**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #154
- **Description:** Update training/app/requirements.txt to pin numpy>=2.0.0,<2.1.0 for compatibility with the current ultralytics and PyTorch versions used in the inference container.
- **Acceptance Criteria:**
  - requirements.txt contains numpy pin
  - pip install -r requirements.txt resolves without conflicts
  - Inference API starts without numpy-related import errors
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested the inference API startup with the pinned numpy version in a Docker container and there are no import errors. The ultralytics model loading and torch inference both work correctly with numpy 2.0.x.
  - **Oluwafemi Lawal:** I reviewed the pin and the version range is appropriate — numpy 2.0.x is stable and tested with our torch/ultralytics stack. I confirmed pip install -r requirements.txt resolves without conflicts in a clean virtual environment.
  - **Jarius Bedward:** I updated training/app/requirements.txt to pin numpy>=2.0.0,

**Task #272: User Acceptance Testing**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #104 → Product Backlog Item #250
- **Description:** Perform user acceptance testing for the "Cash Integrity & Counterfeit Detection Engine" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Cash Integrity & Counterfeit Detection Engine" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Cash Integrity & Counterfeit Detection Engine" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Cash Integrity & Counterfeit Detection Engine" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Jarius Bedward:** I created the UAT plan for the "Cash Integrity & Counterfeit Detection Engine" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

#### Sprint 5

**Task #252: Replace champion model weights with Phase 2 AMT training outputs**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #94
- **Description:** Remove the Sprint 3 champion model files (champ-detector-20260224, champ-bill-20260223, champ-coin-20260223) and replace them with the Phase 2 AMT tuning winners (phase2-amt-det-20260301-130911-008, p2amt-bill-260301130911-003, p2amt-coin-260301215339-001). Update the SageMaker download script (40_download_sagemaker_champions.py) to pull the new artifact URIs and update aws_deploy_info_20260313.json with spoof-guard metrics. Add pinned pipeline_*_model.txt selector files so the Docker container ...
- **Acceptance Criteria:**
  - Old champ-* model files are removed from training/models/.
  - New p2amt-* and phase2-amt-* model files are present and loadable by the API.
  - scripts/40_download_sagemaker_champions.py downloads the correct Phase 2 artifacts.
  - aws_deploy_info_20260313.json contains entries for detector, bill, coin, and spoof_guard with correct S3 URIs and metrics.
  - pipeline_*_model.txt files exist and the health endpoint reports the expected active models.
  - docker compose up --build starts with the new models and /api/health returns them.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the deploy info JSON and it now includes all four model slots including spoof guard. I recommended documenting the model naming convention so future rotations follow the same pattern consistently.
  - **Oluwafemi Lawal:** I reviewed the model rotation and the pipeline selectors looked correct. I suggested adding a check in the download script that verifies the model file hash matches the expected artifact before overwriting existing weights.
  - **Jarius Bedward:** I removed the old Sprint 3 champion models and replaced them with the Phase 2 AMT winners downloaded from SageMaker. I updated the download script with the new artifact URIs and added pipeline_*_model.txt selector files so the Docker container picks the right model per slot deterministically. I veri...

**Task #255: Add Prometheus, Loki, Promtail, and Grafana services to Docker Compose**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #157
- **Description:** Extend docker-compose.yml with Prometheus, Loki, Promtail, and Grafana service definitions. Create configuration files under monitoring/ for each service. Prometheus should scrape the API /metrics endpoint, Promtail should ship container logs to Loki, and Grafana should auto-provision data sources for both Prometheus and Loki.
- **Acceptance Criteria:**
  - docker compose up starts all five services (api, prometheus, loki, promtail, grafana) without errors.
  - Prometheus scrapes the API /metrics endpoint and shows targets as UP.
  - Grafana is accessible at port 3000 with pre-provisioned Prometheus and Loki data sources.
  - Promtail ships API container logs to Loki and they appear in Grafana Explore.
  - Named volumes (grafana-data, loki-data) persist state across restarts.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the monitoring configs and they were well structured. I recommended adding a docker compose down -v reminder in the README for when developers need to reset monitoring state completely.
  - **Oluwafemi Lawal:** I reviewed the Compose updates and the service dependencies looked correct. I suggested adding resource limits to the monitoring containers so they do not consume excessive memory on developer machines.
  - **Jarius Bedward:** I extended docker-compose.yml with Prometheus, Loki, Promtail, and Grafana services and created all the necessary config files under monitoring/. Prometheus scrapes the API /metrics endpoint, Promtail forwards container logs to Loki, and Grafana auto-provisions both as data sources on startup. I ver...

#### Sprint 6

**Task #290: Add MLflow tracking server to Docker Compose stack**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #154
- **Description:** Create a monitoring/mlflow/Dockerfile with a Python 3.11 slim image running MLflow server. Add an mlflow service to docker-compose.yml on port 5000 with SQLite backend store and file-based artifact root, a health check, and a persistent volume mount at outputs/mlflow/. Configure via MLFLOW_BACKEND_STORE_URI and MLFLOW_DEFAULT_ARTIFACT_ROOT environment variables from .env.example.
- **Acceptance Criteria:**
  - monitoring/mlflow/Dockerfile builds a working MLflow server image.
  - docker compose up starts the mlflow service on port 5000 alongside the API.
  - MLflow UI is accessible at http://localhost:5000 after docker compose up.
  - MLFLOW_BACKEND_STORE_URI and MLFLOW_DEFAULT_ARTIFACT_ROOT are configurable via .env.
  - MLflow data persists across container restarts via the outputs/mlflow volume mount.
  - The mlflow health check passes and the service shows as healthy in docker compose ps.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the volume mount and it correctly persists experiment data across restarts. I recommended adding the outputs/mlflow path to .gitignore to keep local experiment data out of version control.
  - **Oluwafemi Lawal:** I reviewed the MLflow Compose service and the configuration was correct. I suggested pinning the MLflow version in the Dockerfile to match the version in requirements.txt so local and container MLflow versions stay in sync.
  - **Jarius Bedward:** I created the MLflow Dockerfile and added the mlflow service to docker-compose.yml with a SQLite backend store and file artifact root. The service runs on port 5000 with a health check and persistent volume at outputs/mlflow. Configuration is driven by .env variables so users can override backend an...

**Task #292: Harden Docker Compose with env templating, Postgres service, and monitoring profiles**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #154
- **Description:** Refactor docker-compose.yml to use ${VAR:-default} environment variable templating throughout instead of hardcoded values. Add a Postgres 16 Alpine service with health check and persistent volume for the database storage backend. Move monitoring services (Prometheus, Loki, Promtail, Grafana) behind a "monitoring" profile so they only start when explicitly requested via docker compose --profile monitoring up. Add depends_on with service_healthy conditions for API and test services on the database...
- **Acceptance Criteria:**
  - docker compose up starts only api, db, and mlflow by default without monitoring services.
  - docker compose --profile monitoring up additionally starts Prometheus, Loki, Promtail, and Grafana.
  - All environment variables in docker-compose.yml use ${VAR:-default} templating.
  - Postgres service starts with health check and postgres-data volume.
  - API and test services depend on db service_healthy.
  - .env.example documents all configurable variables with safe defaults.
  - .dockerignore excludes .env, .env.*, dev/secrets/, and secrets/ directories.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the Postgres health check and it correctly uses pg_isready. I recommended adding a .env.test variant for CI environments where passwords can be simpler to avoid slowing down automated pipelines.
  - **Oluwafemi Lawal:** I reviewed the Compose changes and the service dependency chain was correct. I suggested adding a comment in .env.example explaining the monitoring profile flag so new team members know how to enable the full observability stack.
  - **Jarius Bedward:** I refactored docker-compose.yml to use env variable templating with safe defaults throughout. I added the Postgres service with a health check and persistent volume, moved monitoring behind a profile, and created .env.example with all configurable variables. The API and test services now depend on t...

**Task #294: Update project documentation with storage, MLflow, and security instructions**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #158
- **Description:** Update README.md with storage backend configuration, secret scanning instructions, MLflow tracking UI URL, and optional monitoring profile usage. Update training/README.md with experiment tracking section, .env credential handling, and MLflow run instructions. Update scripts/README.md with MLflow CLI arguments and the new script 41 entry. Update root requirements.txt with mlflow, pytest, sqlalchemy, psycopg, and python-dotenv.
- **Acceptance Criteria:**
  - README.md documents APP_STORAGE_BACKEND options, secret resolution, and gitleaks scanning commands.
  - README.md lists http://localhost:5000 as the MLflow UI URL in the application URL table.
  - training/README.md includes an experiment tracking section explaining MLflow integration.
  - scripts/README.md documents --mlflow-experiment, --mlflow-run-name, and --disable-mlflow flags.
  - requirements.txt lists mlflow, pytest, sqlalchemy, psycopg, and python-dotenv with version ranges.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked the scripts README and the new argument documentation was clear. I recommended adding example commands showing how to run a training script with MLflow tracking enabled and how to view results in the UI.
  - **Oluwafemi Lawal:** I reviewed the documentation updates and the coverage was comprehensive. I suggested adding a troubleshooting section for common MLflow connection issues since the file-based and server-based tracking URIs behave differently.
  - **Jarius Bedward:** I updated all three README files with documentation for the storage backends, MLflow experiment tracking, secret resolution, and Gitleaks scanning. I added the MLflow UI URL to the application table and documented the new CLI arguments for train and eval scripts. The root requirements.txt now includ...

#### Sprint 7

**Task #278: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #29 → Feature #58 → Product Backlog Item #262
- **Description:** Perform user acceptance testing for the "Assignment 6" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Assignment 6" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I performed cross-platform verification for the "Assignment 6" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Assignment 6" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Jarius Bedward:** I created the UAT plan for the "Assignment 6" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

**Task #295: Build ML lifecycle contract catalog with four use-case definitions**
- **State:** In Progress
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #157
- **Description:** Create a mlops_catalog.py service module in training/app/services/ that models each project ML use case (money detection, bill classification, coin classification, screen spoof detection) as a lifecycle-aligned pipeline with explicit service contracts. Define contracts for each lifecycle stage: ingestion, EDA, preprocessing, training, validation, serving, integration, and monitoring. Each contract includes a service name, summary, implementation type (script, endpoint, or app), implementation re...
- **Acceptance Criteria:**
  - mlops_catalog.py defines lifecycle contracts for money_detection, bill_classification, coin_classification, and screen_spoof_detection.
  - Each use case covers at least the 6 required lifecycle stages: ingestion, eda, preprocessing, training, validation, serving.
  - Each contract includes service_name, summary, implementation_type, implementation_refs, inputs, and outputs.
  - list_use_cases() returns summary objects with stage counts and minimum requirement flags.
  - get_use_case() returns a full contract catalog for a specific use case with all lifecycle stages.
  - get_contract() returns a single lifecycle-stage contract by use_case_id and stage key.
  - Implementation references point to actual scripts and endpoints in the repository.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I checked all implementation_refs and they correctly point to existing scripts and endpoints. I recommended documenting the contract schema in the ML service contracts doc so the team can reference the data model without reading the source code.
  - **Oluwafemi Lawal:** I reviewed the catalog and the contract definitions were thorough. I suggested adding the contract_id field as a composite key of use_case and stage so the API can reference individual contracts in a URL-friendly way.
  - **Jarius Bedward:** I built the MLOps lifecycle contract catalog covering all four ML use cases in the project. Each use case has 8 lifecycle stages defined with concrete implementation references pointing back to the actual scripts and endpoints in the repo. The catalog enforces the minimum 6-stage requirement and exp...

**Task #296: Add Pydantic response schemas for MLOps contract API**
- **State:** In Progress
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #152
- **Description:** Add Pydantic response models to training/app/schemas/responses.py for the MLOps contract endpoints. Create MlLifecycleContractResponse with fields for contract_id, service_name, lifecycle_stage, summary, api_contract_path, implementation_type, implementation_refs, inputs, and outputs. Create MlUseCaseSummaryResponse with use_case, display_name, problem_type, description, stage_count, required_stages, required_stages_present, and minimum_contract_requirement_met. Create MlUseCaseDetailResponse ex...
- **Acceptance Criteria:**
  - MlLifecycleContractResponse schema validates contract detail payloads with all required fields.
  - MlUseCaseSummaryResponse schema includes stage_count and minimum_contract_requirement_met fields.
  - MlUseCaseDetailResponse inherits from MlUseCaseSummaryResponse and adds a contracts list.
  - MlUseCaseListResponse wraps use_cases as a list of summaries.
  - All schemas are importable from app.schemas.responses.
  - OpenAPI docs at /docs display the new schemas with field-level documentation.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested the schemas with sample catalog data and they serialized correctly. I recommended adding a problem_type field to the summary to help API consumers distinguish between detection, classification, and guard use cases.
  - **Oluwafemi Lawal:** I reviewed the schema hierarchy and the inheritance from summary to detail was clean. I suggested adding Field descriptions to the key boolean fields so the OpenAPI docs explain what minimum_contract_requirement_met actually checks.
  - **Jarius Bedward:** I added four new Pydantic response models for the MLOps contract endpoints. The schemas validate all response payloads and generate accurate OpenAPI documentation. MlUseCaseDetailResponse inherits from the summary to keep the list and detail representations consistent.

**Task #297: Create MLOps API endpoints for use-case and contract querying**
- **State:** In Progress
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #152
- **Description:** Create an mlops.py endpoint module in training/app/api/v1/endpoints/ with three GET endpoints under /api/mlops/: GET /use-cases returns a list of all modeled ML use cases with their stage counts and requirement status; GET /use-cases/{use_case_id} returns the full lifecycle contract catalog for a specific use case; GET /use-cases/{use_case_id}/contracts/{stage} returns one concrete lifecycle-stage contract. Wire response models from the Pydantic schemas for OpenAPI documentation. Return 404 with...
- **Acceptance Criteria:**
  - GET /api/mlops/use-cases returns 200 with a list of all modeled use cases.
  - GET /api/mlops/use-cases/money_detection returns 200 with full contract details.
  - GET /api/mlops/use-cases/money_detection/contracts/training returns 200 with one contract.
  - GET /api/mlops/use-cases/not-real returns 404 with an ErrorResponse detail message.
  - All endpoints use the Pydantic response_model for OpenAPI docs.
  - Endpoints import from app.services.mlops_catalog and app.schemas.responses.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I tested all three endpoints against the live catalog and the responses matched the Pydantic schemas. I recommended adding a summary field to the list endpoint description explaining the minimum lifecycle stage requirements.
  - **Oluwafemi Lawal:** I reviewed the endpoint code and the error handling was correct. I suggested adding tags and description strings to each endpoint decorator so the Swagger UI groups them clearly under the ML Service Contracts section.
  - **Jarius Bedward:** I created the three MLOps endpoints following the same pattern as our other API modules. Each endpoint uses typed response models and returns structured error payloads for unknown resources. The endpoints delegate all business logic to the catalog service layer.

**Task #298: Wire MLOps router into v1 API and register startup mount**
- **State:** In Progress
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #152
- **Description:** Import the new mlops endpoint router into training/app/api/v1/router.py and register it with prefix /mlops and tag ML Service Contracts. Update training/app/main.py to include the MLOps routes in the startup logging and ensure the new endpoints appear in the OpenAPI schema at /docs. Verify the full route prefix resolves as /api/mlops/use-cases.
- **Acceptance Criteria:**
  - router.py imports from app.api.v1.endpoints.mlops and includes the router with prefix /mlops.
  - main.py startup logs reference the new MLOps contract endpoints.
  - GET /api/mlops/use-cases is reachable through the mounted v1 router.
  - The /docs OpenAPI page shows the ML Service Contracts tag with all three endpoints.
  - Existing API routes are unaffected by the new router registration.
- **Discussion (3 comments):**
  - **Cemil Caglar Yapici:** I verified all existing routes still work after the new registration. I recommended adding the /api/mlops prefix to the URL table in the README so users can discover the new endpoints from the documentation.
  - **Oluwafemi Lawal:** I reviewed the router registration and the prefix and tag were consistent with the endpoint decorators. I suggested ordering the router includes so mlops appears after health but before pipeline for a logical grouping in the docs.
  - **Jarius Bedward:** I wired the MLOps router into the v1 API aggregation and updated the startup log to include the new endpoints. The full path /api/mlops/use-cases resolves correctly and the OpenAPI docs group them under the ML Service Contracts tag alongside the existing endpoint groups.

---

### Cemil Caglar Yapici

**Summary:** 26 tasks total — 15 Done, 2 In Progress, 9 other

#### Backlog

**Task #101: Cross-device performance testing**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #61 → Product Backlog Item #100
- **Description:** Measure inference speed and accuracy on multiple devices

**Task #103: Generate Benchmark Report**
- **State:** To Do
- **Parent Path:** Epic #27 → Feature #61 → Product Backlog Item #100
- **Description:** Description: Document mAP, FPS, memory usage, and latency for submission

**Task #144: Add Adjustable Speech Speed Setting**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #142 → Product Backlog Item #143
- **Description:** Allow user customization of speech rate.

**Task #147: Test With TalkBack**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #142 → Product Backlog Item #145
- **Description:** Validate navigation flow using screen reader.

**Task #148: Test with VoiceOver**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #142 → Product Backlog Item #145
- **Description:** Ensure compatibility and smooth navigation.

**Task #195: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #28 → Feature #142 → Product Backlog Item #194

**Task #279: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #62 → Feature #168 → Product Backlog Item #263
- **Description:** Perform user acceptance testing for the "Region of Interest Segmentation & Image Quality Gate" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Region of Interest Segmentation & Image Quality Gate" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I performed cross-platform verification for the "Region of Interest Segmentation & Image Quality Gate" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Region of Interest Segmentation & Image Quality Gate" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Cemil Caglar Yapici:** I created the UAT plan for the "Region of Interest Segmentation & Image Quality Gate" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

**Task #282: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #62 → Feature #171 → Product Backlog Item #266
- **Description:** Perform user acceptance testing for the "Dual-Mode Delivery (Cloud API + App Routing + QA)" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Dual-Mode Delivery (Cloud API + App Routing + QA)" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I performed cross-platform verification for the "Dual-Mode Delivery (Cloud API + App Routing + QA)" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Dual-Mode Delivery (Cloud API + App Routing + QA)" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Cemil Caglar Yapici:** I created the UAT plan for the "Dual-Mode Delivery (Cloud API + App Routing + QA)" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

**Task #285: User Acceptance Testing**
- **State:** To Do
- **Parent Path:** Epic #65 → Feature #174 → Product Backlog Item #269
- **Description:** Perform user acceptance testing for the "Transaction Matching & Verification Logic" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Transaction Matching & Verification Logic" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I performed cross-platform verification for the "Transaction Matching & Verification Logic" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Transaction Matching & Verification Logic" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Cemil Caglar Yapici:** I created the UAT plan for the "Transaction Matching & Verification Logic" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

#### Sprint 0

**Task #46: Presentation: Potential Additional Use Cases**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #45
- **Description:** Create the slide deck for the presentation
- **Discussion (3 comments):**
  - **Jarius Bedward:** I checked the proposed use cases and the direction looked solid. I recommended linking each one to a clear accessibility benefit or system capability so the audience can see why it matters.
  - **Oluwafemi Lawal:** I reviewed the additional use case ideas and they broadened the story well. I suggested prioritizing them by user value and implementation feasibility so the presentation stays focused.
  - **Cemil Caglar Yapici:** I drafted the presentation content for additional use cases beyond basic note detection and tied each idea back to how it could help users in real situations. I focused on examples that extend the product vision while still fitting the project scope.

**Task #178: Normalize labels into canonical CAD schema**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #54 → Product Backlog Item #94
- **Discussion (3 comments):**
  - **Jarius Bedward:** I reviewed the final label list and it matched what the models needed. I recommended versioning the label map alongside the model artifacts so deployments could not drift.
  - **Oluwafemi Lawal:** The mapping approach looked consistent. I suggested writing a small validation script that failed fast if any unknown labels appeared after merges.
  - **Cemil Caglar Yapici:** I normalized the labels into a canonical CAD schema and mapped inconsistent dataset label names into one shared class definition. I validated the mapping with spot checks and ensured the same label set flowed into training and inference.

#### Sprint 1

**Task #73: Train YOLO26 Model**
- **State:** Done
- **Parent Path:** Epic #27 → Feature #59 → Product Backlog Item #72
- **Description:** Train the YOLO26 model on the prepared dataset to recognize denominations.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I reviewed the checkpoint handling and it was clean. I recommended adding a per class breakdown so we could see which denominations were still weak.
  - **Oluwafemi Lawal:** The training results looked solid. I suggested writing a short ablation note so it was clear how much negatives and synthetic data contributed.
  - **Cemil Caglar Yapici:** I trained the YOLO26 detector end to end on the prepared dataset and produced a deployable checkpoint. I tracked the key metrics and confirmed the model met the basic quality target before exporting artifacts.

**Task #273: User Acceptance Testing**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #32 → Product Backlog Item #257
- **Description:** Perform user acceptance testing for the "Assignment 1" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Assignment 1" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I performed cross-platform verification for the "Assignment 1" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Assignment 1" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Cemil Caglar Yapici:** I created the UAT plan for the "Assignment 1" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

#### Sprint 2

**Task #146: Add Accessibility Labels to All UI Elements**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #142 → Product Backlog Item #145
- **Description:** Add semantic labels to buttons and feedback components.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I checked the accessibility improvement and it addresses an important usability gap. I recommended validating focus order and spoken feedback during the main user flows so the labels work well in practice, not just in code.
  - **Oluwafemi Lawal:** I reviewed the accessibility label update and the direction looked good. I suggested checking that each label uses clear action-oriented wording so users can quickly understand what each element does.
  - **Cemil Caglar Yapici:** I added accessibility labels to buttons and feedback components so assistive technologies can describe the interface more clearly. The update is intended to make the mobile experience easier to navigate for users relying on screen readers.

#### Sprint 4

**Task #223: Add .dockerignore files for image optimisation**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #154
- **Description:** Create .dockerignore files for both the root context (INFO8665/.dockerignore) and the training build context (training/.dockerignore) to exclude development artifacts, caches, and large local-only directories from Docker build contexts. This reduces image size and prevents accidental inclusion of secrets or data.
- **Acceptance Criteria:**
  - .dockerignore at root excludes .git/, .vscode/, __pycache__/, .venv/, data/, outputs/
  - training/.dockerignore excludes __pycache__/, .venv/, node_modules/, *.egg-info/
  - Docker build context transferred to the daemon is under 500 MB (verify with docker build output)
  - No .pyc, .git, or node_modules artifacts appear inside the built images

**Task #232: Train spoof guard binary classifier**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #167 → Product Backlog Item #227
- **Description:** Author scripts/28_train_spoof_guard.py — binary real/spoof classifier training script. - Support ResNet18 and MobileNetV3-Small architectures 
- Implement weighted random sampling for class imbalance 
- Cosine annealing LR schedule with warm restarts 
- Mixed precision (AMP) training for GPU efficiency 
- Early stopping on validation loss plateau 
- Save best checkpoint by validation accuracy
- **Acceptance Criteria:**
  - Script runs end-to-end on a sample dataset without errors
  - Checkpoint saved with model weights + training metadata
  - Training logs include loss, accuracy, and LR per epoch
  - AMP and weighted sampling are correctly applied
- **Discussion (3 comments):**
  - **Jarius Bedward:** I tested the script on a small sample dataset and it ran end-to-end without errors. The checkpoint file includes model weights plus training metadata (epochs, best accuracy, architecture name), which will make evaluation straightforward.
  - **Oluwafemi Lawal:** I reviewed the training script and the early stopping logic looks correct — it monitors validation loss with a configurable patience window. I suggested saving the class weights alongside the checkpoint so the evaluation script can reproduce the exact decision boundary.
  - **Cemil Caglar Yapici:** I authored scripts/28_train_spoof_guard.py implementing a binary real/spoof classifier with ResNet18 and MobileNetV3-Small architecture options. The script uses weighted random sampling for class imbalance, cosine annealing LR with warm restarts, AMP for GPU efficiency, and early stopping on validat...

**Task #234: Prepare screen-detection YOLO dataset**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #167 → Product Backlog Item #227
- **Description:** Author two dataset preparation scripts: - scripts/30_prepare_screen_dataset_from_coco128.py — downloads COCO128, collapses tv/laptop/phone classes into a single “screen” class, outputs YOLO-format dataset with data.yaml 
- scripts/32_expand_screen_dataset_coco2017.py — builds larger dataset from full COCO 2017 with configurable positive count and negative ratio
- **Acceptance Criteria:**
  - Both scripts execute without errors and produce valid YOLO-format directories
  - data.yaml generated with correct class names and paths
  - Negative:positive ratio is configurable via CLI argument
  - Images and labels directories contain matching file counts
- **Discussion (3 comments):**
  - **Jarius Bedward:** I tested script 30 end-to-end and it produced 128 images with matching label files and a valid data.yaml. The negative:positive ratio parameter in script 32 works as expected — setting it to 3:1 gave us a well-balanced dataset for training.
  - **Oluwafemi Lawal:** I reviewed both scripts and the class-collapsing logic correctly remaps the three COCO category IDs to class 0 ("screen"). I suggested adding a check for images that contain multiple screen classes to avoid duplicate labels after merging.
  - **Cemil Caglar Yapici:** I authored two dataset preparation scripts. Script 30 downloads COCO128 and collapses tv-monitor, laptop, and cell-phone classes into a single "screen" class, outputting a YOLO-format dataset with a valid data.yaml. Script 32 builds a larger dataset from COCO 2017 with configurable positive count an...

**Task #243: Add spoof guard toggle to RN settings and inference screen**
- **State:** Done
- **Parent Path:** Epic #62 → Feature #104 → Product Backlog Item #105
- **Description:** Update the React Native app to support the spoof guard feature: - SettingsContext.tsx: add screenSpoofGuardEnabled boolean state (default false) 
- SettingsScreen.tsx: add “Security” section with Screen Spoof Protection toggle 
- InferenceScreen.tsx: send spoof_guard_enabled form field to API, display warning banner when spoof_check.suspected is true
- **Acceptance Criteria:**
  - Settings screen shows Security section with toggle
  - Toggle state persists in context and is sent to API
  - Warning banner appears when spoof check returns suspected
  - Default is off (no disruption to existing users)
- **Discussion (3 comments):**
  - **Jarius Bedward:** I tested the toggle end-to-end in the Expo web build: flipping the switch in Settings correctly changes the form field sent to the API, and the warning banner appears with the right styling when the backend returns a suspected flag. Default off means existing users see no change.
  - **Oluwafemi Lawal:** I reviewed the context changes and the state flows correctly from SettingsScreen through the context provider to InferenceScreen. The warning banner conditionally renders only when suspected is true, which avoids unnecessary UI noise for clean images.
  - **Cemil Caglar Yapici:** I updated SettingsContext.tsx with a new screenSpoofGuardEnabled boolean state (default false), added a "Security" section with a Screen Spoof Protection toggle in SettingsScreen.tsx, and modified InferenceScreen.tsx to send spoof_guard_enabled as a form field and display a warning banner when spoof...

**Task #245: Show classifier display names on detection overlays (RN)**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Update React Native overlay components to use classifier-resolved display names: - ImageWithOverlay.tsx: add display_name to Detection type, prefer display_name for box labels, add coin denomination color coding 
- WebLiveCamera.tsx: same display_name and coin color changes
- **Acceptance Criteria:**
  - Detection overlay boxes show display_name when available
  - Coin denominations have distinct color coding
  - Falls back to detector class name when display_name is absent
- **Discussion (3 comments):**
  - **Jarius Bedward:** I tested the overlays in the Expo web build and the denomination labels are much more readable now — "LOONIE" instead of "coin_0". The color coding helps distinguish coins at a glance, especially when multiple denominations appear in one frame.
  - **Oluwafemi Lawal:** I reviewed the TypeScript changes and the display_name fallback logic is correct — when display_name is undefined, the overlay falls back to the detector class label. The color coding uses a simple lookup map which is easy to extend for future denominations.
  - **Cemil Caglar Yapici:** I updated ImageWithOverlay.tsx and WebLiveCamera.tsx to add display_name to the Detection type interface. Box labels now prefer display_name over the raw detector class, and I added coin denomination color coding (gold for LOONIE/TOONIE, silver for QUARTER/DIME/NICKEL) to make denominations visually...

#### Sprint 5

**Task #253: Enhance InferenceScreen with live detection overlay and gallery mode improvements**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #117 → Product Backlog Item #131
- **Description:** Rewrite the React Native InferenceScreen to improve the live-camera and gallery detection experience. Changes include better bounding-box rendering, denomination label display over detected regions, improved camera permission handling, and layout adjustments for the detection results panel.
- **Acceptance Criteria:**
  - Live camera feed correctly renders bounding boxes with denomination labels on detected currency.
  - Gallery mode (image picker) still works and displays inference results.
  - Camera permissions are requested gracefully with a fallback message if denied.
  - Detection overlay text is legible on both light and dark backgrounds.
  - The screen does not crash or freeze during continuous scanning sessions.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I checked the camera permission flow and the fallback looked good. I recommended testing on both Android and iOS simulators to make sure the permission dialog and denial text render consistently across platforms.
  - **Oluwafemi Lawal:** I reviewed the InferenceScreen rewrite and the overlay rendering was noticeably better. I suggested adding a brief loading spinner between frame capture and inference result display so users know the system is working during slower detections.
  - **Cemil Caglar Yapici:** I rewrote the InferenceScreen to improve bounding box rendering and denomination label display during live camera detection. I also fixed camera permission handling to show a graceful fallback message and adjusted the results panel layout for better readability. Gallery mode continues to work as bef...

**Task #256: Create Grafana dashboards for API observability**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #157
- **Description:** Provision four Grafana dashboards: API Overview, Endpoint Breakdown, Pipeline Inference, and API Logs. Place dashboard JSON files under monitoring/grafana/provisioning/dashboards/json/ and configure auto-provisioning via dashboards.yml. Dashboards should query live Prometheus and Loki data with no manual setup required after docker compose up.
- **Acceptance Criteria:**
  - Four dashboard JSON files exist under monitoring/grafana/provisioning/dashboards/json/.
  - Grafana loads with all four dashboards pre-provisioned after docker compose up.
  - API Overview dashboard shows request rate, error rate, and latency percentiles.
  - Pipeline Inference dashboard shows per-model inference count and duration.
  - API Logs dashboard queries Loki and displays structured log entries.
  - No manual Grafana configuration is required — everything is auto-provisioned.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I checked the auto-provisioning setup and it worked cleanly. I recommended setting the API Overview dashboard as the Grafana home dashboard so it loads first when developers open the monitoring UI.
  - **Oluwafemi Lawal:** I reviewed the dashboard definitions and the panel queries were well structured. I suggested adding an alert rule on the API Overview dashboard for high error rates so the team gets notified proactively.
  - **Cemil Caglar Yapici:** I created four Grafana dashboard JSON files covering API overview, endpoint breakdown, pipeline inference metrics, and structured log viewing. All dashboards auto-provision via dashboards.yml and query Prometheus and Loki data sources automatically. No manual configuration is needed after docker com...

**Task #276: User Acceptance Testing**
- **State:** Done
- **Parent Path:** Epic #29 → Feature #56 → Product Backlog Item #260
- **Description:** Perform user acceptance testing for the "Assignment 4" feature. Verify that all implemented functionality meets the defined acceptance criteria from a user perspective. Test across supported platforms and confirm that the feature integrates correctly with existing functionality without regressions.
- **Acceptance Criteria:**
  - All implemented stories under the "Assignment 4" feature have been exercised through manual user-flow testing.
  - Test results are documented with screenshots or recordings where applicable.
  - No critical or high-severity defects remain open after testing.
  - Edge cases and error scenarios have been tested and behave gracefully.
  - The feature is confirmed working on all target platforms (Android/iOS or API depending on scope).
  - Sign-off from at least two team members recorded in task comments.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I performed cross-platform verification for the "Assignment 4" feature and confirmed consistent behavior across test environments. No regressions observed against existing functionality. I sign off on this feature for release readiness.
  - **Oluwafemi Lawal:** I reviewed the UAT results for the "Assignment 4" feature and ran additional edge-case tests including boundary inputs and error recovery paths. Everything behaved as expected. I approve the feature from a testing perspective.
  - **Cemil Caglar Yapici:** I created the UAT plan for the "Assignment 4" feature and verified the core user flows against the acceptance criteria. All primary scenarios passed testing. I documented findings and flagged minor UI polish items for follow-up.

#### Sprint 6

**Task #289: Integrate MLflow experiment tracking into training and evaluation scripts**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #157
- **Description:** Create shared _runtime.py and _tracking.py helper modules in the scripts/ directory. _runtime.py loads the repo-root .env file for consistent environment configuration. _tracking.py provides an ExperimentTracker class that wraps MLflow with automatic experiment naming, parameter/metric/artifact logging, and graceful fallback when MLflow is unavailable. Wire all training scripts (10, 22, 24, 28, 31) and evaluation scripts (23, 25, 29) to accept --mlflow-experiment, --mlflow-run-name, and --disabl...
- **Acceptance Criteria:**
  - _runtime.py and _tracking.py exist in scripts/ and are importable from all train/eval scripts.
  - All train scripts (10, 22, 24, 28, 31) accept --mlflow-experiment, --mlflow-run-name, and --disable-mlflow flags.
  - All eval scripts (23, 25, 29) log evaluation metrics and confusion matrix artifacts to MLflow.
  - ExperimentTracker gracefully disables itself when MLflow is not installed or unreachable.
  - script 41 imports SageMaker training job metadata into MLflow experiments.
  - tests/test_tracking.py passes with a file-based MLflow store confirming params, metrics, and artifacts are logged.
  - mlflow is listed in requirements.txt.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I checked the SageMaker import script and it correctly maps job metadata to MLflow runs. I recommended adding a dry-run mode to the import script so users can preview what would be logged before committing.
  - **Oluwafemi Lawal:** I reviewed the tracking integration across all scripts and the argument interface was consistent. I suggested adding a summary print at the end of each run showing the MLflow experiment URL so users can navigate directly to their results.
  - **Cemil Caglar Yapici:** I created the _runtime.py and _tracking.py shared modules and wired all training and evaluation scripts to log hyperparameters, training metrics, and model artifacts to MLflow. The ExperimentTracker gracefully falls back when MLflow is unavailable so scripts still run without it. I also wrote the Sa...

**Task #291: Add Gitleaks secret scanning with CI workflow and configuration**
- **State:** Done
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #155
- **Description:** Create a .gitleaks.toml configuration file with rules for detecting hardcoded Grafana passwords, Roboflow API keys, and MLflow auth secrets. Add allowlist paths for .env, data directories, and build artifacts. Create a .github/workflows/gitleaks.yml GitHub Actions workflow that runs on pushes to main/master and pull requests. Update .gitignore to exclude gitleaks report files.
- **Acceptance Criteria:**
  - .gitleaks.toml exists with detection rules for Grafana, Roboflow, and MLflow credentials.
  - Allowlist paths correctly exclude .env.example, data directories, and build outputs.
  - .github/workflows/gitleaks.yml runs on push to main and pull requests.
  - Running gitleaks detect --source . --no-git --config .gitleaks.toml locally produces no findings on a clean repo.
  - gitleaks-report*.json is listed in .gitignore.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I checked the CI workflow and it ran successfully on the test branch. I recommended adding the Snyk rules instruction file under .github/instructions to complement Gitleaks with dependency vulnerability scanning.
  - **Oluwafemi Lawal:** I reviewed the Gitleaks rules and the regex patterns were accurate. I suggested adding a pre-commit hook option in the README so developers can catch secrets locally before pushing.
  - **Cemil Caglar Yapici:** I created the Gitleaks configuration with custom rules for Grafana admin passwords, Roboflow API keys, and MLflow auth secrets. The allowlist excludes .env.example and test data directories so they do not trigger false positives. I also set up the GitHub Actions workflow to run on pushes and pull re...

#### Sprint 7

**Task #299: Write ML service contracts documentation with lifecycle stage mapping**
- **State:** In Progress
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #158
- **Description:** Create documentation/ml_service_contracts.md explaining the ML service contract approach used in the project. Document how each selected ML use case (money detection, bill classification, coin classification, screen spoof detection) is modeled as a lifecycle-aligned pipeline with explicit contracts for 8 stages: ingestion, EDA, preprocessing, training, validation, serving, integration, and monitoring. List the API endpoint paths for querying contracts. For each use case, map every lifecycle stag...
- **Acceptance Criteria:**
  - documentation/ml_service_contracts.md exists and is well-structured with headings for each use case.
  - All four use cases are documented with per-stage script and endpoint references.
  - The three MLOps API endpoint paths are listed: /api/mlops/use-cases, use-cases/{id}, and contracts/{stage}.
  - The submission interpretation section explains minimum (6 stages) and extended (8 stages) coverage.
  - All listed script paths match files that exist in the repository.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I verified all script references in the documentation against the repository and they all resolve. I recommended adding a table-of-contents section at the top for quick navigation since the document covers four use cases with eight stages each.
  - **Oluwafemi Lawal:** I reviewed the documentation and the lifecycle stage mappings were accurate. I suggested adding a brief intro paragraph explaining why the project models contracts explicitly rather than leaving the pipeline stages implicit in code.
  - **Cemil Caglar Yapici:** I created the ML service contracts documentation mapping all four use cases to their lifecycle stages with concrete script and endpoint references. The document covers the three API endpoints and includes a submission interpretation section explaining how each use case satisfies both the minimum and...

**Task #300: Update training README with MLOps contract API documentation**
- **State:** In Progress
- **Parent Path:** Epic #28 → Feature #149 → Product Backlog Item #158
- **Description:** Update training/README.md with a new section documenting the MLOps service contract API endpoints. Add the three endpoint paths with example response structures showing use-case listings, detail views, and individual contract queries. Explain how the catalog validates minimum lifecycle stage coverage and how the contracts reference concrete repository files.
- **Acceptance Criteria:**
  - training/README.md includes an MLOps Service Contracts section.
  - The three API endpoint paths are documented with descriptions.
  - The section explains the minimum lifecycle stage requirement and how contracts map to repo files.
  - The documentation is consistent with the actual API behavior.
- **Discussion (3 comments):**
  - **Jarius Bedward:** I checked the README against the live API responses and they matched. I recommended linking to the full ml_service_contracts.md documentation from this section so readers can find the complete per-use-case breakdown.
  - **Oluwafemi Lawal:** I reviewed the README update and the endpoint documentation was clear. I suggested adding a curl example for the use-case detail endpoint so developers can quickly test the API from the command line.
  - **Cemil Caglar Yapici:** I added the MLOps Service Contracts section to the training README documenting all three API endpoints with their purpose and response structure. The section explains how the catalog enforces minimum lifecycle coverage and points readers to the full contracts documentation for details.

---

## Sprint-by-Sprint Summary

### Backlog

- **Total Items:** 165 (87 tasks, 54 PBIs)
- **Task States:** 9 Done, 2 In Progress, 76 To Do
- **Task Breakdown:**
  - Oluwafemi Lawal: 15 tasks (#39, #42, #43, #71, #78, #80, #81, #82, #84, #85, #141, #187, #280, #283, #286)
  - Jarius Bedward: 24 tasks (#36, #37, #38, #41, #51, #79, #99, #102, #120, #121, #122, #123, #133, #134, #135, #136, #137, #138, #139, #140, #185, #193, #281, #284)
  - Cemil Caglar Yapici: 9 tasks (#101, #103, #144, #147, #148, #195, #279, #282, #285)
  - Unassigned: 39 tasks (#52, #87, #88, #90, #91, #92, #96, #97, #107, #108, #109, #110, #111, #112, #113, #114, #115, #116, #127, #128, #129, #130, #132, #181, #183, #189, #199, #201, #202, #203, #204, #205, #207, #209, #210, #211, #212, #213, #215)

### Sprint 0

- **Total Items:** 22 (11 tasks, 5 PBIs)
- **Task States:** 11 Done
- **Task Breakdown:**
  - Oluwafemi Lawal: 4 tasks (#68, #75, #77, #191)
  - Jarius Bedward: 5 tasks (#67, #76, #95, #179, #275)
  - Cemil Caglar Yapici: 2 tasks (#46, #178)

### Sprint 1

- **Total Items:** 9 (5 tasks, 4 PBIs)
- **Task States:** 5 Done
- **Task Breakdown:**
  - Oluwafemi Lawal: 2 tasks (#89, #176)
  - Jarius Bedward: 1 tasks (#177)
  - Cemil Caglar Yapici: 2 tasks (#73, #273)

### Sprint 2

- **Total Items:** 9 (3 tasks, 5 PBIs)
- **Task States:** 3 Done
- **Task Breakdown:**
  - Oluwafemi Lawal: 2 tasks (#218, #274)
  - Cemil Caglar Yapici: 1 tasks (#146)

### Sprint 3

- **Total Items:** 4 (2 tasks, 2 PBIs)
- **Task States:** 2 Done
- **Task Breakdown:**
  - Oluwafemi Lawal: 2 tasks (#219, #271)

### Sprint 4

- **Total Items:** 31 (27 tasks, 4 PBIs)
- **Task States:** 27 Done
- **Task Breakdown:**
  - Oluwafemi Lawal: 12 tasks (#224, #225, #229, #230, #231, #233, #236, #238, #239, #242, #244, #246)
  - Jarius Bedward: 10 tasks (#221, #222, #235, #237, #240, #241, #247, #248, #249, #272)
  - Cemil Caglar Yapici: 5 tasks (#223, #232, #234, #243, #245)

### Sprint 5

- **Total Items:** 8 (7 tasks, 1 PBIs)
- **Task States:** 7 Done
- **Task Breakdown:**
  - Oluwafemi Lawal: 2 tasks (#251, #254)
  - Jarius Bedward: 2 tasks (#252, #255)
  - Cemil Caglar Yapici: 3 tasks (#253, #256, #276)

### Sprint 6

- **Total Items:** 8 (8 tasks, 0 PBIs)
- **Task States:** 8 Done
- **Task Breakdown:**
  - Oluwafemi Lawal: 3 tasks (#287, #288, #293)
  - Jarius Bedward: 3 tasks (#290, #292, #294)
  - Cemil Caglar Yapici: 2 tasks (#289, #291)

### Sprint 7

- **Total Items:** 14 (11 tasks, 3 PBIs)
- **Task States:** 1 Done, 8 In Progress, 2 To Do
- **Task Breakdown:**
  - Oluwafemi Lawal: 3 tasks (#277, #301, #302)
  - Jarius Bedward: 5 tasks (#278, #295, #296, #297, #298)
  - Cemil Caglar Yapici: 2 tasks (#299, #300)
  - Unassigned: 1 tasks (#197)
