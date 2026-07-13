# Build 7.7.0

Build 7.7.0 fixes the non-responsive Admin and other top navigation dropdowns and expands the release testing standard to require interaction-completeness testing.

## Navigation correction

- Replaces the unreliable native-details implementation with an explicit React button/menu component.
- Operations, Insights, Admin, and Help buttons each toggle a controlled menu.
- Only one menu can be open at a time.
- Menus close on selection, outside click/tap, and Escape.
- Buttons expose `aria-expanded`, `aria-controls`, and menu semantics.
- Today, Logout, and restaurant switching remain explicit links/forms.

## Testing-plan expansion

The detailed testing plan now requires every user-action surface to be inventoried and tested, including every button, form, dropdown, link, tab, modal, field, table action, print/export control, and other clickable or keyboard-operable element.

Each interaction must be tested for normal, invalid, boundary, permission, tenant, failure, regression, operational, accessibility, responsive, concurrency, and navigation behavior.

## Automated interaction coverage

- Opens and closes all four top menus.
- Tests outside-click and Escape behavior.
- Clicks every top-menu destination and verifies the expected route loads without a server exception.
- Runs an accessible-name inventory across primary application routes.
- Executes through both desktop Chrome and Pixel 7 mobile projects in CI.
