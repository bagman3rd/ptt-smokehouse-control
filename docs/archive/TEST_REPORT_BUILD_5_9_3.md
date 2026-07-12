# Test Report — Build 5.9.3

## Passed static and regression checks

- Package and navigation version: 5.9.3.
- Add and edit smoker forms both display “Smoker Brand.”
- Location is a required dropdown with the four approved values.
- Cook window is a required dropdown with the five approved values.
- Server actions reject location or cook-window values outside the approved lists.
- Manufacturer whole-chicken capacities convert one-for-one to project double-breast capacity.
- Southern Pride SPK-500 preloads 70 chicken breasts per cook under the project equivalency rule.
- Build 5.9.3 evaluation script passes.

## Environment limitation

A full dependency install, TypeScript compile, and Next.js production build could not run in the sandbox because external npm registry access was unavailable. The source package does not contain node_modules or a lockfile. The included Render build process will install dependencies and execute the normal Prisma/Next.js build when deployed.
