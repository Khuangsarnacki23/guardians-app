# Deployment (Vercel)

Frontend (CRA) and API (Express) now deploy as **one** Vercel project sharing
`guardians-app.vercel.app`. Because they share an origin, CORS no longer applies.

## How it fits together

```
/api/index.js      -> Vercel serverless entry, exports backend/app.js
/vercel.json       -> rewrites /api/(.*) to the function; 60s max duration
/backend/app.js    -> the Express app (no listen)
/backend/server.js -> local dev only: requires app.js and listens on :5001
```

`vercel.json` preserves the original request path, so Express still sees
`/api/sessions`, `/api/goals`, etc. and routes normally.

## Environment variables (Vercel > Settings > Environment Variables)

Set for Production, Preview, and Development.

| Variable | Notes |
| --- | --- |
| `MONGODB_URI` | New Atlas cluster string, password URL-encoded |
| `MONGODB_DB` | Optional, defaults to `database1` |
| `CLERK_SECRET_KEY` | Backend. Read internally by `@clerk/express` |
| `CLERK_PUBLISHABLE_KEY` | Backend. Same value as the frontend key, **no** `REACT_APP_` prefix |
| `REACT_APP_CLERK_PUBLISHABLE_KEY` | Frontend. Already set |
| `OPENAI_API_KEY` | Assistant + embeddings |
| `PINECONE_API_KEY` | |
| `PINECONE_INDEX_NAME` | |
| `AWS_ACCESS_KEY_ID` | `S3Client` uses the default credential chain |
| `AWS_SECRET_ACCESS_KEY` | |
| `AWS_REGION` | Defaults to `us-east-2` |
| `AWS_S3_GYM_BUCKET` | |
| `AWS_S3_PITCHING_BUCKET` | |

Do **not** set `PORT`. Only `REACT_APP_*` variables reach browser code — never
put a secret behind that prefix.

## MongoDB Atlas

Network Access must allow `0.0.0.0/0`. Vercel's serverless egress IPs are
dynamic, so an IP allowlist cannot work. A blocked connection surfaces as
`ServerSelectionTimeoutError`, which reads like a dead cluster.

The new cluster is empty: `database1` and its collections do not exist until
something writes to them. Reads return nothing until then.

## S3 CORS (required for direct uploads)

Apply to both the gym and pitching buckets, under Permissions > CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": [
      "https://guardians-app.vercel.app",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Why uploads are presigned

Vercel serverless functions cap request bodies at **4.5MB**, but session videos
are allowed up to 50MB. `POST /api/uploads/sign` returns a short-lived presigned
S3 `PUT` URL so the browser uploads directly to S3 and the file bytes never pass
through the function. The object key is built from the verified Clerk session ID,
so a caller cannot sign an upload into another user's prefix.

## Local development

```bash
npm install
cd backend && node server.js   # :5001
npm start                      # :3000, proxies via REACT_APP_API_BASE_URL
```

`backend/.env` holds local secrets and is gitignored.
