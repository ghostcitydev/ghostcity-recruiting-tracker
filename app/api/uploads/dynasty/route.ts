import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

const MAX_DYNASTY_SAVE_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('dynasty-uploads/')) throw new Error('Invalid dynasty upload path.');
        return {
          access: 'private',
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_DYNASTY_SAVE_BYTES,
          allowedContentTypes: ['application/octet-stream', 'application/x-unknown'],
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to prepare the dynasty upload.' }, { status: 400 });
  }
}
