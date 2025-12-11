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
});


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
  getSignedUrlForKey,
};
