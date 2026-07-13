# Build 9.8.0 Release Gate

A production ZIP may be generated only by `.github/workflows/release.yml` after the exact commit completes the mandatory **Build 9.8.0 CI** workflow successfully.

Required evidence:
- exact commit SHA
- successful CI workflow run ID
- complete Playwright directory on desktop and mobile
- four-role interaction manifest execution
- fresh migration replay and schema drift check
- mandatory database dump/restore drill
- packaged `RELEASE_EVIDENCE.json`

Local ZIPs are source-review packages and are not audited production artifacts.
