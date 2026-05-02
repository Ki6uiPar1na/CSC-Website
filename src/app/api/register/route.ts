import { NextResponse } from "next/server";
import { UserModel } from "@/models/UserModel";
import bcrypt from "bcryptjs";
import { verifyCaptcha } from "@/lib/captcha-utils";

export async function POST(req: Request) {
  try {
    const { username, email, password, captchaAnswer, captchaToken } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!verifyCaptcha(captchaAnswer, captchaToken)) {
      return NextResponse.json({ error: "Invalid verification code. Access denied." }, { status: 400 });
    }

    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await UserModel.createUser(username, email, passwordHash);

    return NextResponse.json({ message: "User created", userId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
