#!/usr/bin/env python3
"""Kemas kini data/progress.json dengan selamat.

Guna:
    python update_jumlah.py tambah 20           # +RM20, penderma +1
    python update_jumlah.py tambah 20 --sama    # +RM20, penderma SAMA (orang sama derma lagi)
    python update_jumlah.py set 700 --donors 8  # tetapkan terus (untuk pembetulan)
    python update_jumlah.py rapikan             # tulis semula fail tanpa tukar data

Fail output sengaja DIPADATKAN (satu entri history = satu baris) supaya
senang diedit terus di GitHub melalui telefon. `json.dump(indent=2)`
mengembangkan setiap entri jadi 3 baris - fail jadi dua kali panjang.
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, "data", "progress.json")
APPJS = os.path.join(HERE, "app.js")
MYT = timezone(timedelta(hours=8))

CARA = ("EDIT DI SINI: 'total' (jumlah RM terkumpul), 'donors' (bilangan orang), "
        "'updatedAt' (masa sekarang). 'history' pilihan - salin baris terakhir "
        "dan tukar 'at' + 'total' kalau nak rekod semakan bertambah.")


def load():
    with open(PATH, encoding="utf-8") as f:
        return json.load(f)


def jnum(v):
    """700.0 -> '700'  |  700.5 -> '700.50'"""
    f = float(v)
    return str(int(f)) if f == int(f) else "%.2f" % f


def save(d):
    """Tulis JSON padat: satu entri history = satu baris."""
    h = d.get("history", [])
    out = ["{",
           '  "cara_edit": %s,' % json.dumps(CARA, ensure_ascii=False),
           '  "total": %s,' % jnum(d["total"]),
           '  "target": %s,' % jnum(d["target"]),
           '  "donors": %d,' % d["donors"],
           '  "updatedAt": %s,' % json.dumps(d["updatedAt"]),
           '  "history": [']
    for i, e in enumerate(h):
        out.append('    { "at": %s, "total": %s }%s'
                   % (json.dumps(e["at"]), jnum(e["total"]),
                      "," if i < len(h) - 1 else ""))
    out += ["  ]", "}"]
    with open(PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out) + "\n")
    json.load(open(PATH, encoding="utf-8"))   # sahkan masih JSON sah


def sync_fallback(d):
    """Kemas kini objek FALLBACK dalam app.js.

    Jaring keselamatan laman: kalau progress.json rosak (edit tersilap
    dari telefon) atau laman sedang dibina, laman papar nilai ini dan
    BUKAN RM0. Ia mesti sentiasa sama dengan progress.json - kalau tidak
    ia jadi angka basi yang mengelirukan.
    """
    if not os.path.exists(APPJS):
        print("  (app.js tiada - FALLBACK tak dikemas kini)")
        return
    h = d.get("history", [])
    hist = ",\n".join(
        "      { at: %s, total: %s }" % (json.dumps(e["at"]).replace('"', "'"),
                                       jnum(e["total"]))
        for e in h)
    block = ("  var FALLBACK = {\n"
             "    total: %s,\n"
             "    target: %s,\n"
             "    donors: %d,\n"
             "    updatedAt: %s,\n"
             "    history: [\n%s\n    ]\n  };"
             % (jnum(d["total"]), jnum(d["target"]), d["donors"],
                json.dumps(d["updatedAt"]).replace('"', "'"), hist))
    src = open(APPJS, encoding="utf-8").read()
    new, n = re.subn(r"  var FALLBACK = \{.*?\n  \};", block, src, flags=re.S)
    if n != 1:
        print("  AMARAN: tak dapat kemas kini FALLBACK dalam app.js (padanan %d)" % n)
        return
    with open(APPJS, "w", encoding="utf-8", newline="\n") as f:
        f.write(new)
    print("  FALLBACK app.js dikemas kini")


def stamp():
    return datetime.now(MYT).strftime("%Y-%m-%dT%H:%M:%S+08:00")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("mod", choices=["tambah", "set", "rapikan"],
                   help="'rapikan' = tulis semula fail tanpa tukar data")
    p.add_argument("nilai", type=float, nargs="?", default=0.0, help="jumlah RM")
    p.add_argument("--donors", type=int, default=None,
                   help="bilangan penderma (mod 'set')")
    p.add_argument("--sama", action="store_true",
                   help="penderma yang sama derma lagi - bilangan TIDAK naik")
    p.add_argument("--masa", default=None,
                   help="masa SEBENAR derma masuk (ISO, cth 2026-10-14T18:37:00+08:00). "
                        "Kalau ditinggal, guna masa sekarang.")
    a = p.parse_args()

    d = load()
    lama_total = d["total"]
    lama_donors = d.get("donors", 0)
    h = d.setdefault("history", [])
    t = a.masa or stamp()

    if a.mod == "rapikan":
        d["total"] = lama_total
        d["donors"] = lama_donors
    elif a.mod == "tambah":
        if a.nilai <= 0:
            sys.exit("RALAT: jumlah mesti positif")
        d["total"] = lama_total + a.nilai
        d["donors"] = lama_donors if a.sama else lama_donors + 1
        h.append({"at": t, "total": d["total"]})
    else:  # set
        d["total"] = a.nilai
        d["donors"] = a.donors if a.donors is not None else lama_donors
        h.append({"at": t, "total": a.nilai})

    if a.mod != "rapikan":
        if d["total"] < lama_total:
            sys.exit("RALAT: jumlah baharu lebih KECIL daripada lama.\n"
                     "       Kalau memang nak turunkan, guna mod 'set'.")
        # 'updatedAt' = masa derma TERAKHIR yang disahkan, bukan masa skrip
        # dijalankan - supaya laman menunjukkan bila wang benar-benar masuk.
        d["updatedAt"] = max(e["at"] for e in h)
        if len(h) > 1 and h[-1]["total"] == h[-2]["total"]:
            h.pop(-1)                      # elak entri bertindih
        # simpan history ikut urutan masa (penting bila ada entri backdated)
        h.sort(key=lambda e: e["at"])

    save(d)
    sync_fallback(d)

    print("  Sebelum : RM%s  (%d penderma)" % (jnum(lama_total), lama_donors))
    print("  Sekarang: RM%s  (%d penderma)" % (jnum(d["total"]), d["donors"]))
    print("  Baki    : RM%s" % jnum(d["target"] - d["total"]))
    print("  Peratus : %.1f%%" % (d["total"] / d["target"] * 100))
    print("  Sejarah : " + " -> ".join("RM%s" % jnum(x["total"]) for x in h))
    print("  Baris   : %d" % len(open(PATH, encoding="utf-8").readlines()))


if __name__ == "__main__":
    main()
