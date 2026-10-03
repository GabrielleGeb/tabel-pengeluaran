import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const cek = ({ data, error }) => {
    if (error) throw error;
    return data;
};

export const ambilRows = async () => {
    const hasil = [];
    for (let dari = 0; ; dari += 1000) {
        const data = cek(await supabase.from("pengeluaran").select("*").order("id").range(dari, dari + 999));
        hasil.push(...data);
        if (data.length < 1000) break;
    }
    return hasil.map((r) => ({
        id: r.id,
        tgl: r.tgl,
        toko: r.toko,
        nama: r.nama,
        qty: Number(r.qty),
        harga: Number(r.harga),
        kat: r.kat,
    }));
};

export const ambilKategori = async () => cek(await supabase.from("kategori").select("nama,c").order("urut"));

export const tambahRow = async (d) => cek(await supabase.from("pengeluaran").insert(d));
export const ubahRow = async (id, d) => cek(await supabase.from("pengeluaran").update(d).eq("id", id));
export const hapusRow = async (id) => cek(await supabase.from("pengeluaran").delete().eq("id", id));
export const tambahKategori = async (k) => cek(await supabase.from("kategori").insert(k));
export const hapusKategori = async (nama) => cek(await supabase.from("kategori").delete().eq("nama", nama));

export const langgananData = (onChange) => {
    const ch = supabase
        .channel("perubahan-data")
        .on("postgres_changes", { event: "*", schema: "public", table: "pengeluaran" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "kategori" }, onChange)
        .subscribe();
    return () => supabase.removeChannel(ch);
};

export const masuk = async (email, password) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const keluar = () => supabase.auth.signOut();

export const ambilSesi = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const pantauSesi = (onChange) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => onChange(session));
  return () => data.subscription.unsubscribe();
};