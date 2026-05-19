import { createLumaImageUploadUrl, uploadLumaBinary } from './client';

function parseDataUrl(dataUrl: string): { mimeType: string; data: Blob } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL format. Expected: data:<mime-type>;base64,<data>');
  }

  const buffer = Buffer.from(match[2], 'base64');
  return {
    mimeType: match[1],
    data: new Blob([buffer], { type: match[1] }),
  };
}

export async function uploadLumaImageFromDataUrl(dataUrl: string): Promise<string> {
  const { mimeType, data } = parseDataUrl(dataUrl);
  const { upload_url, file_url } = await createLumaImageUploadUrl();
  await uploadLumaBinary(upload_url, data as BodyInit, mimeType);
  return file_url;
}

export async function uploadLumaImageFromRemoteUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${url}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const data = await response.arrayBuffer();

  const { upload_url, file_url } = await createLumaImageUploadUrl();
  await uploadLumaBinary(upload_url, data, contentType);
  return file_url;
}
