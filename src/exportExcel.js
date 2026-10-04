// "#,##0" ditampilkan Excel sesuai pengaturan regional komputer:
// di Windows/Mac berbahasa Indonesia hasilnya 15.000 (titik pemisah ribuan).
const FORMAT_RIBUAN = "#,##0";
const FORMAT_TGL = "dd/mm/yyyy";

const LEBAR_KOLOM = [{ width: 12 }, { width: 32 }, { width: 22 }, { width: 8 }, { width: 14 }, { width: 16 }, { width: 20 }];
const HEADER = ["Tanggal", "Nama Barang", "Nama Toko", "Qty", "Harga", "Jumlah", "Keterangan"];

// "2026-10-03" -> Date UTC tengah malam, supaya jadi tanggal utuh di Excel (tanpa geser zona waktu)
const keTanggal = (t) => {
  const [y, m, d] = t.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const urutkan = (data) => [...data].sort((a, b) => a.tgl.localeCompare(b.tgl) || a.id - b.id);

const dataSheet = (data) => {
  const header = HEADER.map((value) => ({ value, fontWeight: "bold", backgroundColor: "#e8eef9" }));
  const isi = urutkan(data).map((r) => [
    { value: keTanggal(r.tgl), type: Date, format: FORMAT_TGL, align: "left" },
    r.nama,
    r.toko || null,
    r.qty,
    { value: r.harga, type: Number, format: FORMAT_RIBUAN },
    { value: r.qty * r.harga, type: Number, format: FORMAT_RIBUAN },
    r.kat,
  ]);
  const jumlah = data.reduce((t, r) => t + r.qty * r.harga, 0);
  const total = [
    null,
    { value: "TOTAL", fontWeight: "bold" },
    null,
    null,
    null,
    { value: jumlah, type: Number, format: FORMAT_RIBUAN, fontWeight: "bold" },
    null,
  ];
  return [header, ...isi, total];
};

// Nama sheet Excel: maks 31 karakter, tanpa \ / ? * [ ] :, dan tidak boleh kembar
const namaSheet = (nama, terpakai) => {
  const dasar = nama.replace(/[\\/?*[\]:]/g, "-").trim().slice(0, 31) || "Sheet";
  let hasil = dasar;
  for (let i = 2; terpakai.has(hasil.toLowerCase()); i++) {
    const akhiran = ` (${i})`;
    hasil = dasar.slice(0, 31 - akhiran.length) + akhiran;
  }
  terpakai.add(hasil.toLowerCase());
  return hasil;
};

const sheet = (nama, data) => ({
  sheet: nama,
  data: dataSheet(data),
  columns: LEBAR_KOLOM,
  stickyRowsCount: 1,
});

// kat diisi  -> satu sheet berisi kategori itu saja
// kat kosong -> sheet "Semua" + satu sheet per kategori yang punya transaksi
export const buatSheets = (data, { kat = "", urutKat = [] } = {}) => {
  const terpakai = new Set();
  if (kat) return [sheet(namaSheet(kat, terpakai), data)];

  const hasil = [sheet(namaSheet("Semua", terpakai), data)];
  const ada = new Set(data.map((r) => r.kat));
  const daftar = [...urutKat.filter((k) => ada.has(k)), ...[...ada].filter((k) => !urutKat.includes(k))];
  for (const k of daftar) {
    hasil.push(sheet(namaSheet(k, terpakai), data.filter((r) => r.kat === k)));
  }
  return hasil;
};

// Library dimuat saat dibutuhkan saja, supaya halaman utama tetap ringan
export const buatBlob = async (data, opsi) => {
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  return writeExcelFile(buatSheets(data, opsi)).toBlob();
};

export const unduhExcel = async (data, opsi, namaFile) => {
  const blob = await buatBlob(data, opsi);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  a.click();
  URL.revokeObjectURL(url);
};