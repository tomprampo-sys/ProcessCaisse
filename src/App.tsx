import { useState } from "react";
import { aujourdHui } from "./domain/calendrier";
import { useRoute } from "./ui/navigation";
import { lirePreference } from "./ui/preferences";
import { Accueil } from "./ui/screens/Accueil";
import { Bienvenue } from "./ui/screens/Bienvenue";
import { Comptage } from "./ui/screens/Comptage";
import { Historique } from "./ui/screens/Historique";
import { Reglages } from "./ui/screens/Reglages";
import { StoreProvider, useStore } from "./ui/store";

function Ecrans() {
  const route = useRoute();
  const { comptages } = useStore();
  const [date, setDate] = useState(aujourdHui);
  const [bienvenueVue, setBienvenueVue] = useState(() => lirePreference("bienvenueVue") != null);

  // Appareil neuf : aucun comptage et écran d'accueil jamais vu.
  if (!bienvenueVue && comptages.length === 0) return <Bienvenue onTermine={() => setBienvenueVue(true)} />;

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
