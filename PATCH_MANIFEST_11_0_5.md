# Build 11.0.5 Overlay Manifest

This package intentionally contains only files added or replaced by the Build 11.0.5 infrastructure patch.

## Files

- `render.yaml`
- `BUILD_11_0_5.md`
- `DEPLOY_BUILD_11_0_5.txt`
- `PATCH_MANIFEST_11_0_5.md`
- `docs/RELEASE_SIGN_OFF_11_0_5.md`
- `docs/RENDER_BLUEPRINT_RECOVERY_11_0_5.md`
- `docs/PRODUCTION_BASELINE_11_0_5.md`
- `scripts/verify-build-11.0.5.mjs`

## Application baseline

All application source, migrations, dependencies and tests remain those of the complete Build 11.0.4 repository.

## Installation rule

Overlay these files onto the existing repository. Do not use this overlay as a replacement for the complete repository.
