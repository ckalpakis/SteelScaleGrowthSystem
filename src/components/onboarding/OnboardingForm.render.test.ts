import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

// Server-render the public form (as the /onboard/:token route would) and assert
// it produces the expected mobile-first, client-safe markup.
function render(): string {
  return renderToString(
    createElement(OnboardingShell, null, createElement(OnboardingForm, { token: "tok_render_test_1234567890", defaultEmail: "owner@biz.com" })),
  );
}

describe("OnboardingForm SSR", () => {
  const html = render();

  it("renders the first step with labelled inputs", () => {
    expect(html).toContain("Business setup");
    expect(html).toContain("Public business name");
    expect(html).toContain('for="public_business_name"');
    expect(html).toContain("Continue");
  });

  it("seeds the invitation email", () => {
    expect(html).toContain("owner@biz.com");
  });

  it("uses client-facing terminology, never vendor/integration terms", () => {
    const lower = html.toLowerCase();
    for (const term of ["gohighlevel", "leadconnector", "twilio", "snapshot", "subaccount"]) {
      expect(lower).not.toContain(term);
    }
    // "API" must not appear as a word.
    expect(/\bapi\b/i.test(html)).toBe(false);
    // Positive: the approved product name is present.
    expect(html).toContain("Steel Scale review system");
  });

  it("has accessible progress semantics", () => {
    expect(html).toContain('role="progressbar"');
  });
});
