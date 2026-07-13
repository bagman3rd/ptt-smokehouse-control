# Test Report — Build 7.6.1

## Defect addressed

The Admin and other top dropdown controls rendered but did not consistently respond to user clicks. Build 7.6.1 replaces that implementation with an explicit state-controlled client component and adds direct browser tests for the behavior.

## Static checks completed locally

- Navigation component contains explicit button toggle behavior.
- Outside pointer and Escape handlers are present.
- Accessible expanded/menu semantics are present.
- Operations, Insights, Admin, and Help groups remain defined.
- All existing page and role mappings remain unchanged.
- The interaction-completeness testing plan is present.
- Package and workflow references identify Build 7.6.1.

## Runtime tests configured for CI

- Every top menu opens and closes.
- Every menu destination is clicked and must load the expected route.
- No destination may display the Next.js server-exception page.
- Outside click/tap and Escape close open menus.
- Interactive controls across primary routes must have accessible names.
- Tests run in desktop Chrome and Pixel 7 mobile emulation.

## Remaining manual acceptance

Physical-device testing is still required on the actual Windows/Chrome setup and kitchen mobile devices, including mouse, touch, keyboard, zoom, and slow-network behavior.
