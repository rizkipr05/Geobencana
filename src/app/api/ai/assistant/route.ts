import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { cleanOutputText } from "@/lib/utils";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const configured = Boolean(apiKey && apiKey.trim().length > 0);
  return NextResponse.json({
    success: true,
    configured,
    model: "gemini-3.8-flash",
  });
}

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Prompt message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `Anda adalah DISASTRA AI Assistant — sistem kecerdasan buatan resmi untuk kesiapsiagaan, mitigasi, analisis bahaya, dan evakuasi bencana di Indonesia (Gempa Bumi, Tsunami, Erupsi Gunung Api, Banjir, Karhutla/Kebakaran Hutan, Tanah Longsor, dan Cuaca Ekstrem).

ATURAN UTAMA 1: BATASAN TOPIK DAN PENOLAKAN PERTANYAAN DI LUAR BENCANA
Anda HANYA boleh menjawab pertanyaan yang berhubungan langsung dengan:
1. Bencana alam (gempa bumi, tsunami, erupsi gunung api, banjir, tanah longsor, karhutla, cuaca ekstrem).
2. Mitigasi bencana, rute dan panduan evakuasi darurat, checklist tas siaga bencana 72 jam, pertolongan pertama (P3K) darurat, dan rehabilitasi darurat.
3. Protokol dan status resmi BMKG, BNPB, PVMBG, dan BASARNAS.

JIKA pengguna bertanya hal apa pun di luar topik bencana (seperti: pemrograman/koding, resep masakan, film/musik, matematika, tugas sekolah umum, politik umum, olahraga, percakapan santai yang tidak relevan, dll.):
Anda WAJIB MENOLAK SECARA TEGAS DAN SOPAN DENGAN KALIMAT INI:
"Maaf, saya adalah DISASTRA AI Assistant yang dikhususkan hanya untuk kesiapsiagaan, mitigasi, dan tanggap darurat bencana di Indonesia. Saya tidak dapat menjawab pertanyaan di luar topik kebencanaan dan keselamatan darurat. Silakan ajukan pertanyaan seputar protokol gempa bumi, evakuasi tsunami, tas siaga bencana, atau status aktivitas gunung api."
JANGAN menjawab pertanyaan di luar bencana, tolak langsung dengan sopan.

ATURAN UTAMA 2: FORMAT TULISAN BERSIH (CLEAN TEXT TANPA BINTANG DAN TANPA TITIK KOMA)
1. DILARANG menggunakan tanda bintang ganda (seperti **kata**) atau tanda bintang tunggal (*kata*). Tuliskan kata biasa secara bersih tanpa tanda bintang sama sekali!
2. DILARANG menggunakan tanda titik koma (;). Jangan gunakan tanda titik koma pada akhir poin daftar atau di tengah kalimat. Gunakan tanda titik (.) atau koma (,) standar.
3. DILARANG menggunakan tanda pagar heading (seperti #, ##, ###). Untuk judul bagian, gunakan huruf kapital biasa pada baris tersendiri.
4. DILARANG menggunakan tanda blockquote (>), garis pembatas (---), atau tanda kutip kode backtick (\`).
5. Untuk daftar atau rincian poin, gunakan tanda poin bulat bersih (•) atau penomoran angka biasa (1., 2., 3.).
6. Tuliskan teks dengan paragraf yang rapi, bersih, bahasa Indonesia yang tenang, jelas, dan mudah dipahami dalam situasi darurat.
7. Jika darurat, sertakan kontak darurat: BNPB (117), BASARNAS (115), Ambulans (118/119), Polisi (110).`;

        // Format conversation history for Gemini API: { role: 'user' | 'model', parts: [{ text }] }
        const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

        if (Array.isArray(history)) {
          for (const item of history.slice(-8)) {
            if (item && item.content) {
              contents.push({
                role: item.role === "assistant" || item.role === "model" ? "model" : "user",
                parts: [{ text: String(item.content) }],
              });
            }
          }
        }

        // Append the latest user query
        contents.push({
          role: "user",
          parts: [{ text: message }],
        });

        // Try primary model (gemini-3.8-flash), with fallback to gemini-2.5-flash / gemini-1.5-flash
        let reply = "";
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents,
            config: {
              systemInstruction,
              temperature: 0.6,
            },
          });
          reply = response.text || "";
        } catch (modelErr) {
          console.warn("gemini-3.8-flash failed, attempting fallback to gemini-2.5-flash:", modelErr);
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction,
              temperature: 0.6,
            },
          });
          reply = response.text || "";
        }

        if (reply.trim()) {
          const cleanedReply = cleanOutputText(reply);
          return NextResponse.json({
            success: true,
            reply: cleanedReply,
            source: "GOOGLE_GEMINI_LIVE",
          });
        }
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to emergency knowledge-base:", geminiError);
      }
    }

    // Heuristics Knowledge-Base Fallback (when GEMINI_API_KEY is offline)
    const lower = message.toLowerCase();
    let fallbackReply = "";

    const isDisasterRelated = [
      "gempa", "tsunami", "gunung", "erupsi", "lahar", "banjir", "longsor",
      "karhutla", "kebakaran", "badai", "angin", "evakuasi", "tas", "siaga",
      "darurat", "pertolongan", "p3k", "reruntuhan", "bnpb", "bmkg", "basarnas",
      "shelter", "korban", "mitigasi", "bencana"
    ].some((kw) => lower.includes(kw));

    if (!isDisasterRelated) {
      fallbackReply = `Maaf, saya adalah DISASTRA AI Assistant yang dikhususkan hanya untuk kesiapsiagaan, mitigasi, dan tanggap darurat bencana di Indonesia.

Saya tidak dapat menjawab pertanyaan di luar topik kebencanaan dan keselamatan darurat.

Silakan ajukan pertanyaan seputar:
• Protokol keselamatan gempa bumi di gedung bertingkat atau rumah
• Cara evakuasi cepat tsunami (metode 20-20-20)
• Isi tas siaga bencana 72 jam
• Pertolongan pertama korban bencana
• Bahaya abu vulkanik dan status gunung api`;
    } else if (lower.includes("gedung") || (lower.includes("gempa") && lower.includes("tingkat"))) {
      fallbackReply = `PROTOKOL KESELAMATAN GEMPA DI GEDUNG BERTINGKAT

1. Drop, Cover, and Hold On: Segera berlutut, lindungi kepala dan leher di bawah meja kokoh. Jauhi jendela kaca dan dinding luar.
2. JANGAN Gunakan Lift: Gunakan selalu tangga darurat setelah guncangan berhenti total.
3. Waspadai Alarm dan Sprinkler: Tetap tenang dan jangan berebut keluar saat gempa masih terjadi.
4. Setelah Guncangan Berhenti: Matikan aliran listrik jika memungkinkan, bawa tas darurat, dan evakuasi menuju Titik Kumpul (Assembly Point).

Nomor Darurat: BASARNAS 115 | BNPB 117`;
    } else if (lower.includes("tsunami") || lower.includes("laut")) {
      fallbackReply = `PEDOMAN EVAKUASI CEPAT TSUNAMI (METODE 20-20-20)

1. Guncangan 20 Detik: Jika gempa terasa kuat lebih dari 20 detik atau Anda sulit berdiri tegak.
2. Waktu Evakuasi 20 Menit: Anda memiliki waktu sekitar 20 menit sebelum gelombang pertama tiba di pantai. Jangan menunggu sirine jika ada tanda alam (air laut surut drastis, bau belerang, suara gemuruh laut).
3. Ketinggian 20 Meter: Segera lari menuju dataran dengan elevasi minimal 20 meter di atas permukaan laut atau bangunan evakuasi vertikal lantai 3 ke atas.
4. Hindari Jembatan dan Muara Sungai: Gelombang tsunami menjalar lebih cepat dan tinggi memasuki muara sungai.
5. JANGAN Kembali Sebelum Dinyatakan Resmi Aman oleh BMKG: Gelombang susulan sering kali jauh lebih besar daripada gelombang pertama.`;
    } else if (lower.includes("tas") || lower.includes("survival") || lower.includes("siaga")) {
      fallbackReply = `ISI TAS SIAGA BENCANA (SURVIVAL KIT 72 JAM)

Kebutuhan Pokok:
• Air mineral bersih minimal 3 liter per orang untuk 3 hari
• Makanan siap santap berkalori tinggi seperti biskuit energi, makanan kaleng, madu

Medis dan Higienitas:
• Kotak P3K standar (antiseptik, perban, plester, gunting)
• Obat-obatan pribadi rutin minimal untuk 7 hari
• Masker medis atau N95 dan tisu basah

Peralatan dan Komunikasi:
• Senter LED taktis dan baterai cadangan
• Peluit darurat untuk meminta pertolongan jika terjebak
• Powerbank berkapasitas besar dan radio baterai
• Pisau lipat serbaguna (multitool)

Dokumen Penting:
• Salinan KTP, KK, dan surat berharga dalam kantong kedap air
• Uang tunai pecahan kecil`;
    } else if (lower.includes("pertolongan") || lower.includes("reruntuhan") || lower.includes("p3k")) {
      fallbackReply = `PERTOLONGAN PERTAMA PADA KORBAN RERUNTUHAN

1. Pastikan Keamanan Diri Penolong: Jangan masuk ke reruntuhan yang belum stabil jika ada ancaman gempa susulan.
2. Komunikasi dengan Korban: Ketuk pipa atau dinding untuk menandai lokasi. Minta korban menghemat tenaga dan tidak berteriak terus-menerus agar tidak menghirup debu pekat.
3. Waspadai Sindrom Hancur (Crush Syndrome): Jika anggota tubuh korban tertindih beban berat lebih dari 15 menit, jangan langsung mengangkat beban secara mendadak tanpa kesiapan tim medis dan cairan infus.
4. Hentikan Pendarahan: Berikan tekanan langsung menggunakan kain bersih pada luka terbuka. Jaga korban tetap hangat dengan selimut.`;
    } else {
      fallbackReply = `PANDUAN KESIAPSIAGAAN BENCANA DISASTRA

Prinsip Utama: Ketenangan, kesiapan rute evakuasi, dan kecepatan mengambil keputusan adalah kunci utama keselamatan.

Layanan Panggilan Darurat Nasional (Bebas Pulsa):
• 117 : BNPB (Badan Nasional Penanggulangan Bencana)
• 115 : BASARNAS (Pencarian dan Pertolongan)
• 118 / 119 : Layanan Ambulans dan Medis Darurat
• 110 : Kepolisian Republik Indonesia
• 113 : Pemadam Kebakaran

Silakan ketik pertanyaan spesifik seputar protokol gempa, evakuasi tsunami, letusan gunung api, atau tas siaga bencana.`;
    }

    return NextResponse.json({
      success: true,
      reply: cleanOutputText(fallbackReply),
      source: "EMERGENCY_KNOWLEDGE_BASE",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI Assistant error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
