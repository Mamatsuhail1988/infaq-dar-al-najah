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
2. Buka `data/progress.json` dan ubah `total`.
3. Ubah `updatedAt` kepada tarikh dan masa semasa (format ISO, waktu Malaysia,
   contoh `2026-10-20T09:30:00+08:00`).
4. Commit dan push. Laman akan menunjukkan jumlah baharu dalam ~1 minit.

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
