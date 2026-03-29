import { NextResponse } from "next/server";
import { listSections } from "@/lib/services/sections";

export async function GET() {
  const sections = await listSections();
  return NextResponse.json(sections);
}
