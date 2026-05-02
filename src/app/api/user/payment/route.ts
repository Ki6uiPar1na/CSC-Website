import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

// GET: Check for pending payment request
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Check for pending payment request
    const [pendingRequests] = await pool.query<RowDataPacket[]>(
      `SELECT id, payment_method, transaction_id, created_at FROM payment_requests WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );

    // Check for rejected requests (get the latest one)
    const [rejectedRequests] = await pool.query<RowDataPacket[]>(
      `SELECT id, rejection_reason, reviewed_at FROM payment_requests WHERE user_id = ? AND status = 'rejected' ORDER BY reviewed_at DESC LIMIT 1`,
      [userId]
    );

    return NextResponse.json({
      pendingRequest: pendingRequests.length > 0 ? pendingRequests[0] : null,
      rejectedRequest: rejectedRequests.length > 0 ? rejectedRequests[0] : null,
    });
  } catch (error: any) {
    console.error("Error fetching pending payment request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending request" },
      { status: 500 }
    );
  }
}

// POST: Create or update payment request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { plan, amount, payment_method, transaction_id, requestId } = await request.json();

    // Validate input
    if (!plan || !amount || !payment_method || !transaction_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (payment_method && !["bkash", "nagad", "rocket"].includes(payment_method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Check if user exists
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has an active premium membership
    const [existingPremium] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM upgrade_codes WHERE used_by_user_id = ? AND is_active = TRUE AND expires_at > NOW()`,
      [userId]
    );

    if (existingPremium.length > 0) {
      return NextResponse.json(
        { error: "You already have an active premium membership" },
        { status: 400 }
      );
    }

    if (requestId) {
      // Update existing pending request
      await pool.query(
        `UPDATE payment_requests SET payment_method = ?, transaction_id = ?, created_at = NOW() WHERE id = ? AND user_id = ? AND status = 'pending'`,
        [payment_method, transaction_id, requestId, userId]
      );

      return NextResponse.json({
        message: "Payment request updated successfully! Admin will review the updated details shortly.",
        plan,
        amount,
        payment_method,
        transaction_id,
      });
    } else {
      // Check if user already has a pending payment request
      const [pendingRequest] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM payment_requests WHERE user_id = ? AND status = 'pending'`,
        [userId]
      );

      if (pendingRequest.length > 0) {
        return NextResponse.json(
          { error: "You already have a pending payment request. Please use the edit option to update it." },
          { status: 400 }
        );
      }

      // Create a new pending payment request for admin review
      await pool.query(
        `INSERT INTO payment_requests (user_id, plan, amount, payment_method, transaction_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
        [userId, plan, amount, payment_method, transaction_id]
      );

      return NextResponse.json({
        message: "Payment request submitted successfully! Admin will review and approve shortly.",
        plan,
        amount,
        payment_method,
        transaction_id,
      });
    }
  } catch (error: any) {
    console.error("Payment Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment" },
      { status: 500 }
    );
  }
}
