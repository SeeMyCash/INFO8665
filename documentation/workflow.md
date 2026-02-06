# Branching and Promotion Workflow

Branch conventions:

- main: last UAT/QA release
- stable: current production release
- dev-<ID>: sprint work
- exp-<ID>: experiments
- auto/third-party: dependency automation

PR-only flow (GitHub settings):

- Protect main and stable.
- Require at least 1 reviewer approval.
- Require CI checks to pass.
- Disallow direct pushes.

Promotion to production:

1. Merge dev-<ID> -> main via PR.
2. When UAT is accepted, open PR main -> stable.
3. Deploy from stable.
4. Tag the stable commit as tag-YY.MM.PATCH.

Reset baseline:

- Before next sprint, fast-forward main to stable so they match.
