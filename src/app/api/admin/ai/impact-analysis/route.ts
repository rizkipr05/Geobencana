import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiConfigs, disasters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { disasterId, disasterData } = await req.json();

    let targetDisaster = disasterData;
    if (!targetDisaster && disasterId && db) {
      targetDisaster = await db.query.disasters.findFirst({
        where: eq(disasters.id, disasterId),
      });
    }

    if (!targetDisaster) {
      return NextResponse.json(
        { success: false, error: "Disaster event not found" },
        { status: 404 }
      );
    }

    // Retrieve active AI prompt configuration
    let systemPrompt =
      "Anda adalah AI Disaster Impact Analyzer pada platform DISASTRA. Analisis estimasi kerusakan, fasilitas vital terdampak (RS, jalan, jembatan, bandara, listrik), serta radius zona bahaya berdasarkan data gempa/bencana yang diberikan secara objektif dan akurat.";
    let modelName = "gemini-3.8-flash";
    let temperature = 0.4;

    if (db) {
      const config = await db.query.aiConfigs.findFirst({
        where: eq(aiConfigs.module, "IMPACT_ANALYZER"),
      });
      if (config) {
        systemPrompt = config.systemPrompt;
        modelName = config.modelName || "gemini-3.8-flash";
        temperature = config.temperature || 0.4;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      // Call Google Gemini API using official SDK
      const ai = new GoogleGenAI({ apiKey });

      const promptText = `
${systemPrompt}

Data Kejadian Bencana Terverifikasi:
- Judul: ${targetDisaster.title}
- Kategori: ${targetDisaster.categoryCode || "EARTHQUAKE"}
- Lokasi: ${targetDisaster.locationName}
- Koordinat: Lat ${targetDisaster.latitude}, Lng ${targetDisaster.longitude}
- Magnitudo: ${targetDisaster.magnitude ? `M ${targetDisaster.magnitude}` : "N/A"}
- Kedalaman: ${targetDisaster.depthKm ? `${targetDisaster.depthKm} km` : "N/A"}
- Tingkat Keparahan Sistem: ${targetDisaster.severityLevel}
- Radius Dampak Estimasi Awal: ${targetDisaster.radiusKm || 15} km

Tolong berikan respon terstruktur JSON dengan format persis:
{
  "executiveSummary": "ringkasan eksekutif dampak dalam 2-3 kalimat",
  "dangerZones": [
    {"ring": "Zona Merah (Ring 1)", "radiusKm": 10, "damageLevel": "Berat", "description": "Kerusakan struktural bangunan dan retakan tanah mayor"},
    {"ring": "Zona Kuning (Ring 2)", "radiusKm": 30, "damageLevel": "Sedang", "description": "Guncangan kuat, potensi kepanikan massal dan genteng runtuh"},
    {"ring": "Zona Hijau (Ring 3)", "radiusKm": 60, "damageLevel": "Ringan", "description": "Guncangan terasa oleh sebagian orang"}
  ],
  "criticalInfrastructure": {
    "hospitals": "analisis potensi keterisian dan kerusakan RS rujukan",
    "roadsAndBridges": "analisis potensi jalur logistik terputus",
    "powerGrid": "potensi pemadaman listrik gardu induk",
    "communications": "potensi penurunan kapasitas sinyal BTS seluler"
  },
  "priorityActions": [
    "tindakan darurat 0-2 jam",
    "tindakan evakuasi 2-6 jam",
    "penyiapan logistik dan dapur umum"
  ],
  "recommendedAlertLevel": "SIAGA_1"
}
`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: modelName.includes("3.8") ? modelName : "gemini-3.8-flash",
          contents: promptText,
          config: {
            temperature,
            responseMimeType: "application/json",
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: promptText,
          config: {
            temperature,
            responseMimeType: "application/json",
          },
        });
      }

      const rawText = response.text || "{}";
      const analysisResult = JSON.parse(rawText);

      return NextResponse.json({
        success: true,
        source: "GEMINI_AI_LIVE",
        analysis: analysisResult,
        disaster: targetDisaster,
      });
    }

    // Heuristic fallback if GEMINI_API_KEY is not yet set by the user
    const mag = targetDisaster.magnitude || 5.0;
    const depth = targetDisaster.depthKm || 15;
    const r1 = Math.round(mag * 2.5);
    const r2 = Math.round(mag * 6);
    const r3 = Math.round(mag * 12);

    const fallbackAnalysis = {
      executiveSummary: `Kejadian gempa berkekuatan M ${mag} pada kedalaman ${depth} km di ${targetDisaster.locationName}. Mengingat magnitudo dan kedalaman hiposentrum, guncangan diestimasikan memiliki intensitas V-VI MMI di episentrum, berpotensi merusak bangunan sederhana.`,
      dangerZones: [
        {
          ring: "Zona Merah (Ring 1)",
          radiusKm: r1,
          damageLevel: mag >= 6.5 ? "Sangat Berat" : "Sedang - Berat",
          description: "Area paling rentan terhadap runtuhan dinding, dislokasi jembatan lokal, dan kepanikan warga.",
        },
        {
          ring: "Zona Kuning (Ring 2)",
          radiusKm: r2,
          damageLevel: "Ringan - Sedang",
          description: "Guncangan kuat dirasakan warga; beberapa retakan non-struktural pada pemukiman.",
        },
        {
          ring: "Zona Hijau (Ring 3)",
          radiusKm: r3,
          damageLevel: "Ringan",
          description: "Getaran dirasakan oleh orang banyak di dalam rumah, tidak berpotensi merusak konstruksi.",
        },
      ],
      criticalInfrastructure: {
        hospitals: `Fasilitas RSUD di wilayah ${targetDisaster.locationName} direkomendasikan mengaktifkan triage darurat bencana untuk antisipasi korban luka akibat runtuhan.`,
        roadsAndBridges: `Jalur arteri utama dalam radius ${r1} km berisiko retak tanah atau longsoran tebing lereng. Perlu patroli Dinas Bina Marga.`,
        powerGrid: mag >= 6.0 ? "Potensi proteksi trip relay pada gardu transmisi tegangan menengah terdekat." : "Jaringan PLN terpantau relatif stabil.",
        communications: "Trafik panggilan dan data darurat berpotensi melonjak hingga 400%; prioritaskan bandwidth posko SAR.",
      },
      priorityActions: [
        "Aktivasi Posko Darurat BNPB/BPBD setempat dalam radius 30 menit pertama.",
        "Pemeriksaan visual kelayakan struktur jembatan penghubung utama ke lokasi terdampak.",
        "Penyebaran peringatan gempa susulan (aftershocks) kepada masyarakat untuk tetap di luar gedung bertingkat.",
        "Pendirian tenda darurat medis di lapangan terbuka dekat puskesmas atau RS setempat.",
      ],
      recommendedAlertLevel: mag >= 7.0 ? "SIAGA_1" : mag >= 5.5 ? "SIAGA_2" : "WASPADA",
    };

    return NextResponse.json({
      success: true,
      source: "AI_HEURISTIC_PREVIEW",
      analysis: fallbackAnalysis,
      disaster: targetDisaster,
      notice: "Untuk analisis LLM mutakhir, tambahkan GEMINI_API_KEY di file .env.local",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI Analysis failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
