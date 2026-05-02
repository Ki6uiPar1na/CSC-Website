import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const images: any[] = [];

    // 1. Fetch Event Posters and Gallery
    const [events] = await pool.query<RowDataPacket[]>(
      "SELECT id, title, photo_url, gallery_images, event_date as date FROM events WHERE is_active = TRUE"
    );

    events.forEach(event => {
      if (event.photo_url) {
        images.push({
          url: event.photo_url,
          source: "Event Poster",
          title: event.title,
          date: event.date
        });
      }
      if (event.gallery_images) {
        try {
          const gallery = JSON.parse(event.gallery_images);
          if (Array.isArray(gallery)) {
            gallery.forEach((img, idx) => {
              images.push({
                url: img,
                source: "Event Gallery",
                title: `${event.title} - Photo ${idx + 1}`,
                date: event.date
              });
            });
          }
        } catch (e) {}
      }
    });

    // 2. Fetch Achievement Gallery
    const [achievements] = await pool.query<RowDataPacket[]>(
      "SELECT id, competition_name, gallery_images, achievement_date as date FROM competition_achievements"
    );

    achievements.forEach(ach => {
      if (ach.gallery_images) {
        try {
          const gallery = JSON.parse(ach.gallery_images);
          if (Array.isArray(gallery)) {
            gallery.forEach((img, idx) => {
              images.push({
                url: img,
                source: "Achievement Gallery",
                title: `${ach.competition_name} - Photo ${idx + 1}`,
                date: ach.date
              });
            });
          }
        } catch (e) {}
      }
    });

    // 3. Fetch Contest Photos
    const [contests] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, photo_url, event_date as date FROM contests"
    );

    contests.forEach(contest => {
      if (contest.photo_url) {
        images.push({
          url: contest.photo_url,
          source: "Contest Photo",
          title: contest.name,
          date: contest.date || new Date().toISOString()
        });
      }
    });

    // 4. Fetch Executive Photos
    const [executives] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, role, photo_url, created_at as date FROM executives"
    );

    executives.forEach(exec => {
      if (exec.photo_url) {
        images.push({
          url: exec.photo_url,
          source: "Executive Photo",
          title: `${exec.name} - ${exec.role}`,
          date: exec.date
        });
      }
    });

    // 5. Fetch Alumni Photos
    const [alumni] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, photo_url, created_at as date FROM alumni"
    );

    alumni.forEach(alum => {
      if (alum.photo_url) {
        images.push({
          url: alum.photo_url,
          source: "Alumni Photo",
          title: alum.name,
          date: alum.date
        });
      }
    });

    // Sort by date descending
    images.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(images);
  } catch (error: any) {
    console.error("Gallery API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
