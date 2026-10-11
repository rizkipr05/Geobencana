import { db } from "@/db";
import { dataSources, disasters, syncLogs, disasterCategories } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface BMKGGempa {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  Coordinates: string;
  Lintang: string;
  Bujur: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi: string;
  Dirasakan?: string;
  Shakemap?: string;
}

interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    url: string;
    detail: string;
    status: string;
    tsunami: number;
    sig: number;
    alert: string | null;
  };
  geometry: {
    type: string;
    coordinates: [number, number, number]; // [lng, lat, depth]
  };
}

export async function syncBMKGData() {
  const startTime = Date.now();
  let fetchedCount = 0;
  let insertedCount = 0;
  let duplicateCount = 0;

  try {
    const res = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json", {
      headers: { "User-Agent": "Disastra-Platform/1.0" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`BMKG returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const gempaList: BMKGGempa[] = data?.Infogempa?.gempa || [];
    fetchedCount = gempaList.length;

    // Get BMKG data source ID
    let sourceId: number | null = null;
    if (db) {
      const source = await db.query.dataSources.findFirst({
        where: eq(dataSources.code, "BMKG"),
      });
      if (source) sourceId = source.id;
    }

    for (const item of gempaList) {
      const [latStr, lngStr] = item.Coordinates.split(",");
      const latitude = parseFloat(latStr.trim());
      const longitude = parseFloat(lngStr.trim());
      const magnitude = parseFloat(item.Magnitude);
      const depthKm = parseFloat(item.Kedalaman.replace(/[^0-9.]/g, ""));
      const occurredAt = new Date(item.DateTime);
      const externalId = `BMKG-${item.DateTime.replace(/[^0-9]/g, "")}-${latitude}-${longitude}`;

      const severityLevel =
        magnitude >= 7.0 ? "CRITICAL" : magnitude >= 5.5 ? "HIGH" : magnitude >= 4.0 ? "MEDIUM" : "LOW";

      if (db) {
        // Deduplication check
        const existing = await db.query.disasters.findFirst({
          where: eq(disasters.externalId, externalId),
        });

        if (existing) {
          duplicateCount++;
          continue;
        }

        await db.insert(disasters).values({
          id: `bmkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sourceId,
          externalId,
          categoryCode: "EARTHQUAKE",
          title: `Gempa M ${magnitude} - ${item.Wilayah}`,
          description: `Kedalaman ${item.Kedalaman}. ${item.Potensi}`,
          locationName: item.Wilayah,
          latitude,
          longitude,
          depthKm,
          magnitude,
          severityLevel,
          radiusKm: magnitude * 15,
          status: "ACTIVE",
          verifiedStatus: "VERIFIED",
          occurredAt,
          metadata: {
            potensi: item.Potensi,
            dirasakan: item.Dirasakan,
            shakemap: item.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${item.Shakemap}` : null,
          },
        });
        insertedCount++;
      }
    }

    const durationMs = Date.now() - startTime;

    if (db && sourceId) {
      await db.insert(syncLogs).values({
        sourceId,
        status: "SUCCESS",
        itemsFetched: fetchedCount,
        itemsInserted: insertedCount,
        itemsDuplicate: duplicateCount,
        durationMs,
        completedAt: new Date(),
      });

      await db
        .update(dataSources)
        .set({
          status: "HEALTHY",
          lastSyncAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(dataSources.id, sourceId));
    }

    return { success: true, fetchedCount, insertedCount, duplicateCount, durationMs };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    if (db) {
      const source = await db.query.dataSources.findFirst({
        where: eq(dataSources.code, "BMKG"),
      });
      if (source) {
        await db.insert(syncLogs).values({
          sourceId: source.id,
          status: "FAILED",
          errorMessage: errorMsg,
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        });
        await db
          .update(dataSources)
          .set({ status: "ERROR", lastError: errorMsg, updatedAt: new Date() })
          .where(eq(dataSources.id, source.id));
      }
    }
    return { success: false, error: errorMsg };
  }
}

export async function syncUSGSData() {
  const startTime = Date.now();
  let fetchedCount = 0;
  let insertedCount = 0;
  let duplicateCount = 0;

  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
      {
        headers: { "User-Agent": "Disastra-Platform/1.0" },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      throw new Error(`USGS returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const features: USGSFeature[] = data?.features || [];
    fetchedCount = features.length;

    let sourceId: number | null = null;
    if (db) {
      const source = await db.query.dataSources.findFirst({
        where: eq(dataSources.code, "USGS"),
      });
      if (source) sourceId = source.id;
    }

    for (const feat of features) {
      const [lng, lat, depth] = feat.geometry.coordinates;
      const mag = feat.properties.mag;
      const externalId = `USGS-${feat.id}`;
      const occurredAt = new Date(feat.properties.time);

      const severityLevel =
        mag >= 7.0 ? "CRITICAL" : mag >= 5.5 ? "HIGH" : mag >= 4.5 ? "MEDIUM" : "LOW";

      if (db) {
        const existing = await db.query.disasters.findFirst({
          where: eq(disasters.externalId, externalId),
        });

        if (existing) {
          duplicateCount++;
          continue;
        }

        await db.insert(disasters).values({
          id: `usgs_${feat.id}`,
          sourceId,
          externalId,
          categoryCode: "EARTHQUAKE",
          title: `M ${mag} - ${feat.properties.place}`,
          description: `USGS global earthquake feed. Depth: ${depth} km. Alert: ${feat.properties.alert || "none"}.`,
          locationName: feat.properties.place,
          latitude: lat,
          longitude: lng,
          depthKm: depth,
          magnitude: mag,
          severityLevel,
          radiusKm: mag * 18,
          status: "ACTIVE",
          verifiedStatus: "VERIFIED",
          occurredAt,
          metadata: {
            url: feat.properties.url,
            tsunami: feat.properties.tsunami,
            significance: feat.properties.sig,
          },
        });
        insertedCount++;
      }
    }

    const durationMs = Date.now() - startTime;

    if (db && sourceId) {
      await db.insert(syncLogs).values({
        sourceId,
        status: "SUCCESS",
        itemsFetched: fetchedCount,
        itemsInserted: insertedCount,
        itemsDuplicate: duplicateCount,
        durationMs,
        completedAt: new Date(),
      });

      await db
        .update(dataSources)
        .set({
          status: "HEALTHY",
          lastSyncAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(dataSources.id, sourceId));
    }

    return { success: true, fetchedCount, insertedCount, duplicateCount, durationMs };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMsg };
  }
}
