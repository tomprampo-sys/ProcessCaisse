import { useState } from "react";
import { aujourdHui } from "./domain/calendrier";
import { useRoute } from "./ui/navigation";
import { Accueil } from "./ui/screens/Accueil";
import { Comptage } from "./ui/screens/Comptage";
import { Historique } from "./ui/screens/Historique";
import { Reglages } from "./ui/screens/Reglages";
import { StoreProvider } from "./ui/store";

function Ecrans() {
  const route = useRoute();
  const [date, setDate] = useState(aujourdHui);
  switch (route.ecran) {
    case "comptage":
      return <Comptage key={route.date} date={route.date} ouvrirReinit={route.reinit} />;
    case "historique":
      return <Historique />;
    case "reglages":
      return <Reglages />;
    default:
      return <Accueil date={date} setDate={setDate} />;
  }
}

export default function App() {
  return (
    <StoreProvider>
      <Ecrans />
    </StoreProvider>
  );
}
