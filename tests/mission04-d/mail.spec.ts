import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { transactionalTemplate } from "../../src/server/email/templates";
import { mkdir } from "node:fs/promises";
for (const width of [320, 768, 1440]) for (const scheme of ["light", "dark"] as const) {
  test(`transactional email ${width}px ${scheme}: accessibility, keyboard, overflow, all templates`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: scheme });
    // No provider, DB, real recipient or bearer link in browser fixtures/evidence.
    await page.route("**/*", route => route.abort());
    for (const kind of ["INVITATION", "PASSWORD_RESET", "ACCESS_APPROVED", "UBS_ACTIVATED", "ACCESS_CLOSED"] as const) {
      const mail = transactionalTemplate({ kind, displayName: "Pessoa demonstrativa", roleKey: "COMMERCIAL", organizationName: "UBS demonstrativa", url: "https://example.test/login", expiresAt: new Date("2026-10-25T12:00:00Z") });
      await page.setContent(mail.html);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(axe.violations).toEqual([]);
      await page.keyboard.press("Tab"); await expect(page.getByRole("link")).toBeFocused();
    }
    await mkdir("docs/evidence/missao-04-d", { recursive: true });
    await page.screenshot({ path: `docs/evidence/missao-04-d/email-${width}-${scheme}.png`, fullPage: true });
  });
}
