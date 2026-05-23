import { NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    const res = await fetch(`https://ctftime.org/api/v1/teams/${id}/`, {
      headers: { "User-Agent": "JKKNIU-CSC/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Team not found on CTFtime" },
        { status: res.status }
      );
    }

    const teamData = await res.json();

    const rating = teamData.rating || {};

    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      years.push(y);
    }

    const participated: any[] = [];

    await Promise.allSettled(
      years.map(async (year) => {
        try {
          const yearRes = await fetch(
            `https://ctftime.org/api/v1/results/${year}/?limit=500`,
            { headers: { "User-Agent": "JKKNIU-CSC/1.0" } }
          );
          if (!yearRes.ok) return;

          const eventsData = await yearRes.json();

          for (const [eventId, eventInfo] of Object.entries(eventsData)) {
            const scores = (eventInfo as any).scores || [];
            for (const score of scores) {
              if (String(score.team_id) === id) {
                participated.push({
                  event_id: parseInt(eventId),
                  title: (eventInfo as any).title,
                  place: score.place,
                  points: score.points,
                  year,
                });
                break;
              }
            }
          }
        } catch {
          // skip year on error
        }
      })
    );

    participated.sort((a, b) => b.year - a.year || (a.place || 9999) - (b.place || 9999));

    return NextResponse.json({
      ...teamData,
      participated_events: participated,
    });
  } catch (error: any) {
    console.error("CTFtime Team Proxy Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from CTFtime" },
      { status: 502 }
    );
  }
}
