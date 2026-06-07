import { NextResponse } from "next/server";
import { UserModel } from "@/models/UserModel";
import crypto from "crypto";
import pool from "@/models/db";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { checkRateLimitByConfig } from "@/lib/rateLimit";
import { verifyCaptcha } from "@/lib/captcha-utils";

export async function POST(req: Request) {
  try {
    const { email, captchaAnswer, captchaToken } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!verifyCaptcha(captchaAnswer || "", captchaToken || "")) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const limitCheck = checkRateLimitByConfig(ip, "REGISTER");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return NextResponse.json({ message: "If an account with that email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt]
    );

    const baseUrl = process.env.NEXTAUTH_URL || "https://club.jkkniuctf.tech";
    const resetLink = `${baseUrl}/reset-password/${token}`;

    await sendPasswordResetEmail(user.email, user.username, resetLink);

    return NextResponse.json({ message: "If an account with that email exists, a reset link has been sent." });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
