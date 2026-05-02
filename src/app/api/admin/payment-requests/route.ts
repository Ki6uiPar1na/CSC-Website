import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

// GET: Retrieve pending payment requests
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response!;

    const [requests] = await pool.query<RowDataPacket[]>(
      `SELECT pr.id, pr.user_id, u.username, u.email, pr.plan, pr.amount, 
              pr.payment_method, pr.transaction_id, pr.status, pr.created_at, 
              pr.reviewed_at, pr.reviewed_by, pr.rejection_reason
       FROM payment_requests pr
       JOIN users u ON pr.user_id = u.id
       ORDER BY pr.created_at DESC`
    );

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("Error fetching payment requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment requests" },
      { status: 500 }
    );
  }
}

// POST: Approve or reject payment requests
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response!;

    const adminId = auth.userId;
    const { requestId, action, userId, amount, validity_months, rejection_reason } = await request.json();

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    if (action === "approve" && (!userId || !amount)) {
      return NextResponse.json(
        { error: "Missing required fields for approval" },
        { status: 400 }
      );
    }

    // Get the payment request
    const [requests] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM payment_requests WHERE id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    const paymentRequest = requests[0];

    if (action === "approve") {
      // Check if user already has active premium
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM upgrade_codes WHERE used_by_user_id = ? AND is_active = TRUE AND expires_at > NOW()`,
        [userId]
      );

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "User already has active premium membership" },
          { status: 400 }
        );
      }

      // Create upgrade code
      const premiumCode = `PAY-${paymentRequest.payment_method.toUpperCase()}-${paymentRequest.transaction_id.toUpperCase()}`.substring(0, 50);
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + (validity_months || 2));

      await pool.query(
        `INSERT INTO upgrade_codes (code, used_by_user_id, is_active, expires_at, validity_months, created_by_admin_id, created_at)
         VALUES (?, ?, TRUE, ?, ?, NULL, NOW())`,
        [premiumCode, userId, expiresAt, validity_months || 2]
      );

      // Update payment request status
      await pool.query(
        `UPDATE payment_requests SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
        [adminId, requestId]
      );

      // Create approval notification
      const notifResult = await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, created_at) 
         VALUES (?, 'payment_approved', 'Payment Request Approved', 'Your payment request has been approved! Your premium membership is now active for 2 months.', NOW())`,
        [userId]
      );
      console.log("Approval notification created:", notifResult);

      return NextResponse.json({
        message: "Payment request approved. Premium membership activated.",
      });
    } else {
      // Reject action - get userId from the payment request itself
      const requestUserId = (paymentRequest as any).user_id;
      
      await pool.query(
        `UPDATE payment_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?`,
        [adminId, rejection_reason || "", requestId]
      );

      // Create rejection notification
      const rejectNotif = await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, created_at) 
         VALUES (?, 'payment_rejected', 'Payment Request Rejected', ?, NOW())`,
        [requestUserId, `Your payment request was rejected. Reason: ${rejection_reason || "No reason provided"}`]
      );
      console.log("Rejection notification created:", rejectNotif);

      return NextResponse.json({
        message: "Payment request rejected.",
      });
    }
  } catch (error: any) {
    console.error("Error processing payment request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment request" },
      { status: 500 }
    );
  }
}
