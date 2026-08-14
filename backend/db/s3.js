// db/s3.js
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const REGION = process.env.AWS_REGION || "us-east-2";

const s3 = new S3Client({
  region: REGION,
  // AWS SDK v3.729+ enables flexible checksums by default, which bakes an
  // x-amz-checksum-crc32 for an EMPTY body into presigned PUT URLs. The browser
  // then uploads real bytes, S3 computes a different CRC32, and rejects the
  // request. "WHEN_REQUIRED" keeps checksums off unless an API demands them.
  requestChecksumCalculation: "WHEN_REQUIRED",
});

/**
 * Server-side upload. Still used for small payloads (e.g. coach docs), but NOT
 * for videos -- on Vercel the request body cap is 4.5MB, so large files must go
 * straight from the browser to S3 via getPresignedUploadUrl below.
 */
async function uploadToS3({ bucket, key, contentType, body }) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3.send(command);

  return key;
}

/**
 * Presigned PUT URL. The browser uploads directly to S3 with this, so the file
 * bytes never pass through the serverless function and the 4.5MB limit does not
 * apply. Requires a CORS policy on the bucket allowing PUT from the app origin.
 */
async function getPresignedUploadUrl({
  bucket,
  key,
  contentType,
  expiresIn = 900,
}) {
  if (!bucket || !key) {
    throw new Error("bucket and key are required to sign an upload");
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });

  return { url, key };
}

async function getSignedUrlForKey(bucket, key, expiresIn = 3600) {
  if (!bucket || !key) return null;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn,
  });

  return signedUrl;
}

module.exports = {
  uploadToS3,
  getPresignedUploadUrl,
  getSignedUrlForKey,
};
