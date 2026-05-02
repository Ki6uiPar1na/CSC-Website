import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

// PUT: Update individual payment request (approve/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const adminId = auth.userId;
    const requestId = parseInt(id);

    if (!requestId) {
      return NextResponse.json(
        { error: "Payment request ID required" },
        { status: 400 }
      );
    }

    const { status, rejection_reason } = await request.json();

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
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
    const requestUserId = (paymentRequest as any).user_id;

    if (status === "approved") {
      // Check if user already has active premium
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM upgrade_codes WHERE used_by_user_id = ? AND is_active = TRUE AND expires_at > NOW()`,
        [requestUserId]
      );

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "User already has active premium membership" },
          { status: 400 }
        );
      }

      // Create upgrade code
      const premiumCode = `PAY-${(paymentRequest as any).payment_method.toUpperCase()}-${(paymentRequest as any).transaction_id.toUpperCase()}`.substring(0, 50);
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 2);

      await pool.query(
        `INSERT INTO upgrade_codes (code, used_by_user_id, is_active, expires_at, validity_months, created_by_admin_id, created_at)
         VALUES (?, ?, TRUE, ?, 2, NULL, NOW())`,
        [premiumCode, requestUserId, expiresAt]
      );

      // Update payment request status
      await pool.query(
        `UPDATE payment_requests SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
        [adminId, requestId]
      );

      // Create approval notification
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, created_at) 
         VALUES (?, 'payment_approved', 'Payment Request Approved', 'Your payment request has been approved! Your premium membership is now active for 2 months.', NOW())`,
        [requestUserId]
      );

      return NextResponse.json({
        message: "Payment request approved. Premium membership activated.",
      });
    } else {
      // Reject action
      await pool.query(
        `UPDATE payment_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?`,
        [adminId, rejection_reason || "", requestId]
      );

      // Create rejection notification
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, created_at) 
         VALUES (?, 'payment_rejected', 'Payment Request Rejected', ?, NOW())`,
        [requestUserId, `Your payment request was rejected. Reason: ${rejection_reason || "No reason provided"}`]
      );

      return NextResponse.json({
        message: "Payment request rejected.",
      });
    }
  } catch (error: any) {
    console.error("Error updating payment request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update payment request" },
      { status: 500 }
    );
  }
}
