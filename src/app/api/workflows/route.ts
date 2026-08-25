import { NextResponse } from "next/server";
import { WORKFLOWS } from "@/lib/workflows/definitions";

export async function GET() {
  return NextResponse.json({
    workflows: WORKFLOWS.map((w) => ({
      id: w.id,
      name: w.name,
      category: w.category,
      description: w.description,
      recommendedDocs: w.recommendedDocs,
      checks: w.checks,
    })),
    categories: [...new Set(WORKFLOWS.map((w) => w.category))],
  });
}
