import { test } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import * as OTPAuth from "otpauth";
test("offline QR preserves the interoperable TOTP URI without remote services", async () => {
  const uri = new OTPAuth.TOTP({
    issuer: "PAP Saúde",
    label: "synthetic@invalid.test",
    secret: new OTPAuth.Secret({ size: 20 }),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  }).toString();
  const png = PNG.sync.read(
    await QRCode.toBuffer(uri, { width: 256, margin: 4 }),
  );
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(decoded?.data === uri, "QR must decode to the original URI");
});
