import { db } from "@/db";
import { dataSources, disasters, syncLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  Potensi?: string;
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

interface EONETEvent {
  id: string;
  title: string;
  description: string | null;
  link: string;
  categories: Array<{ id: string; title: string }>;
  sources: Array<{ id: string; url: string }>;
  geometry: Array<{
    date: string;
    coordinates: [number, number]; // [lng, lat]
  }>;
}

/**
 * Strict boundary & territory checker for Indonesian archipelago
 * Bounding Box: Latitude -11.5° to 6.5°, Longitude 94.0° to 141.5°
 */
export function isWithinIndonesia(lat: number, lng: number, placeName: string = ""): boolean {
  if (isNaN(lat) || isNaN(lng)) return false;

  const inBBox = lat >= -11.5 && lat <= 6.5 && lng >= 94.0 && lng <= 141.5;
  if (!inBBox) return false;

  const lowerPlace = placeName.toLowerCase();
  const nonIndoExclusions = [
    "australia",
    "philippines",
    "papua new guinea",
    "timor leste",
    "timor-leste",
    "malaysia",
    "singapore",
    "brunei",
    "thailand",
    "vietnam",
    "tonga",
    "fiji",
    "panama",
    "chile",
    "japan",
    "alaska",
    "california",
    "mexico",
    "new zealand",
    "vanuatu",
    "solomon islands",
  ];

  for (const excl of nonIndoExclusions) {
    if (lowerPlace.includes(excl) && !lowerPlace.includes("indonesia")) {
      return false;
    }
  }

  return true;
}

/**
 * Synchronize BMKG data (Indonesian official meteorological agency)
 * Ingests:
 * 1. M >= 5.0 latest earthquakes (gempaterkini.json)
 * 2. Felt earthquakes across Indonesian provinces (gempadirasakan.json)
 */
export async function syncBMKGData() {
  const startTime = Date.now();
  let fetchedCount = 0;
  let insertedCount = 0;
  let duplicateCount = 0;

  try {
    let sourceId: number | null = null;
    try {
      if (db) {
        const source = await db.query.dataSources.findFirst({
          where: eq(dataSources.code, "BMKG"),
        });
        if (source) sourceId = source.id;
      }
    } catch (dbErr) {
      console.warn("[BMKG Sync] Failed to query sourceId:", dbErr);
    }

    const endpoints = [
      "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json",
      "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json",
    ];

    const allGempas: BMKGGempa[] = [];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          headers: { "User-Agent": "Disastra-Platform/1.0" },
          next: { revalidate: 0 },
        });
        if (res.ok) {
          const json = await res.json();
          const list: BMKGGempa[] = json?.Infogempa?.gempa || [];
          allGempas.push(...list);
        }
      } catch (err) {
        console.warn(`[BMKG Sync] Failed endpoint ${ep}:`, err);
      }
    }

    fetchedCount = allGempas.length;

    for (const item of allGempas) {
      if (!item.Coordinates) continue;
      const [latStr, lngStr] = item.Coordinates.split(",");
      const latitude = parseFloat(latStr.trim());
      const longitude = parseFloat(lngStr.trim());

      if (!isWithinIndonesia(latitude, longitude, item.Wilayah)) {
        continue;
      }

      const magnitude = parseFloat(item.Magnitude) || 4.0;
      const depthKm = parseFloat(item.Kedalaman?.replace(/[^0-9.]/g, "") || "10");
      const occurredAt = new Date(item.DateTime);
      const cleanDateTime = item.DateTime.replace(/[^0-9]/g, "");
      const externalId = `BMKG-${cleanDateTime}-${latitude.toFixed(2)}-${longitude.toFixed(2)}`;

      const severityLevel =
        magnitude >= 7.0 ? "CRITICAL" : magnitude >= 5.5 ? "HIGH" : magnitude >= 4.0 ? "MEDIUM" : "LOW";

      if (db) {
        const existing = await db.query.disasters.findFirst({
          where: eq(disasters.externalId, externalId),
        });

        if (existing) {
          duplicateCount++;
          continue;
        }

        const potential = item.Potensi || (item.Dirasakan ? `Dirasakan MMI: ${item.Dirasakan}` : "Tidak berpotensi tsunami");

        await db.insert(disasters).values({
          id: `bmkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sourceId,
          externalId,
          categoryCode: "EARTHQUAKE",
          title: `Gempa M ${magnitude.toFixed(1)} - ${item.Wilayah}`,
          description: `Kedalaman ${item.Kedalaman}. ${potential}`,
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
            sourceAgency: "BMKG Indonesia",
            potensi: item.Potensi || null,
            dirasakan: item.Dirasakan || null,
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
    const errorMsg = error instanceof Error ? error.message : "Unknown BMKG sync error";
    return { success: false, error: errorMsg };
  }
}

/**
 * Synchronize USGS data filtered strictly to Indonesia territory
 * Uses Indonesian bounding box query to avoid fetching worldwide quakes.
 */
export async function syncUSGSData() {
  const startTime = Date.now();
  let fetchedCount = 0;
  let insertedCount = 0;
  let duplicateCount = 0;

  try {
    // Query USGS with explicit Indonesian bounding box and limit
    const usgsUrl =
      "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.0&minlatitude=-11.0&maxlatitude=6.0&minlongitude=95.0&maxlongitude=141.0&limit=50";

    const res = await fetch(usgsUrl, {
      headers: { "User-Agent": "Disastra-Platform/1.0" },
      next: { revalidate: 0 },
    });

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
      const place = feat.properties.place || "";

      // Strict Indonesian validation
      if (!isWithinIndonesia(lat, lng, place)) {
        continue;
      }

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
          title: `M ${mag.toFixed(1)} - ${place}`,
          description: `USGS Indonesia telemetry. Kedalaman: ${depth} km. Alert: ${feat.properties.alert || "none"}.`,
          locationName: place,
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
            sourceAgency: "USGS (Indonesia Bounds)",
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
    const errorMsg = error instanceof Error ? error.message : "Unknown USGS sync error";
    return { success: false, error: errorMsg };
  }
}

/**
 * Synchronize NASA EONET data for Indonesia (Wildfires, Volcanoes, Floods, Severe Storms)
 * Bounding Box strictly filtered to Indonesian coordinates: [95, -11.5, 141.5, 6.5]
 */
export async function syncEONETData() {
  const startTime = Date.now();
  let fetchedCount = 0;
  let insertedCount = 0;
  let duplicateCount = 0;

  try {
    const eonetUrl =
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=60&bbox=95,-11.5,141.5,6.5";

    const res = await fetch(eonetUrl, {
      headers: { "User-Agent": "Disastra-Platform/1.0" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`NASA EONET returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const events: EONETEvent[] = data?.events || [];
    fetchedCount = events.length;

    let sourceId: number | null = null;
    if (db) {
      const source = await db.query.dataSources.findFirst({
        where: eq(dataSources.code, "NASA_EONET"),
      });
      if (source) sourceId = source.id;
    }

    for (const evt of events) {
      if (!evt.geometry || evt.geometry.length === 0) continue;
      const latestGeom = evt.geometry[evt.geometry.length - 1];
      const [lng, lat] = latestGeom.coordinates;

      if (!isWithinIndonesia(lat, lng, evt.title)) {
        continue;
      }

      const externalId = `EONET-${evt.id}`;
      const occurredAt = new Date(latestGeom.date || Date.now());

      // Category detection
      const catId = evt.categories?.[0]?.id?.toLowerCase() || "";
      let categoryCode = "WILDFIRE";
      let severityLevel = "MEDIUM";
      let cleanTitle = evt.title;
      let description = "Kejadian bencana terpantau satelit NASA EONET di Indonesia.";

      if (catId === "wildfires") {
        categoryCode = "WILDFIRE";
        severityLevel = "HIGH";
        cleanTitle = evt.title.replace(/^Wildfire in /i, "Kebakaran Lahan/Hutan - ");
        description = "Titik panas kebakaran hutan dan lahan (Karhutla) terdeteksi satelit.";
      } else if (catId === "volcanoes") {
        categoryCode = "VOLCANO";
        severityLevel = "HIGH";
        cleanTitle = `Aktivitas Vulkanik: ${evt.title}`;
        description = "Aktivitas erupsi dan pelepasan material vulkanik gunung api aktif Indonesia.";
      } else if (catId === "floods") {
        categoryCode = "FLOOD";
        severityLevel = "MEDIUM";
        cleanTitle = evt.title.replace(/^Flood in /i, "Banjir & Genangan - ");
        description = "Banjir bandang / luapan sungai terdeteksi sensor hidrometeorologi satelit.";
      } else if (catId === "severestorms") {
        categoryCode = "STORM";
        severityLevel = "MEDIUM";
        cleanTitle = `Cuaca Ekstrem: ${evt.title}`;
        description = "Siklon tropis / angin badai ekstrem terpantau satelit cuaca.";
      }

      if (db) {
        const existing = await db.query.disasters.findFirst({
          where: eq(disasters.externalId, externalId),
        });

        if (existing) {
          duplicateCount++;
          continue;
        }

        await db.insert(disasters).values({
          id: `eonet_${evt.id.toLowerCase()}`,
          sourceId,
          externalId,
          categoryCode,
          title: cleanTitle,
          description,
          locationName: evt.title,
          latitude: lat,
          longitude: lng,
          depthKm: null,
          magnitude: null,
          severityLevel,
          radiusKm: categoryCode === "VOLCANO" ? 25 : categoryCode === "WILDFIRE" ? 15 : 20,
          status: "ACTIVE",
          verifiedStatus: "VERIFIED",
          occurredAt,
          metadata: {
            sourceAgency: "NASA EONET (Indonesia)",
            originalCategory: catId,
            link: evt.link,
            sources: evt.sources,
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
    const errorMsg = error instanceof Error ? error.message : "Unknown NASA EONET sync error";
    return { success: false, error: errorMsg };
  }
}
