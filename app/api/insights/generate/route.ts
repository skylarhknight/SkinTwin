import { NextResponse } from "next/server";
import { GET } from "@/app/api/insights/route";

export async function POST(request: Request) {
  return GET(request);
}
