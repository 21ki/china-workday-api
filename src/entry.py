from datetime import datetime
from zoneinfo import ZoneInfo

import chinese_calendar as cc
from workers import Response, WorkerEntrypoint


TZ = ZoneInfo("Asia/Shanghai")


def json_response(data, status=200):
    import json

    return Response(
        json.dumps(data, ensure_ascii=False),
        status=status,
        headers={
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
        },
    )


def china_now():
    return datetime.now(TZ)


class Default(WorkerEntrypoint):

    async def fetch(self, request):
        url = request.url

        # /
        if url.endswith("/"):
            return Response(
                "China Workday API\n\n"
                "GET  /api/is_workday?date=YYYY-MM-DD\n"
                "POST /api/is_workday\n"
                "GET  /api/actuator/health\n"
            )

        # health
        if "/api/actuator/health" in url:
            now = china_now()

            return json_response({
                "status": "UP",
                "timezone": "Asia/Shanghai",
                "china_time": now.isoformat(),
            })

        # workday
        if "/api/is_workday" in url:

            from urllib.parse import urlparse, parse_qs
            import json

            parsed = urlparse(url)
            params = parse_qs(parsed.query)

            date_str = params.get("date", [None])[0]

            # POST JSON
            if request.method == "POST":
                try:
                    body = await request.text()
                    data = json.loads(body)
                    date_str = data.get("date")
                except Exception:
                    return json_response({
                        "error": "Invalid JSON body"
                    }, 400)

            elif request.method != "GET":
                return json_response({
                    "error": "Method Not Allowed"
                }, 405)

            # 未指定日期 → 中国时间今天
            if not date_str:
                date = china_now().date()
            else:
                try:
                    date = datetime.strptime(
                        date_str,
                        "%Y-%m-%d"
                    ).date()
                except ValueError:
                    return json_response({
                        "error": "Invalid date format. Use YYYY-MM-DD"
                    }, 400)

            return json_response({
                "date": date.isoformat(),
                "is_workday": cc.is_workday(date),
                "timezone": "Asia/Shanghai",
                "china_time": china_now().isoformat(),
            })

        return json_response({
            "error": "Not Found"
        }, 404)
