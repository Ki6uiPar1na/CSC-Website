import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET() {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;
    // Get all codes with their usage info
    const [codes] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, is_used, used_by_user_id, is_active, deleted_at, subscription_expires_at 
       FROM upgrade_codes 
       ORDER BY id DESC LIMIT 10`
    );

    // Get users with subscriptions
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT id, username, subscription_status, subscription_expires_at 
       FROM users 
       LIMIT 10`
    );

    return NextResponse.json({
      codes,
      users,
      note: "This is a debug endpoint - remove in production"
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;
    const resourceCategories = [
      {
        name: "Web Exploitation",
        links: [
          { name: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security" },
          { name: "OWASP Top Ten Project", url: "https://owasp.org/www-project-top-ten/" },
          { name: "PaylaodsAllTheThings", url: "https://github.com/swisskyrepo/PayloadsAllTheThings" }
        ]
      },
      {
        name: "Reverse Engineering & Pwn",
        links: [
          { name: "LiveOverflow YouTube Series", url: "https://www.youtube.com/c/LiveOverflow" },
          { name: "Nightmare (CTF Pwn Course)", url: "https://guyinatuxedo.github.io/index.html" },
          { name: "How2Heap", url: "https://github.com/shellphish/how2heap" }
        ]
      },
      {
        name: "Cryptography",
        links: [
          { name: "CryptoHack", url: "https://cryptohack.org/" },
          { name: "CryptoPals Challenges", url: "https://cryptopals.com/" },
          { name: "CyberChef Tool", url: "https://gchq.github.io/CyberChef/" }
        ]
      },
      {
        name: "Forensics",
        links: [
          { name: "Forensics Wiki", url: "https://forensicswiki.xyz/page/Main_Page" },
          { name: "Volatility Framework", url: "https://www.volatilityfoundation.org/" },
          { name: "Auri's Forensics Writeups", url: "https://github.com/Auri-M/CTF-Writeups" }
        ]
      }
    ];

    const [admins] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE role_id = 1 LIMIT 1");
    if (admins.length === 0) return NextResponse.json({ error: "No admin found" }, { status: 400 });
    const adminId = admins[0].id;

    await pool.query("DELETE FROM resource_urls");
    await pool.query("DELETE FROM resources");

    for (const category of resourceCategories) {
      for (const link of category.links) {
        await pool.query(
          "INSERT INTO resources (title, url, category, description, is_external, created_by_admin_id) VALUES (?, ?, ?, ?, ?, ?)",
          [link.name, link.url, category.name, `Curated resource for ${category.name}`, true, adminId]
        );
      }
    }

    return NextResponse.json({ success: true, message: "Resources seeded successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

