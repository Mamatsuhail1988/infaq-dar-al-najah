#!/usr/bin/env python3
"""Kemas kini data/progress.json dengan selamat.

Guna:
    python update_jumlah.py tambah 20          # +RM20, penderma +1
    python update_jumlah.py tambah 20 --sama   # +RM20, penderma SAMA (orang yang sama derma lagi)
    python update_jumlah.py set 700 --donors 8 # tetapkan terus (untuk pembetulan)

Sentiasa: rekod tarikh, tambah satu baris 'history', simpan format JSON.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, "data", "progress.json")
MYT = timezone(timedelta(hours=8))


def load():
    with open(PATH, encoding="utf-8") as f:
        return json.load(f)


def save(d):
    with open(PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def stamp():
    return datetime.now(MYT).strftime("%Y-%m-%dT%H:%M:%S+08:00")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("mod", choices=["tambah", "set"])
    p.add_argument("nilai", type=float, help="jumlah RM")
    p.add_argument("--donors", type=int, default=None,
                   help="bilangan penderma (mod 'set')")
    p.add_argument("--sama", action="store_true",
                   help="penderma yang sama derma lagi - bilangan TIDAK naik")
    a = p.parse_args()

    d = load()
    lama_total = d["total"]
    lama_donors = d.get("donors", 0)

    if a.mod == "tambah":
        if a.nilai <= 0:
            sys.exit("RALAT: jumlah mesti positif")
        baharu = round(lama_total + a.nilai, 2)
        donors = lama_donors if a.sama else lama_donors + 1
    else:
        baharu = round(a.nilai, 2)
        donors = a.donors if a.donors is not None else lama_donors

    if baharu < lama_total:
        sys.exit("RALAT: jumlah baharu (%.2f) lebih KECIL daripada lama (%.2f).\n"
                 "       Kalau memang nak turunkan, guna mod 'set'." % (baharu, lama_total))

    t = stamp()
    d["total"] = baharu
    d["donors"] = donors
    d["updatedAt"] = t
    d.setdefault("history", []).append({"at": t, "total": baharu})

    # elak entri bertindih pada jumlah sama
    h = d["history"]
    if len(h) > 1 and h[-1]["total"] == h[-2]["total"]:
        h.pop(-1)

    save(d)

    print("  Sebelum : RM%.2f  (%d penderma)" % (lama_total, lama_donors))
    print("  Tambah  : RM%.2f" % a.nilai if a.mod == "tambah" else "  Set     : RM%.2f" % baharu)
    print("  Sekarang: RM%.2f  (%d penderma)" % (baharu, donors))
    print("  Baki    : RM%.2f" % (d["target"] - baharu))
    print("  Peratus : %.1f%%" % (baharu / d["target"] * 100))
    print("  Sejarah : " + " -> ".join("RM%g" % x["total"] for x in h))
    print("  Masa    : " + t)


if __name__ == "__main__":
    main()
