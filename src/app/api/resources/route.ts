import { NextResponse, NextRequest } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_RESOURCES"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [totalResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM resources"
    );
    const total = (totalResult[0] as any).total;

    const rows = await withCache(
      CACHE_KEYS.RESOURCES,
      async () => {
        const [result] = await pool.query<RowDataPacket[]>(
          `SELECT r.id, r.title, r.description, r.url, r.category, r.is_external,
                  ru.url as extra_url, ru.display_name as extra_display_name
           FROM resources r
           LEFT JOIN resource_urls ru ON r.id = ru.resource_id
           ORDER BY r.category, r.created_at DESC
           LIMIT ? OFFSET ?`,
          [limit, offset]
        );
        return result;
      },
      CACHE_TTL.VERY_LONG,
      { page }
    );

    const categories: { [key: string]: any } = {};
    
    rows.forEach(row => {
      const categoryName = row.category || "General";
      if (!categories[categoryName]) {
        categories[categoryName] = {
          name: categoryName,
          links: []
        };
      }

      let resource = categories[categoryName].links.find((l: any) => l.id === row.id);
      if (!resource) {
        resource = {
          id: row.id,
          name: row.title,
          url: row.url,
          description: row.description,
          extraLinks: []
        };
        categories[categoryName].links.push(resource);
      }

      if (row.extra_url) {
        resource.extraLinks.push({
          url: row.extra_url,
          name: row.extra_display_name
        });
      }
    });

    return NextResponse.json({
      categories: Object.values(categories),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (error: any) {
    console.error("Resources API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
