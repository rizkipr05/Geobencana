import { NextResponse } from "next/server";
import { db } from "@/db";
import { educationalContents, auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    let items = await db
      .select()
      .from(educationalContents)
      .orderBy(desc(educationalContents.updatedAt));

    // Seed default contents if empty
    if (items.length === 0) {
      const initialSeed = [
        {
          title: "Protokol Siaga Tsunami 20-20-20 Pesisir Pantai",
          slug: "protokol-siaga-tsunami-20-20-20",
          category: "SOP",
          disasterCategoryCode: "TSUNAMI",
          summary: "Pedoman reaksi cepat jika gempa terasa lebih dari 20 detik di daerah pesisir pantai.",
          bodyMarkdown: "1. Rasakan guncangan gempa > 20 detik.\n2. Waktu evakuasi maksimal 20 menit.\n3. Cari elevasi minimal 20 meter dpl.",
          isPublished: true,
        },
        {
          title: "Checklist Tas Siaga Bencana (72-Hour Survival Kit)",
          slug: "checklist-tas-siaga-bencana-72-jam",
          category: "CHECKLIST",
          disasterCategoryCode: "EARTHQUAKE",
          summary: "Perlengkapan dasar bertahan hidup 72 jam pertama pasca bencana.",
          bodyMarkdown: "Air bersih 3L/hari, biskuit energi, obat pribadi, senter taktis, peluit, fotokopi dokumen dalam ziplock.",
          isPublished: true,
        },
        {
          title: "Mitigasi Gempa di Gedung Bertingkat: Drop, Cover, Hold On",
          slug: "mitigasi-gempa-di-gedung-bertingkat",
          category: "GUIDE",
          disasterCategoryCode: "EARTHQUAKE",
          summary: "Panduan penyelamatan diri bagi penghuni perkantoran dan apartemen tinggi.",
          bodyMarkdown: "Jangan panik berebut ke lift. Lindungi kepala di bawah meja kokoh. Gunakan tangga darurat setelah guncangan reda.",
          isPublished: true,
        },
      ];

      for (const item of initialSeed) {
        await db.insert(educationalContents).values(item);
      }

      items = await db.select().from(educationalContents).orderBy(desc(educationalContents.updatedAt));
    }

    return NextResponse.json({ success: true, contents: items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch content";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const { title, slug, category, disasterCategoryCode, summary, bodyMarkdown, isPublished } = await req.json();

    if (!title || !bodyMarkdown) {
      return NextResponse.json({ success: false, error: "Judul dan isi konten wajib diisi" }, { status: 400 });
    }

    const finalSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const [created] = await db
      .insert(educationalContents)
      .values({
        title,
        slug: `${finalSlug}-${Date.now().toString(36)}`,
        category: category || "GUIDE",
        disasterCategoryCode: disasterCategoryCode || "EARTHQUAKE",
        summary: summary || "",
        bodyMarkdown,
        isPublished: isPublished ?? true,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      userEmail: "admin@disastra.ai",
      action: "CREATE_CONTENT",
      entityType: "CONTENT",
      entityId: String(created.id),
      details: { title: created.title, category: created.category },
    });

    return NextResponse.json({ success: true, content: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create content";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const { id, isPublished, title, bodyMarkdown } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Content ID wajib disertakan" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof isPublished === "boolean") updateData.isPublished = isPublished;
    if (typeof title === "string") updateData.title = title;
    if (typeof bodyMarkdown === "string") updateData.bodyMarkdown = bodyMarkdown;

    const [updated] = await db
      .update(educationalContents)
      .set(updateData)
      .where(eq(educationalContents.id, Number(id)))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      userEmail: "admin@disastra.ai",
      action: "UPDATE_CONTENT",
      entityType: "CONTENT",
      entityId: String(id),
      details: updateData,
    });

    return NextResponse.json({ success: true, content: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update content";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Content ID wajib disertakan" }, { status: 400 });
    }

    await db.delete(educationalContents).where(eq(educationalContents.id, Number(id)));

    // Audit log
    await db.insert(auditLogs).values({
      userEmail: "admin@disastra.ai",
      action: "DELETE_CONTENT",
      entityType: "CONTENT",
      entityId: id,
    });

    return NextResponse.json({ success: true, message: "Konten berhasil dihapus" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete content";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
