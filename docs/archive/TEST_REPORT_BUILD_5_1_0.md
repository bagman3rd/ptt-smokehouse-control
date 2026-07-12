# Test Report — Build 5.1.0

## Static checks completed

- Package version updated to 5.1.0
- Nav badge updated to Build 5.1.0
- README updated to Build 5.1.0
- Smoker scheduling library exists
- Admin smoker schedule page exists
- Today page uses smoker scheduling library
- Cook plan print view includes smoker schedule section
- Render build uses prisma migrate deploy
- Render build does not use prisma db push
- Render build does not use --accept-data-loss

## Live checks still required

- GitHub Actions CI after push
- Render production deploy
- Click test `/today`
- Click test `/admin/smokers/schedule`
- Print test `/cook-plan/print`
