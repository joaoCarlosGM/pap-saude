import assert from "node:assert/strict";
import { test } from "node:test";
import {
  invitationBaseUrl,
  invitationTemplate,
  sendInvitationEmail,
} from "../../src/server/email/email.service";
const input = {
  to: "recipient@synthetic.invalid",
  displayName: '<script>"Name"',
  organizationName: "UBS & <fake>",
  invitationUrl: "http://localhost:3000/convite?token=synthetic-token",
  invitationId: "synthetic-id",
};
test("institutional template escapes content and includes plain text, validity and support", () => {
  const result = invitationTemplate(input);
  assert.ok(result.html.includes("&lt;script&gt;"));
  assert.ok(!result.html.includes("<script>"));
  assert.ok(result.html.includes("UBS &amp; &lt;fake&gt;"));
  assert.ok(result.text.includes("48 horas"));
  assert.ok(result.html.includes("administrador da sua UBS"));
});
test("production origin allowlist, credentials and provider fail closed", async () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      PAP_PUBLIC_URL: "https://pap.synthetic.invalid",
      PAP_EMAIL_ALLOWED_HOSTS: "pap.synthetic.invalid",
    });
    assert.equal(invitationBaseUrl(), "https://pap.synthetic.invalid");
    for (const url of [
      "http://pap.synthetic.invalid",
      "https://evil.invalid",
      "https://user:pass@pap.synthetic.invalid",
      "https://pap.synthetic.invalid/path",
      "javascript:alert(1)",
    ]) {
      process.env.PAP_PUBLIC_URL = url;
      assert.throws(invitationBaseUrl);
    }
    process.env.PAP_PUBLIC_URL = "https://pap.synthetic.invalid";
    process.env.PAP_EMAIL_PROVIDER = "resend";
    delete process.env.RESEND_API_KEY;
    await assert.rejects(
      sendInvitationEmail({
        ...input,
        invitationUrl: "https://pap.synthetic.invalid/convite?token=fake",
      }),
    );
    process.env.PAP_EMAIL_PROVIDER = "none";
    await assert.rejects(
      sendInvitationEmail({
        ...input,
        invitationUrl: "https://pap.synthetic.invalid/convite?token=fake",
      }),
    );
  } finally {
    for (const k of Object.keys(process.env))
      if (!(k in previous)) delete process.env[k];
    Object.assign(process.env, previous);
  }
});
