import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkRateLimitByConfig } from "@/lib/rateLimit";
import { verifyCaptcha } from "@/lib/captcha-utils";

interface ResetToken extends RowDataPacket {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  used_at: Date | null;
}

export async function POST(req: Request) {
  try {
    const { token, password, captchaAnswer, captchaToken } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (!verifyCaptcha(captchaAnswer || "", captchaToken || "")) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const limitCheck = checkRateLimitByConfig(ip, "LOGIN");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const [rows] = await pool.query<ResetToken[]>(
      "SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > NOW()",
      [token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const resetToken = rows[0];
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, resetToken.user_id]);
    await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [resetToken.id]);

    return NextResponse.json({ message: "Password reset successfully" });
  } catch {
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
