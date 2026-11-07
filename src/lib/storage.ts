import { S3Client } from "@aws-sdk/client-s3";
import { HttpError } from "@/lib/access";
export function s3() {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) throw new HttpError(503, "فضای ذخیره‌سازی هنوز تنظیم نشده است.");
  return { bucket: S3_BUCKET, client: new S3Client({ region: S3_REGION || "us-east-1", endpoint: S3_ENDPOINT || undefined, forcePathStyle: !!S3_ENDPOINT, credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY } }) };
}
