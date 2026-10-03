import { useState, useEffect, useMemo } from "react";
import "./TabelPengeluaran.css";
import {
  ambilRows,
  ambilKategori,
  tambahRow,
  ubahRow,
  hapusRow,
  tambahKategori,
  hapusKategori,
  langgananData,
  keluar,
} from "./db";

const HUE = [210, 30, 150, 280, 185, 345, 55, 100, 240, 10, 320, 170];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const rp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
const today = () => new Date().toISOString().slice(0, 10);
const fmtTgl = (t) => t.split("-").reverse().join("/");
const labelBulan = (k) => {
  const [y, m] = k.split("-");
  return BULAN[+m - 1] + " " + y;
};
const gaya = (c) => {
  const h = HUE[c % HUE.length];
  return { background: `hsl(${h} 75% 90%)`, color: `hsl(${h} 60% 25%)` };
};

export default function TabelPengeluaran() {
  const [rows, setRows] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [katBaru, setKatBaru] = useState("");
  const emptyForm = () => ({ tgl: today(), toko: "", nama: "", qty: 1, harga: "", kat: kategori[0]?.nama ?? "" });
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [q, setQ] = useState("");
  const [fk, setFk] = useState("");
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const [sumMode, setSumMode] = useState("kat");
  const [exportBln, setExportBln] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const muat = async () => {
    try {
      const [r, k] = await Promise.all([ambilRows(), ambilKategori()]);
      setRows(r);
      setKategori(k);
      setGalat("");
    } catch {
      setGalat("Tidak bisa terhubung ke database. Cek internet, lalu muat ulang halaman.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    muat();
    return langgananData(muat);
  }, []);

  useEffect(() => {
    if (!form.kat && kategori.length) setForm((f) => ({ ...f, kat: kategori[0].nama }));
  }, [kategori, form.kat]);

  useEffect(() => {
    setPage(1);
  }, [q, fk, d1, d2]);

  const gayaKat = (nama) => {
    const k = kategori.find((x) => x.nama === nama);
    return k ? gaya(k.c) : undefined;
  };

  const semuaKat = useMemo(
    () => [...new Set([...kategori.map((k) => k.nama), ...rows.map((r) => r.kat)])],
    [kategori, rows]
  );
  const opsiForm = kategori.map((k) => k.nama);
  if (form.kat && !opsiForm.includes(form.kat)) opsiForm.unshift(form.kat);
  const tokoList = useMemo(() => [...new Set(rows.map((r) => r.toko).filter(Boolean))].sort(), [rows]);

  const tambahKat = async () => {
    const nama = katBaru.trim().replace(/\s+/g, " ").toUpperCase();
    if (!nama) return;
    if (kategori.some((k) => k.nama === nama)) {
      alert("Kategori itu sudah ada.");
      return;
    }
    const dipakai = new Set(kategori.map((k) => k.c % HUE.length));
    let c = 0;
    while (dipakai.has(c) && c < HUE.length) c++;
    if (c >= HUE.length) c = kategori.length;
    try {
      await tambahKategori({ nama, c });
      setKatBaru("");
      await muat();
    } catch {
      alert("Gagal menambah kategori. Cek internet, lalu coba lagi.");
    }
  };

  const hapusKat = async (nama) => {
    if (kategori.length <= 1) {
      alert("Minimal harus ada satu kategori.");
      return;
    }
    const dipakai = rows.filter((r) => r.kat === nama).length;
    const info = dipakai ? `\n${dipakai} transaksi lama tetap tersimpan dengan kategori ini.` : "";
    if (!confirm(`Hapus kategori ${nama}?${info}`)) return;
    const sisa = kategori.filter((k) => k.nama !== nama);
    try {
      await hapusKategori(nama);
      await muat();
    } catch {
      alert("Gagal menghapus kategori. Cek internet, lalu coba lagi.");
      return;
    }
    if (form.kat === nama) setForm({ ...form, kat: sisa[0].nama });
    if (fk === nama) setFk("");
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const jumlah = (Number(form.qty) || 0) * (Number(form.harga) || 0);

  const simpan = async () => {
    const qty = Number(form.qty);
    const harga = Number(form.harga);
    if (!form.tgl || !form.nama.trim() || !(qty > 0) || form.harga === "" || harga < 0) {
      alert("Lengkapi tanggal, nama barang, qty, dan harga.");
      return;
    }
    const data = { tgl: form.tgl, toko: form.toko.trim(), nama: form.nama.trim(), qty, harga, kat: form.kat };
    setSibuk(true);
    try {
      if (editId) {
        await ubahRow(editId, data);
        setEditId(null);
        setForm(emptyForm());
      } else {
        await tambahRow(data);
        setForm({ ...emptyForm(), tgl: form.tgl, kat: form.kat, toko: form.toko });
        setPage(1);
      }
      await muat();
    } catch {
      alert("Gagal menyimpan. Cek internet, lalu coba lagi.");
    }
    setSibuk(false);
  };

  const edit = (r) => {
    setEditId(r.id);
    setForm({ tgl: r.tgl, toko: r.toko || "", nama: r.nama, qty: r.qty, harga: r.harga, kat: r.kat });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const batal = () => {
    setEditId(null);
    setForm(emptyForm());
  };

  const hapus = async (id) => {
    if (!confirm("Hapus baris ini?")) return;
    try {
      await hapusRow(id);
      if (id === editId) batal();
      await muat();
    } catch {
      alert("Gagal menghapus. Cek internet, lalu coba lagi.");
    }
  };

  const reset = () => {
    setQ("");
    setFk("");
    setD1("");
    setD2("");
  };

  const list = useMemo(() => {
    const qq = q.toLowerCase();
    return rows
      .filter(
        (r) =>
          (!qq || r.nama.toLowerCase().includes(qq) || (r.toko || "").toLowerCase().includes(qq)) &&
          (!fk || r.kat === fk) &&
          (!d1 || r.tgl >= d1) &&
          (!d2 || r.tgl <= d2)
      )
      .sort((a, b) => b.tgl.localeCompare(a.tgl) || b.id - a.id);
  }, [rows, q, fk, d1, d2]);

  const total = list.reduce((s, r) => s + r.qty * r.harga, 0);

  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const cur = Math.min(page, totalPages);
  const pageRows = list.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  const ringkas = useMemo(() => {
    const m = new Map();
    for (const r of list) {
      const key = sumMode === "kat" ? r.kat : r.tgl.slice(0, 7);
      const c = m.get(key) || { total: 0, n: 0 };
      c.total += r.qty * r.harga;
      c.n += 1;
      m.set(key, c);
    }
    const arr = [...m.entries()].map(([k, v]) => ({ k, ...v }));
    arr.sort(sumMode === "kat" ? (a, b) => b.total - a.total : (a, b) => b.k.localeCompare(a.k));
    return arr;
  }, [list, sumMode]);

  const bulanList = useMemo(() => [...new Set(rows.map((r) => r.tgl.slice(0, 7)))].sort().reverse(), [rows]);
  const bln = bulanList.includes(exportBln) ? exportBln : "";

  const exportCsv = () => {
    const data = rows.filter((r) => !bln || r.tgl.startsWith(bln));
    if (!data.length) {
      alert("Tidak ada data untuk diexport.");
      return;
    }
    const txt = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const num = (n) => String(n).replace(".", ",");
    const head = ["Tanggal", "Nama Barang", "Nama Toko", "Qty", "Harga", "Jumlah", "Keterangan"].join(";");
    const body = [...data]
      .sort((a, b) => a.tgl.localeCompare(b.tgl) || a.id - b.id)
      .map((r) =>
        [r.tgl, txt(r.nama), txt(r.toko || ""), num(r.qty), num(r.harga), num(r.qty * r.harga), txt(r.kat)].join(";")
      );
    const jml = data.reduce((t, r) => t + r.qty * r.harga, 0);
    const foot = ["", txt("TOTAL"), "", "", "", num(jml), ""].join(";");
    const csv = "\uFEFF" + [head, ...body, foot].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = bln ? `pengeluaran-${bln}.csv` : `pengeluaran-semua-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tp">
      <div className="tp-in">
        <datalist id="daftar-toko">
          {tokoList.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>

        <div className="tp-head">
            <h1>Laporan Pengeluaran</h1>
            <button className="out" onClick={keluar}>Keluar</button>
        </div>

        <div className="tp-top">
          <div className="tp-card tp-form">
            {editId && <div className="f-edit">Sedang mengedit. Klik Simpan untuk menyimpan perubahan.</div>}
            <div className="f-tgl">
              <label>Tanggal</label>
              <input type="date" value={form.tgl} onChange={set("tgl")} />
            </div>
            <div className="f-toko">
              <label>Nama Toko</label>
              <input list="daftar-toko" value={form.toko} onChange={set("toko")} placeholder="mis. Toko Makmur" />
            </div>
            <div className="f-nama">
              <label>Nama Barang</label>
              <input value={form.nama} onChange={set("nama")} placeholder="mis. Beras 25kg" />
            </div>
            <div className="f-qty">
              <label>Qty</label>
              <input type="number" min="0" step="any" value={form.qty} onChange={set("qty")} />
            </div>
            <div className="f-harga">
              <label>Harga (Rp)</label>
              <input type="number" min="0" step="any" value={form.harga} onChange={set("harga")} />
            </div>
            <div className="f-jml">
              <label>Jumlah</label>
              <input value={rp(jumlah)} readOnly />
            </div>
            <div className="f-kat">
              <label>Kategori</label>
              <select value={form.kat} onChange={set("kat")}>
                {opsiForm.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="f-btn btn-row">
              <button onClick={simpan} disabled={sibuk}>
                {editId ? "Simpan" : "+ Tambah"}
              </button>
              {editId && (
                <button className="sec" onClick={batal}>
                  Batal
                </button>
              )}
            </div>
          </div>

          <div className="tp-card tp-filter">
            <div className="f-cari">
              <label>Cari</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama barang / toko..." />
            </div>
            <div className="f-fkat">
              <label>Kategori</label>
              <select value={fk} onChange={(e) => setFk(e.target.value)}>
                <option value="">Semua</option>
                {semuaKat.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Dari</label>
              <input type="date" value={d1} onChange={(e) => setD1(e.target.value)} />
            </div>
            <div>
              <label>Sampai</label>
              <input type="date" value={d2} onChange={(e) => setD2(e.target.value)} />
            </div>
            <div className="f-btn">
              <button className="sec" onClick={reset}>Reset</button>
            </div>
          </div>
        </div>

        <details className="tp-card tp-kat">
          <summary>
            <span>
              Kelola Kategori
              <small>Tambah atau hapus kategori</small>
            </span>
          </summary>
          <div className="tp-kat-list">
            {kategori.map((k) => (
              <span className="tp-tag tp-kchip" key={k.nama} style={gaya(k.c)}>
                {k.nama}
                <button className="x" onClick={() => hapusKat(k.nama)} aria-label={`Hapus kategori ${k.nama}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="tp-kat-add">
            <input
              value={katBaru}
              onChange={(e) => setKatBaru(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tambahKat()}
              placeholder="Nama kategori baru"
            />
            <button onClick={tambahKat}>+ Tambah</button>
          </div>
        </details>

        {list.length > 0 && (
          <div className="tp-card">
            <div className="tp-sumhead">
              <h2>Ringkasan</h2>
              <div className="tp-tabs">
                <button className={"tab" + (sumMode === "kat" ? " on" : "")} onClick={() => setSumMode("kat")}>
                  Per Kategori
                </button>
                <button className={"tab" + (sumMode === "bln" ? " on" : "")} onClick={() => setSumMode("bln")}>
                  Per Bulan
                </button>
              </div>
            </div>
            <div className="tp-sum">
              {ringkas.map((x) => (
                <div className="tp-chip" key={x.k} style={sumMode === "kat" ? gayaKat(x.k) : undefined}>
                  <span>{sumMode === "kat" ? x.k : labelBulan(x.k)}</span>
                  <b>{rp(x.total)}</b>
                  <small>{x.n} transaksi</small>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="tp-bar">
          <h2>Daftar Pengeluaran</h2>
        </div>

        <div className="tp-card tp-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nama Barang</th>
                <th>Nama Toko</th>
                <th className="n">Qty</th>
                <th className="n">Harga</th>
                <th className="n">Jumlah</th>
                <th>Keterangan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="tp-empty">{loading ? "Memuat data..." : "Belum ada data."}</td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className={r.id === editId ? "editing" : ""}>
                    <td data-label="Tanggal">{fmtTgl(r.tgl)}</td>
                    <td data-label="Nama Barang">{r.nama}</td>
                    <td data-label="Nama Toko">{r.toko || "-"}</td>
                    <td data-label="Qty" className="n">{r.qty}</td>
                    <td data-label="Harga" className="n">{rp(r.harga)}</td>
                    <td data-label="Jumlah" className="n">{rp(r.qty * r.harga)}</td>
                    <td data-label="Keterangan"><span className="tp-tag" style={gayaKat(r.kat)}>{r.kat}</span></td>
                    <td className="tp-act">
                      <button className="edit" onClick={() => edit(r)}>Edit</button>
                      <button className="del" onClick={() => hapus(r.id)}>Hapus</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="tp-pager">
          <button className="sec pg" onClick={() => setPage(cur - 1)} disabled={cur <= 1}>
            Sebelumnya
          </button>
          <span>Halaman {cur} dari {totalPages}</span>
          <button className="sec pg" onClick={() => setPage(cur + 1)} disabled={cur >= totalPages}>
            Berikutnya
          </button>
        </div>

        <div className="tp-card tp-total">
          <span>{list.length} transaksi</span>
          <span>Total: {rp(total)}</span>
        </div>

        <div className="tp-card tp-export">
          <div>
            <b>Unduh Laporan</b>
            <small>Simpan data pengeluaran sebagai file Excel, per bulan atau semua.</small>
          </div>
          <div className="tp-exp">
            <select value={bln} onChange={(e) => setExportBln(e.target.value)} aria-label="Pilih bulan untuk export">
              <option value="">Semua bulan</option>
              {bulanList.map((k) => (
                <option key={k} value={k}>{labelBulan(k)}</option>
              ))}
            </select>
            <button className="exp" onClick={exportCsv}>Unduh Excel</button>
          </div>
        </div>
      </div>
    </div>
  );
}