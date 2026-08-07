import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '@/lib/minio_client';

export async function deleteMinIOObject(objectPath: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectPath,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error(`Failed to delete object from MinIO (${objectPath}):`, error);
  }
}
