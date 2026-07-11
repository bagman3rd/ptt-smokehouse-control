# PTT Smokehouse Control — Test Report Build 1.5.1

## Scope

Build 1.5.1 changes Pulled Chicken from a generic EACH/cooked-pound presentation to a breast-based load model.

## Updated assumptions

- Pulled Chicken raw weight per breast: 2.5 lb
- Pulled Chicken cooked weight per breast: 1.875 lb
- Pulled Chicken yield: 75%
- Pulled Chicken sales value: $22 per cooked lb
- Effective sales value per breast: 1.875 × $22 = $41.25

## Expected forecast behavior

Chicken breast demand is calculated as:

1. Chicken sales dollars = smoked meat forecast × chicken mix %.
2. Cooked chicken pounds = chicken sales dollars ÷ avg sales dollars per cooked lb.
3. Chicken breasts before leftovers = cooked chicken pounds ÷ cooked lb per breast.
4. Load today = forecast breasts - prior EOD usable leftover breasts, clamped by min/max settings.

## UI checks

- Cook Plan displays Pulled Chicken in breasts.
- Dashboard displays Pulled Chicken in breasts.
- End-of-Day saved log displays Pulled Chicken in breasts.
- End-of-Day form placeholder displays breasts for usable leftover units.
- Settings labels Pulled Chicken as raw/cooked weight per breast.

## Result

Static code review passed. Prisma seed/bootstrap updates existing deployed databases to the new chicken assumptions at app boot and deployment seed.
