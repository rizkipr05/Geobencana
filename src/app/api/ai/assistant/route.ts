import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Prompt message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `Anda adalah DISASTRA AI Assistant — sistem kecerdasan buatan terdepan untuk kesiapsiagaan, mitigasi, analisis bahaya, dan evakuasi bencana global (Gempa Bumi, Tsunami, Erupsi Vulkanik, Banjir, Cuaca Ekstrem).
Berikan respons yang tenang, taktis, sangat terstruktur, dan berbasis data ilmiah BMKG, USGS, BNPB, dan Sendai Framework.
Format respons Anda dengan heading, poin-poin jelas, dan langkah darurat yang aplikatif. Jika dalam kondisi darurat aktif, sebutkan nomor darurat resmi Indonesia: BNPB (117), BASARNAS (115), Ambulans (118/119).`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemInstruction}\n\nRiwayat Pesan Terakhir: ${JSON.stringify(
                    history?.slice(-4) || []
                  )}\n\nPertanyaan Pengguna: ${message}`,
                },
              ],
            },
          ],
        });

        const reply = response.text || "Tidak ada respons yang dihasilkan.";
        return NextResponse.json({ success: true, reply });
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to emergency knowledge-base:", geminiError);
      }
    }

    // Heuristics Knowledge-Base Fallback
    const lower = message.toLowerCase();
    let fallbackReply = "";

    if (lower.includes("gedung") || (lower.includes("gempa") && lower.includes("tingkat"))) {
      fallbackReply = `### Protokol Keselamatan Gempa di Gedung Bertingkat:
1. **Drop, Cover, and Hold On**: Segera berlutut, lindungi kepala dan leher di bawah meja kokoh. Jangan berdiri di dekat kaca jendela atau dinding eksterior.
2. **JANGAN Gunakan Lift**: Listrik berisiko padam dan kabel lift dapat tersangkut atau anjlok. Gunakan selalu **Tangga Darurat** setelah guncangan berhenti.
3. **Waspadai Alarm & Sprinkler**: Saat gempa, sensor kebakaran dan sprinkler mungkin aktif secara otomatis. Tetap tenang dan jangan panik berebut keluar saat gempa masih berayun.
4. **Setelah Guncangan Berhenti**: Matikan perangkat listrik jika memungkinkan, ambil tas darurat, dan evakuasi teratur menuju Assembly Point (Titik Kumpul).

*Nomor Darurat: Basarnas 115 | BNPB 117*`;
    } else if (lower.includes("tsunami") || lower.includes("laut")) {
      fallbackReply = `### Pedoman Evakuasi Cepat Tsunami (Metode 20-20-20):
1. **Guncangan 20 Detik**: Jika gempa terasa kuat lebih dari 20 detik atau Anda kesulitan berdiri.
2. **Waktu Evakuasi 20 Menit**: Anda memiliki waktu sekitar 20 menit sebelum gelombang pertama tiba di pantai. JANGAN menunggu sirine berbunyi jika tanda alam sudah jelas (air laut surut drastis, bau belerang kuat, suara gemuruh dari laut).
3. **Ketinggian 20 Meter**: Segera lari menuju dataran dengan elevasi minimal **20 meter di atas permukaan laut** atau bangunan vertikal evakuasi (TES) lantai 3 ke atas.
4. **Hindari Jembatan Sungai**: Gelombang tsunami akan menjalar lebih cepat dan tinggi memasuki muara sungai.
5. **JANGAN Kembali Sebelum Resmi Aman**: Gelombang kedua dan ketiga sering kali jauh lebih besar daripada gelombang pertama.`;
    } else if (lower.includes("tas") || lower.includes("survival") || lower.includes("siaga")) {
      fallbackReply = `### Isi Tas Siaga Bencana (Survival Kit 72-Jam):
1. **Kebutuhan Pokok**:
   - Air mineral bersih (minimal 3 liter/orang untuk 3 hari).
   - Makanan siap santap berkalori tinggi (biskuit energi, makanan kaleng, madu).
2. **Medis & Higienitas**:
   - Kotak P3K standar (antiseptik, perban, plester, gunting).
   - Obat-obatan pribadi rutin minimal untuk 7 hari.
   - Masker medis / N95 dan tisu basah sanitasi.
3. **Komunikasi & Peralatan**:
   - Senter taktis LED + baterai cadangan.
   - Peluit darurat (untuk meminta pertolongan jika terjebak).
   - Powerbank berkapasitas besar & radio baterai AM/FM.
   - Pisau lipat serbaguna (multitool).
4. **Dokumen & Finansial**:
   - Fotokopi KTP, KK, Akta, Sertifikat (dalam kantong kedap air).
   - Uang tunai pecahan kecil (karena ATM & jaringan perbankan bisa lumpuh).`;
    } else if (lower.includes("pertolongan") || lower.includes("reruntuhan") || lower.includes("p3k")) {
      fallbackReply = `### Pertolongan Pertama Pada Korban Terjebak Reruntuhan:
1. **Pastikan Keamanan Diri Penolong**: Jangan masuk ke dalam reruntuhan yang belum stabil jika ada ancaman gempa susulan.
2. **Komunikasi dengan Korban**: Ketuk pipa atau dinding untuk menandai keberadaan. Beritahu korban untuk menghemat tenaga dan tidak berteriak terus-menerus agar tidak menghirup debu berbahaya.
3. **Waspadai Crush Syndrome**: Jika anggota tubuh korban tertindih benda berat lebih dari 15-30 menit, jangan langsung mengangkat beban secara mendadak tanpa tim medis siap memberikan hidrasi cairan infus.
4. **Hentikan Pendarahan Aktif**: Berikan tekanan langsung menggunakan kain bersih pada luka terbuka. Jaga korban tetap hangat dengan selimut termal.`;
    } else {
      fallbackReply = `### Panduan Kesiapsiagaan Bencana DISASTRA:
- **Prinsip Utama**: Ketenangan, kesiapan rute, dan kecepatan mengambil keputusan adalah faktor utama kelangsungan hidup.
- **Layanan Panggilan Darurat Nasional (Bebas Pulsa)**:
  * **117** : BNPB (Badan Nasional Penanggulangan Bencana)
  * **115** : BASARNAS (Pencarian dan Pertolongan)
  * **118 / 119** : Layanan Ambulans & Gawat Darurat
  * **110** : Kepolisian Republik Indonesia

Ketik pertanyaan spesifik mengenai skenario gempa bumi, evakuasi tsunami, letusan gunung api, atau peralatan evakuasi untuk panduan taktis instan.`;
    }

    return NextResponse.json({ success: true, reply: fallbackReply });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI Assistant error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
