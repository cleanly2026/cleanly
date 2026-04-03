import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cloudflare R2 uses S3-compatible API at:
// https://{accountId}.r2.cloudflarestorage.com
// No region needed — use 'auto'.
let r2Client: S3Client | null = null

function getR2Client(): S3Client {
  if (r2Client) return r2Client

  const accountId   = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretKey   = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretKey) {
    console.warn('[R2] R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY not set — R2 client unavailable')
    throw new Error('R2 credentials not configured')
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey: secretKey,
    },
  })

  return r2Client
}

const BUCKET = process.env.R2_BUCKET_NAME ?? 'cleanly-photos'
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? ''
const UPLOAD_URL_TTL = 300  // seconds — presigned PUT URL expires in 300s (5 min for poor mobile connections)

// Generate a presigned PUT URL for direct client upload.
// Client uploads directly to R2 — file never proxied through our API.
// Per PHO-05: "Photos uploaded via presigned R2 URLs (not proxied through API)".
export async function getSignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const client = getR2Client()

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL })
}

// Generate key for a photo — deterministic, collision-resistant
// Pattern: orders/{orderId}/{photoType}/{timestamp}.{ext}
export function buildPhotoKey(
  orderId: string,
  photoType: 'before' | 'after' | 'pickup' | 'return',
  extension: string = 'jpg'
): string {
  const timestamp = Date.now()
  return `orders/${orderId}/${photoType}/${timestamp}.${extension}`
}

// Return public URL for a stored object.
// Only call after file has been uploaded via presigned URL.
export function getPublicUrl(key: string): string {
  if (!PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL not configured')
  }
  return `${PUBLIC_URL.replace(/\/$/, '')}/${key}`
}
