/** Uploads a file straight to S3 via a pre-signed PUT URL. Deliberately a plain
 * `fetch`, not `authFetch` — this goes directly to S3, not the API, so it must
 * carry no Authorization header and no `credentials: 'include'`. */
export async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!response.ok) {
    throw new Error('Upload failed — please try again.');
  }
}
