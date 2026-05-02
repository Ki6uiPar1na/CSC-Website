import { NextResponse, NextRequest } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting (60 per minute)
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_RESOURCES"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }
    const rows = await withCache(
      CACHE_KEYS.RESOURCES,
      async () => {
        const [result] = await pool.query<RowDataPacket[]>(
          `SELECT r.id, r.title, r.description, r.url, r.category, r.is_external,
                  ru.url as extra_url, ru.display_name as extra_display_name
           FROM resources r
           LEFT JOIN resource_urls ru ON r.id = ru.resource_id
           ORDER BY r.category, r.created_at DESC`
        );
        return result;
      },
      CACHE_TTL.VERY_LONG
    );

    // Group by category
    const categories: { [key: string]: any } = {};
    
    rows.forEach(row => {
      const categoryName = row.category || "General";
      if (!categories[categoryName]) {
        categories[categoryName] = {
          name: categoryName,
          links: []
        };
      }

      // Check if this resource is already in the links (due to JOIN with extra URLs)
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

    return NextResponse.json({ categories: Object.values(categories) }, { status: 200 });
  } catch (error: any) {
    console.error("Resources API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
