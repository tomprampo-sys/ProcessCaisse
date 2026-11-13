import { useEffect, useState } from "react";
import { estDateIso } from "../domain/calendrier";

export type Route =
  | { ecran: "accueil" }
  | { ecran: "comptage"; date: string; reinit: boolean }
  | { ecran: "historique" }
  | { ecran: "reglages" };

function lire(hash: string): Route {
  const [, ecran, date, option] = hash.replace(/^#/, "").split("/");
  if (ecran === "comptage" && date && estDateIso(date)) return { ecran, date, reinit: option === "reinit" };
  if (ecran === "historique" || ecran === "reglages") return { ecran };
  return { ecran: "accueil" };
}

export function naviguer(chemin: string): void {
  window.location.hash = chemin;
  window.scrollTo(0, 0);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => lire(window.location.hash));
  useEffect(() => {
    const maj = () => setRoute(lire(window.location.hash));
    window.addEventListener("hashchange", maj);
    return () => window.removeEventListener("hashchange", maj);
  }, []);
  return route;
}
