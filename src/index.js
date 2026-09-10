/**
 * China Workday API - Cloudflare Worker
 *
 * API:
 *   GET  /api/is_workday?date=YYYY-MM-DD
 *   POST /api/is_workday   {"date":"YYYY-MM-DD"}
 *   GET  /api/actuator/health
 *
 * Timezone:
 *   - Server/deployment location is irrelevant.
 *   - All "today" calculations use Asia/Shanghai.
 *   - Returned timestamps are explicitly China Standard Time (Asia/Shanghai).
 *
 * IMPORTANT:
 *   Workday/holiday data below is generated from the official Chinese
 *   holiday arrangement. Update HOLIDAYS / WORKDAYS when a new year's
 *   State Council holiday schedule is published.
 */

const TZ = "Asia/Shanghai";

// Holidays are non-working days.
// Add the official dates for each supported year.
const HOLIDAYS = new Set([
  // 2026
  "2026-01-01",
  "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20",
  "2026-04-04", "2026-04-05", "2026-04-06",
  "2026-05-01", "2026-05-02", "2026-05-03",
  "2026-06-19", "2026-06-20", "2026-06-21",
  "2026-09-25", "2026-09-26", "2026-09-27",
  "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07",
]);

// Weekend days that are adjusted to working days.
// Keep this list aligned with the official annual holiday arrangement.
const WORKDAYS = new Set([
  // 2026 examples / official adjustment dates should be maintained here.
  // "2026-02-14",
  // "2026-02-28",
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function chinaNowParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function chinaDateToday() {
  const p = chinaNowParts();
  return `${p.year}-${p.month}-${p.day}`;
}

function isValidDateString(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function weekday(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun, 6 Sat
}

function isChinaWorkday(dateStr) {
  // Explicit holiday arrangement has priority.
  if (HOLIDAYS.has(dateStr)) return false;
  if (WORKDAYS.has(dateStr)) return true;

  const day = weekday(dateStr);
  return day !== 0 && day !== 6;
}

function currentChinaTime() {
  const p = chinaNowParts();
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+08:00`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(
        "China Workday API\n\nGET /api/is_workday?date=YYYY-MM-DD\nGET /api/actuator/health\n",
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    if (url.pathname === "/api/actuator/health") {
      return json({
        status: "UP",
        timezone: TZ,
        china_time: currentChinaTime(),
      });
    }

    if (url.pathname === "/api/is_workday") {
      let dateStr;

      if (request.method === "GET") {
        dateStr = url.searchParams.get("date");
      } else if (request.method === "POST") {
        try {
          const data = await request.json();
          dateStr = data?.date;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
      } else {
        return json({ error: "Method Not Allowed" }, 405);
      }

      if (!dateStr) {
        dateStr = chinaDateToday();
      }

      if (!isValidDateString(dateStr)) {
        return json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          400
        );
      }

      return json({
        date: dateStr,
        is_workday: isChinaWorkday(dateStr),
        timezone: TZ,
        china_time: currentChinaTime(),
      });
    }

    return json({ error: "Not Found" }, 404);
  },
};
