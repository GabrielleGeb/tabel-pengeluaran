import { useState } from "react";
import { masuk } from "./db";
import "./TabelPengeluaran.css";

export default function login() {
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const kirim = async (e) => {
    e.preventDefault();
    setSibuk(true);
    setGalat("");
    try {
      await masuk(email.trim(), sandi);
    } catch {
      setGalat("Tidak bisa masuk. Cek email dan kata sandi, lalu coba lagi.");
    }
    setSibuk(false);
  };

  return (
    <div className="tp">
      <div className="tp-in tp-login">
        <h1>Laporan Pengeluaran</h1>
        {galat && <div className="tp-err">{galat}</div>}
        <form className="tp-card" onSubmit={kirim}>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label>Kata sandi</label>
            <input type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="current-password" required />
          </div>
          <button type="submit" disabled={sibuk}>{sibuk ? "Memeriksa..." : "Masuk"}</button>
        </form>
      </div>
    </div>
  );
}