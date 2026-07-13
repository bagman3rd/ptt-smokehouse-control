# Build 7.8.2 Release Gate

A release ZIP is approved only when:
1. Build 7.8.2 CI completes successfully.
2. The staging service, with `TENANT_GUARD_ENABLED=1`, reports Build 7.8.2.
3. The authenticated staging smoke opens Today, Cook Plan, Quick EOD, and Reports without server errors.
4. The release workflow packages the exact successful commit and writes `RELEASE_EVIDENCE.json` containing the CI run ID and commit SHA.

Render production auto-deploy must be disabled by an operator. Production should deploy only the commit identified in the approved release evidence.
