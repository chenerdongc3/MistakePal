import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { isFavorite?: boolean };

  return NextResponse.json({
    id,
    isFavorite: body.isFavorite ?? true,
  });
}
