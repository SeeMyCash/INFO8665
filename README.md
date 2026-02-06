# INFO8665

This repository follows a simple, policy-driven workflow:

- Long-lived branches:
  - main: last UAT/QA release
  - stable: production release
- Short-lived branches:
  - dev-<ID>: sprint work
  - exp-<ID>: experiments
  - auto/third-party: dependency automation (e.g., dependabot)

Workflow (branch -> PR -> merge):

1. Create dev-<ID> from main.
2. Work on dev-<ID>.
3. Open a PR dev-<ID> -> main, review, merge.
4. Promote to production with a PR main -> stable.
5. Tag production releases from stable as tag-YY.MM.PATCH.

Environment mapping:

- dev-* -> Test (DEV server lane, Test Container)
- main -> UAT/QA (QA Container)
- stable -> Production (PROD Container)

Repository layout:

/README.md
/orchestrator.ipynb
/data-collection/
/training/
/dev/
/documentation/
