import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ success: true, users: userList });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: "Nama, email, dan password wajib diisi" }, { status: 400 });
    }

    // Check existing
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "Email sudah terdaftar" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [created] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role || "OPERATOR",
        isActive: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    // Record audit log
    await db.insert(auditLogs).values({
      userEmail: "admin@disastra.ai",
      action: "CREATE_USER",
      entityType: "USER",
      entityId: String(created.id),
      details: { createdEmail: created.email, role: created.role },
    });

    return NextResponse.json({ success: true, user: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const { id, role, isActive } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID wajib disertakan" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof role === "string") updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, Number(id)))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      userEmail: "admin@disastra.ai",
      action: "UPDATE_USER",
      entityType: "USER",
      entityId: String(id),
      details: updateData,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update user";
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
      return NextResponse.json({ success: false, error: "User ID wajib disertakan" }, { status: 400 });
    }

    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, Number(id)),
    });

    if (!userToDelete) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    if (userToDelete.email === "admin@disastra.ai") {
      return NextResponse.json({ success: false, error: "Super Admin utama tidak dapat dihapus" }, { status: 403 });
    }

    await db.delete(users).where(eq(users.id, Number(id)));

    // Audit log
    await db.insert(auditLogs).values({
      userEmail: "admin@disastra.ai",
      action: "DELETE_USER",
      entityType: "USER",
      entityId: id,
      details: { deletedEmail: userToDelete.email },
    });

    return NextResponse.json({ success: true, message: "User berhasil dihapus" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
