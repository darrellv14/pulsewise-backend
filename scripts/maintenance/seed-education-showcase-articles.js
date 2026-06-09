/* eslint-disable no-console */
require('dotenv').config({ override: true });

const API_BASE_URL =
  process.env.EDUCATION_SEED_BASE_URL || 'https://api.darrellvalentino.com';
const ADMIN_EMAIL =
  process.env.EDUCATION_SEED_ADMIN_EMAIL || 'darrell.valentino14@gmail.com';
const ADMIN_PASSWORD =
  process.env.EDUCATION_SEED_ADMIN_PASSWORD || 'dev12345';

const SHOWCASE_ARTICLES = [
  {
    title: 'Memulai Jalan Kaki 10 Menit untuk Jantung yang Lebih Tenang',
    categorySlug: 'gaya-hidup-aktivitas',
    excerpt:
      'Panduan ringan untuk memulai kebiasaan jalan kaki harian tanpa terasa menakutkan bagi pasien jantung.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-walk-10min',
    tags: ['aktivitas-ringan', 'jalan-kaki', 'jantung', 'rutinitas'],
    contentMarkdown: `# Memulai Jalan Kaki 10 Menit untuk Jantung yang Lebih Tenang

![Lansia berjalan santai di taman pada pagi hari](https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=80)

## Kenapa mulai dari 10 menit?

Tidak semua perubahan sehat harus dimulai dari target besar. Untuk banyak pasien, **10 menit jalan kaki** justru lebih realistis dan lebih mudah dipertahankan.

> Kebiasaan kecil yang dilakukan konsisten sering lebih bermanfaat daripada target besar yang hanya bertahan beberapa hari.

## Tiga aturan awal yang aman

1. Gunakan kecepatan yang masih nyaman untuk berbicara.
2. Pilih jalur datar terlebih dahulu.
3. Berhenti bila muncul keluhan yang terasa tidak biasa.

## Checklist sebelum mulai

- Gunakan alas kaki yang nyaman.
- Siapkan air minum.
- Hindari cuaca yang terlalu panas.
- Catat durasi jalan di akhir sesi.

---

## Contoh target minggu pertama

### Hari 1-2
Jalan santai 10 menit setelah sarapan atau sore hari.

### Hari 3-5
Naikkan menjadi 12-15 menit jika tubuh terasa nyaman.

### Hari 6-7
Ulangi durasi yang terasa paling stabil agar tubuh beradaptasi.

## Kapan perlu berhenti dan evaluasi?

Segera hentikan aktivitas bila muncul:
- nyeri dada
- sesak yang makin berat
- pusing mendadak
- jantung berdebar tidak biasa

### Catatan penutup
Tujuan awal bukan mengejar jauh atau cepat, tetapi membangun rasa aman dan ritme yang bisa diulang setiap hari.`,
  },
  {
    title: 'Menyusun Piring Rendah Garam yang Tetap Enak untuk Keluarga',
    categorySlug: 'nutrisi-pola-makan',
    excerpt:
      'Contoh sederhana menyusun menu rendah garam dengan rasa tetap nyaman dan tidak terasa seperti diet yang menghukum.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-low-salt-plate',
    tags: ['nutrisi', 'rendah-garam', 'makanan-rumah', 'keluarga'],
    contentMarkdown: `# Menyusun Piring Rendah Garam yang Tetap Enak untuk Keluarga

## Prinsip dasarnya

Pola makan rendah garam tidak berarti makanan harus hambar. Rasa tetap bisa hadir dari **asam, aroma rempah, tekstur, dan cara memasak**.

![Contoh sajian sayur dan protein dengan warna cerah](https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=80)

## Susunan piring yang mudah diikuti

### 1. Setengah piring sayur
Pilih sayur bening, tumis ringan, atau kukus dengan bawang putih dan perasan jeruk nipis.

### 2. Seperempat piring protein
Ikan, ayam tanpa kulit, tahu, atau tempe bisa jadi pilihan yang aman dan familiar.

### 3. Seperempat piring karbohidrat
Nasi, kentang rebus, atau ubi tetap boleh selama porsinya terukur.

## Pengganti rasa asin yang sering membantu

- bawang putih tumis
- bawang bombai
- lada hitam
- jeruk nipis
- daun bawang
- seledri

> Banyak keluarga gagal bertahan bukan karena menunya salah, tapi karena perubahan rasanya terlalu mendadak.

## Contoh menu 1 hari

### Sarapan
Oat hangat + irisan pisang + telur rebus.

### Makan siang
Nasi, ikan panggang, sayur bening bayam, dan potongan pepaya.

### Makan malam
Sup ayam rumahan dengan wortel dan kentang, tanpa tambahan penyedap berlebihan.

---

## Saat belanja bahan makanan

Perhatikan label:
1. pilih bahan segar lebih dulu
2. bandingkan kandungan sodium pada produk kemasan
3. hindari stok saus asin berlebihan di rumah

### Penutup
Kalau seluruh keluarga ikut menyesuaikan rasa bersama, pasien biasanya jauh lebih mudah konsisten.`,
  },
  {
    title: 'Kapan Sesak Napas Perlu Dianggap Tanda Bahaya di Rumah',
    categorySlug: 'gejala-tanda-bahaya',
    excerpt:
      'Panduan singkat membedakan sesak yang perlu dipantau dengan sesak yang harus segera dibawa ke layanan medis.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-breath-warning',
    tags: ['sesak-napas', 'tanda-bahaya', 'pemantauan', 'keluarga'],
    contentMarkdown: `# Kapan Sesak Napas Perlu Dianggap Tanda Bahaya di Rumah

## Tidak semua sesak napas sama

Sesak bisa muncul karena aktivitas, kelelahan, kecemasan, atau kondisi jantung dan paru yang sedang memburuk. Karena itu, keluarga perlu tahu kapan cukup dipantau dan kapan harus bergerak cepat.

![Tenaga medis membantu pasien dengan pemantauan pernapasan](https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1400&q=80)

## Tanda yang masih bisa dipantau singkat

- muncul setelah aktivitas ringan lalu membaik saat istirahat
- tidak disertai nyeri dada
- tidak disertai kebiruan pada bibir

## Tanda bahaya yang tidak sebaiknya ditunda

### Segera cari bantuan bila sesak:
1. muncul mendadak saat sedang diam
2. terasa makin berat dalam hitungan menit
3. disertai nyeri dada atau keringat dingin
4. membuat pasien sulit bicara satu kalimat penuh

> Bila keluarga merasa "ini berbeda dari biasanya", intuisi itu layak dianggap serius.

## Hal cepat yang bisa dilakukan sambil bersiap

- bantu pasien duduk lebih tegak
- longgarkan pakaian yang ketat
- catat jam mulai keluhan
- siapkan daftar obat rutin

---

## Informasi yang baik untuk dibawa saat ke fasilitas kesehatan

### Catat singkat:
- kapan mulai sesak
- apakah muncul saat aktivitas atau saat istirahat
- keluhan lain yang menyertai
- obat yang sudah diminum hari itu

### Penutup
Tujuan edukasi ini bukan membuat keluarga panik, tetapi membantu mengambil keputusan lebih cepat saat gejala penting muncul.`,
  },
  {
    title: 'Mengenal Pembengkakan Kaki pada Pasien Gagal Jantung',
    categorySlug: 'gejala-tanda-bahaya',
    excerpt:
      'Mengapa kaki bisa membengkak dan bagaimana cara sederhana memantau penumpukan cairan di rumah.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-swollen-legs',
    tags: ['pembengkakan', 'gagal-jantung', 'edema', 'pemantauan'],
    contentMarkdown: `# Mengenal Pembengkakan Kaki pada Pasien Gagal Jantung

## Mengapa kaki bisa membengkak?

Ketika pompa jantung tidak bekerja optimal, cairan tubuh cenderung menumpuk di area paling bawah akibat gravitasi, yaitu pergelangan dan punggung kaki. Kondisi ini sering disebut sebagai **Edema**.

![Dokter memeriksa area kaki pasien](https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=1400&q=80)

## Cara mendeteksi penumpukan cairan (Pitting Test)

1. Tekan area yang bengkak (di atas tulang kering atau punggung kaki) menggunakan ibu jari selama 5 detik.
2. Lepaskan tekanan.
3. Perhatikan apakah bekas tekanan meninggalkan cekungan yang lama kembali. Jika iya, itu tanda positif penumpukan cairan.

## Langkah penanganan mandiri di rumah

- **Elevasi kaki:** Ganjal kaki dengan 1-2 bantal saat tidur agar posisinya sejajar atau sedikit lebih tinggi dari jantung.
- **Kurangi garam:** Garam bersifat mengikat air, memicu bengkak yang lebih parah.
- **Catat berat badan:** Kenaikan berat badan drastis dalam waktu singkat biasanya berupa cairan, bukan lemak.

---

## Kapan harus menghubungi dokter?

- Bengkak semakin naik ke arah lutut atau paha.
- Disertai dengan berkurangnya jumlah urin saat buang air kecil.
- Pasien mulai merasa sesak saat tidur terlentang flat.

### Penutup
Pemantauan kaki setiap pagi setelah bangun tidur adalah kebiasaan protektif yang sangat membantu mendeteksi perburukan kondisi sejak dini.`,
  },
  {
    title: 'Pentingnya Menimbang Berat Badan Setiap Pagi',
    categorySlug: 'gaya-hidup-aktivitas',
    excerpt:
      'Mengapa timbangan harian menjadi detektor terbaik untuk memantau retensi cairan pada gangguan jantung.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-weight-track',
    tags: ['berat-badan', 'retensi-cairan', 'monitoring', 'rutinitas'],
    contentMarkdown: `# Pentingnya Menimbang Berat Badan Setiap Pagi

## Detektor cairan tercepat

Bagi pasien dengan riwayat gangguan fungsi jantung, naik berat badan mendadak dalam beberapa hari hampir selalu menandakan **retensi cairan (penumpukan air)**, bukan massa otot atau lemak tubuh.

> Kenaikan berat badan sebesar 1 hingga 2 kilogram dalam waktu kurang dari 3 hari adalah sinyal peringatan dini.

![Timbangan badan digital di lantai kamar](https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1400&q=80)

## Protokol menimbang yang benar

Untuk mendapatkan data yang akurat dan konsisten, ikuti 3 aturan emas berikut:

1. **Waktu sama:** Setiap pagi hari tepat setelah buang air kecil pertama.
2. **Kondisi sama:** Sebelum makan atau minum apa pun.
3. **Pakaian sama:** Gunakan pakaian tidur yang minimal atau serupa setiap harinya.

## Panduan evaluasi data timbangan

| Pola Kenaikan | Kategori | Tindakan |
| :--- | :--- | :--- |
| < 0.5 kg dalam sehari | Normal | Lanjutkan pemantauan rutin |
| > 1 kg dalam 24 jam | Waspada | Batasi ketat asupan garam & cairan |
| > 2 kg dalam 3 hari | Bahaya | Segera konsultasikan ke dokter / sesuaikan dosis obat |

---

## Catat, jangan hanya diingat

Sediakan buku kecil atau aplikasi catatan di samping timbangan Anda. Pola tren mingguan dari catatan tersebut akan sangat membantu dokter Anda saat sesi kontrol bulanan.`,
  },
  {
    title: 'Panduan Membatasi Cairan Tanpa Merasa Tersiksa oleh Rasa Haus',
    categorySlug: 'nutrisi-pola-makan',
    excerpt:
      'Tips praktis mengelola kuota minum harian bagi pasien yang mendapatkan instruksi pembatasan cairan dari dokter.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-fluid-restriction',
    tags: ['nutrisi', 'pembatasan-air', 'tips-haus', 'manajemen-gejala'],
    contentMarkdown: `# Panduan Membatasi Cairan Tanpa Merasa Tersiksa oleh Rasa Haus

## Mengapa cairan harus dibatasi?

Pada kondisi gagal jantung berat, minum terlalu banyak cairan membuat volume darah meningkat secara drastis, sehingga beban kerja pompa jantung menjadi terlampau berat. Dokter biasanya memberikan kuota ketat (misal: **1200 mL hingga 1500 mL per hari**).

![Segelas air jernih dengan potongan lemon](https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1400&q=80)

## Strategi membagi kuota cairan harian

Jangan habiskan kuota minum Anda di pagi hari. Gunakan botol minum khusus yang sudah diukur volumenya sejak pagi hari sebagai acuan tunggal.

- **400 mL** untuk konsumsi obat sepanjang hari.
- **500 mL** dialokasikan bersama waktu makan utama (pagi, siang, malam).
- **Sisa kuota** disimpan untuk momen di luar makan utama.

## Trik cerdas meredakan rasa haus yang mengganggu

Jika mulut terasa sangat kering namun kuota minum sudah menipis, cobalah tips berikut:

1. **Gunakan es batu:** Mengulum satu kotak kecil es batu memberikan efek dingin yang menyegarkan di mulut dengan volume air yang jauh lebih sedikit dibanding meminum air.
2. **Potongan buah dingin:** Mengunyah irisan tipis mentimun atau lemon dingin dapat merangsang produksi air liur secara alami.
3. **Berkumur:** Berkumurlah menggunakan air dingin lalu buang kembali airnya (jangan ditelan).

---

## Ingat cairan tersembunyi

Kuah sup, bubur, yogurt, puding, dan es krim juga dihitung sebagai asupan cairan tubuh. Jika Anda mengonsumsi makanan berkuah saat makan siang, kurangi porsi air minum Anda secara proporsional.`,
  },
  {
    title: 'Manfaat Istirahat Siang Berkualitas bagi Pemulihan Jantung',
    categorySlug: 'gaya-hidup-aktivitas',
    excerpt:
      'Bagaimana tidur siang singkat berdurasi 20-30 menit dapat menurunkan tekanan darah dan mengistirahatkan otot jantung.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1520206183501-b80df61043c2?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-power-nap',
    tags: ['istirahat', 'tidur-siang', 'pemulihan', 'hipertensi'],
    contentMarkdown: `# Manfaat Istirahat Siang Berkualitas bagi Pemulihan Jantung

## Menurunkan beban kerja sirkulasi

Tidur siang dalam durasi yang tepat terbukti secara klinis mampu menurunkan aktivitas sistem saraf simpatis. Dampak langsungnya adalah **penurunan denyut nadi** dan **tekanan darah sistolik**, memberikan waktu bagi otot jantung untuk berelaksasi sejenak.

![Seseorang beristirahat dengan tenang di sofa yang nyaman](https://images.unsplash.com/photo-1511295742364-92b9345f8e2c?auto=format&fit=crop&w=1400&q=80)

## Aturan main "Power Nap" yang sehat

Tidur siang yang terlalu lama justru bisa memicu rasa lemas dan mengacaukan ritme tidur malam hari.

### Durasi ideal: 20-30 menit
Rentang waktu ini cukup untuk menyegarkan tubuh tanpa memasuki fase tidur dalam (*deep sleep*).

### Waktu terbaik: Jam 1 hingga Jam 3 siang
Merupakan waktu penurunan energi sirkadian alami tubuh setelah makan siang.

## Cara membangun lingkungan tidur yang suportif

- Redupkan cahaya lampu kamar atau gunakan penutup mata.
- Jauhkan perangkat gawai (*smartphone*) minimal 2 meter dari tempat tidur.
- Pastikan sirkulasi udara kamar sejuk dan nyaman.

> Istirahat bukanlah tanda kelemahan, melainkan bagian dari strategi manajemen energi sirkulasi darah Anda.`,
  },
  {
    title: 'Mengenal Efek Samping Obat Jantung yang Sering Muncul',
    categorySlug: 'gejala-tanda-bahaya',
    excerpt:
      'Edukasi seputar efek samping obat seperti sering berkemih atau batuk kering, agar pasien tidak langsung menghentikan pengobatan.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-medication-effects',
    tags: ['obat-jantung', 'efek-samping', 'edukasi-pasien', 'kepatuhan'],
    contentMarkdown: `# Mengenal Efek Samping Obat Jantung yang Sering Muncul

## Jangan langsung menghentikan obat secara sepihak

Kepatuhan minum obat adalah pilar utama kestabilan pasien jantung. Seringkali pasien menghentikan konsumsi obat secara mendadak karena merasa tidak nyaman dengan efek sampingnya, padahal hal tersebut sangat berbahaya.

![Berbagai macam obat tablet dalam wadah harian](https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=1400&q=80)

## 3 Efek samping umum yang perlu Anda ketahui

### 1. Sering buang air kecil (Efek Obat Diuretik)
*Obat seperti Furosemide berfungsi membuang kelebihan cairan tubuh lewat urin.*
- **Solusi:** Minum obat ini di pagi hari, hindari konsumsi sore atau malam hari agar tidur malam Anda tidak terganggu.

### 2. Batuk kering berulang (Efek Obat ACE-Inhibitor)
*Obat golongan ini sangat baik untuk melindungi otot jantung, namun terkadang memicu refleks batuk.*
- **Solusi:** Jangan minum obat batuk sembarangan. Laporkan ke dokter pada jadwal kontrol berikutnya agar jenis obat bisa diganti ke golongan ARB jika diperlukan.

### 3. Pusing saat mendadak berdiri (Hipotensi Ortostatik)
*Efek dari obat penurun tekanan darah yang sedang bekerja merelaksasi pembuluh darah.*
- **Solusi:** Ubah posisi tubuh secara perlahan. Jangan langsung berdiri tegak dari posisi tidur; duduklah di tepi kasur selama 1 menit terlebih dahulu.

---

## Kapan efek samping tergolong darurat?
Segera ke instalasi gawat darurat jika muncul reaksi alergi berat seperti pembengkakan pada area bibir, lidah, atau wajah yang disertai kesulitan bernapas.`,
  },
  {
    title: 'Memilih Sumber Lemak Sehat untuk Melindungi Pembuluh Darah',
    categorySlug: 'nutrisi-pola-makan',
    excerpt:
      'Panduan membedakan lemak jenuh dan lemak tidak jenuh serta cara memasak yang aman untuk jantung.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-healthy-fats',
    tags: ['nutrisi', 'lemak-sehat', 'kolesterol', 'jantung-sehat'],
    contentMarkdown: `# Memilih Sumber Lemak Sehat untuk Melindungi Pembuluh Darah

## Jantung tetap butuh lemak

Tubuh kita tetap memerlukan lemak untuk memproduksi hormon dan menyerap vitamin. Kuncinya bukan menghindari seluruh jenis lemak, melainkan mengganti **lemak jenuh** menjadi **lemak tidak jenuh** yang ramah bagi pembuluh darah.

![Minyak zaitun, alpukat, dan kacang-kacangan sebagai sumber lemak baik](https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1400&q=80)

## Panduan memilah jenis lemak di dapur

### Kelompok Lemak Baik (Utamakan)
- **Asam lemak tak jenuh tunggal/ganda:** Ditemukan pada alpukat, ikan kembung, ikan salmon, kacang almond, minyak zaitun, dan minyak kanola.
- **Fungsi:** Membantu menjaga kadar kolesterol baik (HDL) tetap stabil.

### Kelompok Lemak Buruk (Batasi Ketat)
- **Lemak jenuh & Lemak trans:** Gorengan dengan minyak jelantah, mentega, daging berlemak tinggi, jeroan, dan minyak kelapa sawit berlebih.
- **Dampak:** Memicu pembentukan plak (aterosklerosis) pada dinding pembuluh darah koroner.

## Teknik memasak alternatif yang minim minyak

1. **Pepes atau Kukus:** Menjaga kelembapan buah/daging tanpa perlu tambahan minyak sama sekali.
2. **Panggang (Grill):** Menggunakan wajan anti-lengket dengan hanya mengoleskan tipis minyak menggunakan kuas.
3. **Sup bening:** Memanfaatkan kaldu alami dari potongan daging ayam tanpa kulit.

---

> Mengubah metode memasak dari menggoreng deep-fry menjadi memanggang ringan adalah investasi besar bagi kesehatan pembuluh darah jangka panjang Anda.`,
  },
  {
    title: 'Mengelola Stres agar Jantung Tidak Bekerja Terlalu Keras',
    categorySlug: 'gaya-hidup-aktivitas',
    excerpt:
      'Koneksi antara kesehatan mental dan beban mekanis jantung, dilengkapi teknik relaksasi pernapasan 4-7-8.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80',
    coverImagePublicId: 'external/showcase-stress-management',
    tags: ['kesehatan-mental', 'manajemen-stres', 'relaksasi', 'wellbeing'],
    contentMarkdown: `# Mengelola Stres agar Jantung Tidak Bekerja Terlalu Keras

## Hubungan pikiran dan beban mekanik jantung

Saat kita mengalami stres kronis atau kecemasan yang berkepanjangan, tubuh melepaskan hormon adrenalin dan kortisol. Hormon-hormon ini memaksa **jantung berdetak lebih cepat** dan menyebabkan pembuluh darah menyempit, memicu lonjakan tekanan darah secara konstan.

![Seseorang melakukan meditasi ringan di dekat jendela kamar](https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=80)

## Teknik Relaksasi Pernapasan Kotak (Metode 4-7-8)

Salah satu cara tercepat untuk mengirimkan sinyal "aman" ke pusat saraf sirkulasi darah adalah melalui kontrol pernapasan dalam. Lakukan latihan ini selama 5 menit saat Anda mulai merasa cemas:

1. **Tarik napas** melalui hidung secara perlahan dalam **4 detik**.
2. **Tahan napas** Anda di dalam dada selama **7 detik**.
3. **Hembuskan napas** sepenuhnya melalui mulut dengan suara mendesis selama **8 detik**.

## Langkah penyederhanaan aktivitas harian

- **Batasi konsumsi berita berat:** Hindari membaca berita atau media sosial yang memicu kecemasan di pagi hari dan 1 jam sebelum tidur.
- **Salurkan hobi ringan:** Menyiram tanaman hias, mendengarkan musik instrumental, atau menulis jurnal harian terbukti menurunkan ketegangan emosional.
- **Komunikasi terbuka:** Jangan memendam kekhawatiran seputar kondisi medis Anda sendirian; bicarakan dengan keluarga terdekat atau komunitas penyintas.

---

### Penutup
Menjaga ketenangan pikiran bukan sekadar kenyamanan emosional, melainkan bagian dari terapi medis yang nyata untuk meringankan beban kerja fisik jantung Anda.`,
  },
];

function makeUrl(path) {
  return `${API_BASE_URL.replace(/\/+$/, '')}${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(makeUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `${options.method || 'GET'} ${path} gagal: ${response.status} ${
        data?.message || text || response.statusText
      }`
    );
  }

  return data;
}

async function login() {
  const response = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  return response.data.token;
}

async function deleteExistingArticle(token, title) {
  const response = await request(
    `/admin/education/articles?page=1&limit=20&q=${encodeURIComponent(title)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const matches = (response.data.items || []).filter(
    (item) => item.title === title
  );

  for (const item of matches) {
    await request(`/admin/education/articles/${item.articleId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

async function createPublishedArticle(token, payload) {
  const created = await request('/education/articles', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const articleId = created.data.articleId;

  await request(`/education/articles/${articleId}/submit-review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  const approved = await request(`/admin/education/articles/${articleId}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  return approved.data;
}

async function run() {
  const token = await login();
  const results = [];

  for (const article of SHOWCASE_ARTICLES) {
    await deleteExistingArticle(token, article.title);
    const published = await createPublishedArticle(token, article);
    results.push({
      title: published.title,
      articleId: published.articleId,
      slug: published.slug,
    });
  }

  console.log('[seed:education:showcase] done');
  console.log(`[seed:education:showcase] baseUrl=${API_BASE_URL}`);
  console.log(`[seed:education:showcase] author=${ADMIN_EMAIL}`);
  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error('[seed:education:showcase] failed', error.message);
  process.exit(1);
});
