import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // If database connection is active, check against database
    if (db) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase().trim()),
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json(
          { success: false, error: "Account is deactivated" },
          { status: 403 }
        );
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 }
        );
      }

      await setSessionCookie({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "USER",
      });

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    // Fallback development mock if DATABASE_URL is not yet set
    if (email === "admin@disastra.ai" && password === "admin123456") {
      await setSessionCookie({
        id: 1,
        name: "Super Administrator",
        email: "admin@disastra.ai",
        role: "SUPER_ADMIN",
      });
      return NextResponse.json({
        success: true,
        user: { id: 1, name: "Super Administrator", email, role: "SUPER_ADMIN" },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
