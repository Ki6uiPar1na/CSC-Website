import { NextResponse } from "next/server";
import { UserModel } from "@/models/UserModel";
import bcrypt from "bcryptjs";
import { verifyCaptcha } from "@/lib/captcha-utils";
import { checkRateLimitByConfig } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const { username, email, password, captchaAnswer, captchaToken } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const limitCheck = checkRateLimitByConfig(ip, "REGISTER");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    if (!verifyCaptcha(captchaAnswer, captchaToken)) {
      return NextResponse.json({ error: "Invalid verification code. Access denied." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: "Username must be between 3 and 30 characters" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await UserModel.createUser(username, email, passwordHash);

    return NextResponse.json({ message: "User created", userId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
