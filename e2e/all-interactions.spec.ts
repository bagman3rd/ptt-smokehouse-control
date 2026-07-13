import { test, expect, type Page } from '@playwright/test';

const password = process.env.ADMIN_PASSWORD || 'ci-admin-password';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username or Email').fill('admin');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/today/);
}

const menus = [
  {
    slug: 'operations',
    links: [
      ['dashboard', /\/dashboard/],
      ['cook-plan', /\/cook-plan/],
      ['end-of-day', /\/end-of-day/],
      ['smoker-schedule', /\/admin\/smokers\/schedule/]
    ]
  },
  {
    slug: 'insights',
    links: [
      ['reports', /\/reports/],
      ['learning', /\/learning$/],
      ['forecast-proof', /\/learning\/proof/],
      ['tour', /\/tour/]
    ]
  },
  {
    slug: 'admin',
    links: [
      ['settings', /\/settings/],
      ['users', /\/admin\/users/],
      ['restaurants', /\/admin\/restaurants$/],
      ['pos-import', /\/admin\/restaurants\/pos/],
      ['smokers', /\/admin\/smokers$/],
      ['smoker-catalog', /\/admin\/smokers\/catalog/],
      ['audit-log', /\/admin\/audit/],
      ['system', /\/admin\/system/],
      ['billing', /\/billing/],
      ['data', /\/admin\/data/]
    ]
  },
  {
    slug: 'help',
    links: [
      ['support', /\/support/],
      ['help-docs', /\/help/],
      ['demo', /\/demo/],
      ['account', /\/account\/security/]
    ]
  }
] as const;

test('every top navigation dropdown opens, closes, and every menu link navigates', async ({ page }) => {
  await login(page);

  for (const menu of menus) {
    const button = page.getByTestId(`nav-menu-button-${menu.slug}`);
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId(`nav-menu-panel-${menu.slug}`)).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');

    for (const [linkSlug, expectedUrl] of menu.links) {
      await button.click();
      await expect(page.getByTestId(`nav-menu-panel-${menu.slug}`)).toBeVisible();
      await page.getByTestId(`nav-link-${linkSlug}`).click();
      await expect(page).toHaveURL(expectedUrl);
      await expect(page.getByText(/Application error: a server-side exception/)).toHaveCount(0);
      await page.goto('/today');
    }
  }
});

test('dropdowns close on outside click and Escape', async ({ page }) => {
  await login(page);
  const admin = page.getByTestId('nav-menu-button-admin');
  await admin.click();
  await expect(page.getByTestId('nav-menu-panel-admin')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('nav-menu-panel-admin')).toHaveCount(0);

  await admin.click();
  await expect(page.getByTestId('nav-menu-panel-admin')).toBeVisible();
  await page.getByRole('heading', { name: 'Today' }).click();
  await expect(page.getByTestId('nav-menu-panel-admin')).toHaveCount(0);
});

test('all visible interactive controls have an accessible name or explicit label', async ({ page }) => {
  await login(page);
  const routes = [
    '/today', '/dashboard', '/cook-plan', '/end-of-day', '/reports', '/learning', '/learning/proof',
    '/settings', '/admin/users', '/admin/restaurants', '/admin/restaurants/pos', '/admin/smokers',
    '/admin/smokers/catalog', '/admin/smokers/schedule', '/admin/audit', '/admin/system', '/billing',
    '/admin/data', '/support', '/help', '/demo', '/account/security'
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.getByText(/Application error: a server-side exception/)).toHaveCount(0);
    const unlabeled = await page.locator('button:visible, a[href]:visible, input:visible, select:visible, textarea:visible').evaluateAll((elements) =>
      elements.filter((element) => {
        const html = element as HTMLElement;
        const text = (html.innerText || '').trim();
        const aria = html.getAttribute('aria-label') || html.getAttribute('aria-labelledby');
        const title = html.getAttribute('title');
        const id = html.id;
        const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const placeholder = html.getAttribute('placeholder');
        const value = element instanceof HTMLInputElement && ['submit', 'button'].includes(element.type) ? element.value : '';
        return !text && !aria && !title && !label && !placeholder && !value;
      }).map((element) => element.outerHTML.slice(0, 240))
    );
    expect(unlabeled, `Unlabeled interactive controls on ${route}`).toEqual([]);
  }
});
