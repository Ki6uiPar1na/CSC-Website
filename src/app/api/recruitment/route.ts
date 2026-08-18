import { NextResponse } from "next/server";
import { getAllForms, isFormOpenNow, RecruitmentForm } from "@/lib/recruitment";

export async function GET() {
  try {
    const forms = await getAllForms(true);
    return NextResponse.json({
      forms: forms.map((form) => {
        const status = isFormOpenNow(form);
        return {
          id: form.id,
          slug: form.slug,
          title: form.title,
          description: form.description,
          description_align: form.description_align,
          is_open: !!form.is_open,
          deadline: form.deadline,
          is_accepting: status.open,
        } as Partial<RecruitmentForm>;
      }),
    });
  } catch (error: any) {
    console.error("Get Apply Forms Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load application forms" },
      { status: 500 }
    );
  }
}
