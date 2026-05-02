import { NextResponse } from "next/server";
import { UserModel } from "@/models/UserModel";

export async function GET() {
  try {
    const leaderboard = await UserModel.getLeaderboard();
    return NextResponse.json(leaderboard);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
