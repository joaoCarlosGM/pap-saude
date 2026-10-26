import { receiveResendWebhook } from "@/server/email/resend-webhook.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Machine endpoint: Svix signature/timestamp/replay controls replace browser CSRF.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  try {
    if (!(request.headers.get("content-type") || "").startsWith("application/json") || !request.body) throw new Error("INVALID_WEBHOOK");
    const reader = request.body.getReader(), chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65536) { await reader.cancel(); throw new Error("INVALID_WEBHOOK"); }
      chunks.push(value);
    }
    await receiveResendWebhook(Buffer.concat(chunks).toString("utf8"), request.headers);
    return Response.json({ accepted: true }, { headers });
  } catch (error) {
    return Response.json({ accepted: false }, { status: error instanceof Error && error.message === "WEBHOOK_RETRY" ? 503 : 400, headers });
  }
}
