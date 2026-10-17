import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set in environment!");
    process.exit(1);
  }

  const sql = neon(dbUrl);
  const db = drizzle(sql, { schema });
  console.log("🌱 Starting DISASTRA database seeding...");

  // 1. Seed Categories
  const categories = [
    {
      code: "EARTHQUAKE",
      name: "Gempa Bumi",
      icon: "activity",
      color: "#ef4444",
      description: "Getaran atau guncangan pada permukaan bumi akibat pelepasan energi tektonik.",
    },
    {
      code: "TSUNAMI",
      name: "Tsunami",
      icon: "waves",
      color: "#0284c7",
      description: "Gelombang laut dahsyat yang dipicu gempa bawah laut atau letusan vulkanik.",
    },
    {
      code: "VOLCANO",
      name: "Erupsi Gunung Api",
      icon: "flame",
      color: "#f97316",
      description: "Pelepasan material vulkanik seperti lava, abu panas, dan gas beracun.",
    },
    {
      code: "FLOOD",
      name: "Banjir & Bandang",
      icon: "cloud-rain",
      color: "#3b82f6",
      description: "Genangan air berlebih di daratan akibat curah hujan ekstrem atau luapan sungai.",
    },
    {
      code: "WILDFIRE",
      name: "Kebakaran Hutan & Lahan",
      icon: "zap",
      color: "#eab308",
      description: "Kebakaran tidak terkendali di kawasan hutan, semak belukar, atau lahan gambut.",
    },
    {
      code: "STORM",
      name: "Cuaca Ekstrem & Siklon",
      icon: "wind",
      color: "#8b5cf6",
      description: "Angin kencang, badai tropis, dan siklon yang berisiko merusak struktur.",
    },
  ];

  for (const cat of categories) {
    await db
      .insert(schema.disasterCategories)
      .values(cat)
      .onConflictDoNothing();
  }
  console.log("✅ Disaster categories seeded.");

  // 2. Seed Data Sources
  const sources = [
    {
      code: "BMKG",
      name: "Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)",
      endpointUrl: "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json",
      syncIntervalMins: 5,
      isActive: true,
      status: "HEALTHY",
    },
    {
      code: "USGS",
      name: "United States Geological Survey (USGS Indonesia)",
      endpointUrl: "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.0&minlatitude=-11.0&maxlatitude=6.0&minlongitude=95.0&maxlongitude=141.0",
      syncIntervalMins: 10,
      isActive: true,
      status: "HEALTHY",
    },
    {
      code: "NASA_EONET",
      name: "NASA Earth Observatory (EONET Indonesia Karhutla & Vulkanik)",
      endpointUrl: "https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=60&bbox=95,-11.5,141.5,6.5",
      syncIntervalMins: 30,
      isActive: true,
      status: "HEALTHY",
    },
    {
      code: "GDACS",
      name: "Global Disaster Alert and Coordination System (GDACS)",
      endpointUrl: "https://www.gdacs.org/xml/rss.xml",
      syncIntervalMins: 15,
      isActive: true,
      status: "HEALTHY",
    },
  ];

  for (const src of sources) {
    await db.insert(schema.dataSources).values(src).onConflictDoNothing();
  }
  console.log("✅ Data sources seeded.");

  // 3. Seed Default Super Admin
  const hashedPassword = await bcrypt.hash("admin123456", 10);
  await db
    .insert(schema.users)
    .values({
      name: "Super Administrator",
      email: "admin@disastra.ai",
      passwordHash: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    })
    .onConflictDoNothing();
  console.log("✅ Default Admin created: admin@disastra.ai / admin123456");

  // 4. Seed AI Prompts & Modules
  const aiModules = [
    {
      module: "IMPACT_ANALYZER",
      title: "AI Disaster Impact Analyzer",
      provider: "GOOGLE_GEMINI",
      modelName: "gemini-1.5-flash",
      temperature: 0.4,
      maxTokens: 2048,
      systemPrompt:
        "Anda adalah AI Disaster Impact Analyzer pada platform DISASTRA. Analisis estimasi kerusakan, fasilitas vital terdampak (RS, jalan, jembatan, bandara), serta radius zona bahaya berdasarkan data gempa/tsunami/bencana yang diberikan secara objektif dan akurat.",
      isActive: true,
    },
    {
      module: "DISASTER_ASSISTANT",
      title: "AI Disaster Interactive Assistant",
      provider: "GOOGLE_GEMINI",
      modelName: "gemini-1.5-flash",
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt:
        "Anda adalah asisten virtual kesiapsiagaan darurat bencana DISASTRA. Berikan instruksi keselamatan yang tenang, jelas, ringkas, dan sesuai standar BNPB & SAR. Utamakan keselamatan nyawa pengguna.",
      isActive: true,
    },
  ];

  for (const aim of aiModules) {
    await db.insert(schema.aiConfigs).values(aim).onConflictDoNothing();
  }
  console.log("✅ AI Modules configured.");

  console.log("🎉 Seeding completed successfully!");
}

main().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
