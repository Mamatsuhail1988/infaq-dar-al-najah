# Infaq Dar Al-Najah

Laman kutipan infaq untuk naik taraf dua tandas duduk di **Maahad Tahfiz Al-Quran Dar Al-Najah**.

Laman statik sepenuhnya — HTML, CSS dan JavaScript sahaja. Tiada pelayan, tiada pangkalan data.
Hosting: **GitHub Pages** · Domain: **infaq.drsuhailsatri.com**

## Struktur

```
index.html              laman utama
styles.css              gaya
app.js                  logik (jumlah, salin, kongsi)
data/progress.json      jumlah kutipan yang telah disahkan
assets/logo.png         logo maahad
assets/qr-duitnow.png   QR DuitNow AEON Bank
CNAME                   domain tersuai untuk GitHub Pages
```

## Mengemas kini jumlah kutipan

1. Semak akaun AEON Bank dan kira **jumlah keseluruhan** terkumpul
   (contoh: RM220 + RM50 → masukkan `270`).
2. Buka `data/progress.json`.
3. Ubah `total` kepada jumlah keseluruhan baharu.
4. Ubah `donors` kepada **bilangan penderma** setakat ini (nombor sahaja —
   jangan letak nama sesiapa).
5. Ubah `updatedAt` kepada tarikh dan masa semasa (format ISO, waktu Malaysia,
   contoh `2026-10-20T09:30:00+08:00`).
6. Tambah **satu baris** dalam `history` — tarikh dan jumlah yang baru disahkan.
   Baris ini yang membina "Rekod semakan" pada laman.
7. Commit dan push. Laman menunjukkan jumlah baharu dalam ~1 minit.

**Penting:** jangan letak nama penderma, walaupun dipendekkan. Nama + fakta
seseorang menderma ialah data peribadi di bawah PDPA, dan infaq lebih afdal
dirahsiakan. Bilangan penderma sudah cukup untuk menunjukkan ketelusan.

QR dan butang derma **hilang sendiri** apabila `total` sampai `3000`.

## Menjalankan di komputer sendiri

```bash
python -m http.server 8000
# kemudian buka http://localhost:8000
```

Perlu jalankan melalui pelayan kecil (bukan buka fail terus) supaya
`data/progress.json` boleh dibaca oleh pelayar.

## Nota

- Nombor akaun adalah akaun peribadi Dr Suhail, digunakan dengan persetujuan mudir maahad.
- Laman ini tidak meminta nama, e-mel atau resit penderma.
- Tiada resit rasmi atau pelepasan cukai ditawarkan.
