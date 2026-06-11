import { NextRequest, NextResponse } from "next/server";
import { detectType } from "@/lib/detectType";
import { importOact, importConcur } from "@/lib/importer";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "未收到文件" }, { status: 400 });
    }
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const filename = (file as File).name || "upload";

    // 允许前端强制指定类型；否则自动识别
    const forced = form.get("type");
    const type =
      forced === "OACT" || forced === "CONCUR"
        ? (forced as "OACT" | "CONCUR")
        : detectType(buf);

    if (type === "OACT") {
      const result = await importOact(buf, filename);
      return NextResponse.json(result);
    }
    if (type === "CONCUR") {
      const result = await importConcur(buf, filename);
      return NextResponse.json(result);
    }
    return NextResponse.json(
      {
        error:
          "无法识别文件类型。OACT 文件第一行需含 ECONumber；Concur 文件需含 Report ID 与 ECO Approval Number 列。",
      },
      { status: 400 }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "导入失败" },
      { status: 500 }
    );
  }
}
