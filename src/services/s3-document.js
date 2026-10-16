import { GetObjectCommand } from '@aws-sdk/client-s3'

export async function downloadObject(s3Client, bucket, key) {
  const { Body } = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  )

  return Buffer.from(await Body.transformToByteArray())
}
