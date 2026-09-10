# China Workday API - Cloudflare Worker

将原 Flask 项目中的中国工作日 API 迁移到 Cloudflare Workers。

## API

### GET

```bash
curl 'https://YOUR-DOMAIN/api/is_workday?date=2026-09-10'
```

### 不传日期

无论 Worker 实际运行在哪个 Cloudflare 数据中心，都会按 `Asia/Shanghai`
计算今天：

```bash
curl 'https://YOUR-DOMAIN/api/is_workday'
```

### POST

```bash
curl -X POST 'https://YOUR-DOMAIN/api/is_workday' \
  -H 'content-type: application/json' \
  -d '{"date":"2026-09-10"}'
```

### Health

```bash
curl 'https://YOUR-DOMAIN/api/actuator/health'
```

## 返回示例

```json
{
  "date": "2026-09-10",
  "is_workday": true,
  "timezone": "Asia/Shanghai",
  "china_time": "2026-09-10T10:00:00+08:00"
}
```

## 部署

需要 Node.js。

```bash
npm install
npx wrangler login
npm run deploy
```

部署后可以使用：

```text
https://china-workday-api.<your-subdomain>.workers.dev
```

或者绑定自己的域名。

## 关于工作日数据

`src/index.js` 中：

- `HOLIDAYS`：法定节假日
- `WORKDAYS`：因调休而工作的周六/周日

普通周一至周五自动判断为工作日，普通周六/周日自动判断为非工作日。

每年国务院发布新的节假日安排后，应更新这两个 Set。
