import { after } from "next/server";
import { createForgotPasswordHandler } from "@/server/auth/password-recovery-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pass a callback, never an already-started promise. No identity lookup, quota
// branch or provider I/O may run until Next has finished the public response.
export const POST = createForgotPasswordHandler(after);
