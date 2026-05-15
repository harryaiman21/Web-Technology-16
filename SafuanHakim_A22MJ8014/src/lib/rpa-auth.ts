import { NextResponse } from "next/server";

export function assertUiPathToken(request: Request) {
  const expected = process.env.UIPATH_API_TOKEN;
  const header = request.headers.get("authorization");
  const token = header?.replace(/^Bearer\s+/i, "");

  if (!expected) {
    return NextResponse.json({ error: "UIPATH_API_TOKEN is not configured." }, { status: 500 });
  }

  if (token !== expected) {
    return NextResponse.json({ error: "Invalid UiPath API token." }, { status: 401 });
  }

  return null;
}
