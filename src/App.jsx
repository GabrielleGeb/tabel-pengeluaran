import { useEffect, useState } from "react";
import TabelPengeluaran from "./TabelPengeluaran";
import Login from "./login";
import { ambilSesi, pantauSesi } from "./db";

export default function App() {
  const [sesi, setSesi] = useState(undefined);

  useEffect(() => {
    ambilSesi().then(setSesi);
    return pantauSesi(setSesi);
  }, []);

  if (sesi === undefined) return null;
  return sesi ? <TabelPengeluaran /> : <Login />;
}