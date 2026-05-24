import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM resources"
    );
    const total = (countResult[0] as any).total;

    const [resources] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.title, r.description, r.url, r.category, r.is_external, r.created_at, r.created_by_admin_id,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', ru.id,
                  'url', ru.url,
                  'display_name', ru.display_name,
                  'url_order', ru.url_order
                )
              ) as urls
       FROM resources r
       LEFT JOIN resource_urls ru ON r.id = ru.resource_id
       GROUP BY r.id
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return NextResponse.json({
      resources,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (error: any) {
    console.error("Get Resources Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const userId = auth.userId;
    const body = await req.json();
    const { title, description, url, category, is_external, urls } = body;

    if (!title || !url) {
      return NextResponse.json({ error: "Title and URL required" }, { status: 400 });
    }

    const [result] = await pool.query(
      `INSERT INTO resources (title, description, url, category, is_external, created_by_admin_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description || "", url, category || "General", is_external !== false, userId]
    );

    const resourceId = (result as any).insertId;

    // Add additional URLs if provided
    if (urls && Array.isArray(urls) && urls.length > 0) {
      for (let i = 0; i < urls.length; i++) {
        const urlData = urls[i];
        if (urlData.url && urlData.url.trim()) {
          await pool.query(
            `INSERT INTO resource_urls (resource_id, url, display_name, url_order) VALUES (?, ?, ?, ?)`,
            [resourceId, urlData.url, urlData.display_name || `Link ${i + 1}`, i]
          );
        }
      }
    }

    // Fetch updated resources list with URLs
    const [resources] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.title, r.description, r.url, r.category, r.is_external, r.created_at, r.created_by_admin_id,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', ru.id,
                  'url', ru.url,
                  'display_name', ru.display_name,
                  'url_order', ru.url_order
                )
              ) as urls
       FROM resources r
       LEFT JOIN resource_urls ru ON r.id = ru.resource_id
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    );

    // Send notification to all users about new resource
    const resourceNotif = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, target_audience, created_at)
       VALUES (NULL, 'resource_update', 'New Resource Added', ?, 'all_users', NOW())`,
      [`New resource "${title}" has been added. Check the resources page to explore it.`]
    );
    console.log("Resource creation notification sent:", resourceNotif);

    return NextResponse.json(
      { success: true, message: "Resource created", resources },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create Resource Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { resourceId, title, description, url, category, is_external, urls } = body;

    if (!resourceId) return NextResponse.json({ error: "Resource ID required" }, { status: 400 });

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (url !== undefined) {
      updates.push("url = ?");
      values.push(url);
    }
    if (category !== undefined) {
      updates.push("category = ?");
      values.push(category);
    }
    if (is_external !== undefined) {
      updates.push("is_external = ?");
      values.push(is_external);
    }

    if (updates.length === 0 && !urls) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (updates.length > 0) {
      values.push(resourceId);
      await pool.query(`UPDATE resources SET ${updates.join(", ")} WHERE id = ?`, values);
    }

    // Handle multiple URLs if provided
    if (urls && Array.isArray(urls)) {
      // Delete existing URLs
      await pool.query(`DELETE FROM resource_urls WHERE resource_id = ?`, [resourceId]);

      // Add new URLs
      for (let i = 0; i < urls.length; i++) {
        const urlData = urls[i];
        if (urlData.url && urlData.url.trim()) {
          await pool.query(
            `INSERT INTO resource_urls (resource_id, url, display_name, url_order) VALUES (?, ?, ?, ?)`,
            [resourceId, urlData.url, urlData.display_name || `Link ${i + 1}`, i]
          );
        }
      }
    }

    // Fetch updated resources list with URLs
    const [resources] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.title, r.description, r.url, r.category, r.is_external, r.created_at, r.created_by_admin_id,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', ru.id,
                  'url', ru.url,
                  'display_name', ru.display_name,
                  'url_order', ru.url_order
                )
              ) as urls
       FROM resources r
       LEFT JOIN resource_urls ru ON r.id = ru.resource_id
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    );

    // Send notification to all users
    const resourceTitle = title || "Resource";
    const updateNotif = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, target_audience, created_at)
       VALUES (NULL, 'resource_update', 'Resource Updated', ?, 'all_users', NOW())`,
      [`Resource "${resourceTitle}" has been updated. Check the resources page for details.`]
    );
    console.log("Resource update notification sent:", updateNotif);

    return NextResponse.json(
      { success: true, message: "Resource updated", resources },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update Resource Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { resourceId } = body;

    if (!resourceId) return NextResponse.json({ error: "Resource ID required" }, { status: 400 });

    await pool.query("DELETE FROM resources WHERE id = ?", [resourceId]);

    // Fetch updated resources list with URLs
    const [resources] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.title, r.description, r.url, r.category, r.is_external, r.created_at, r.created_by_admin_id,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', ru.id,
                  'url', ru.url,
                  'display_name', ru.display_name,
                  'url_order', ru.url_order
                )
              ) as urls
       FROM resources r
       LEFT JOIN resource_urls ru ON r.id = ru.resource_id
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    );

    return NextResponse.json({ success: true, message: "Resource deleted", resources }, { status: 200 });
  } catch (error: any) {
    console.error("Delete Resource Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
