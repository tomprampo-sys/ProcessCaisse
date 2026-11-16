import { useEffect, useState } from "react";

/** Événement Chrome / Edge / Android qui permet de proposer l'installation. Absent de Safari. */
interface EvenementInstallation extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let evenement: EvenementInstallation | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

// Écouté dès le chargement du module : le navigateur n'émet l'événement qu'une fois.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evenement = e as EvenementInstallation;
    prevenir();
  });
  window.addEventListener("appinstalled", () => {
    evenement = null;
    prevenir();
  });
}

export function estInstallee(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Safari (iPad, iPhone, Mac) n'a pas de bouton d'installation : il faut passer par le menu Partager. */
export function estSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|Android/.test(ua);
}

export function useInstallation(): { installee: boolean; proposable: boolean; safari: boolean; installer(): Promise<void> } {
  const [, rafraichir] = useState(0);
  useEffect(() => {
    const maj = () => rafraichir((n) => n + 1);
    abonnes.add(maj);
    return () => {
      abonnes.delete(maj);
    };
  }, []);

  return {
    installee: estInstallee(),
    proposable: evenement != null,
    safari: estSafari(),
    async installer() {
      if (!evenement) return;
      await evenement.prompt();
      await evenement.userChoice;
      evenement = null;
      prevenir();
    },
  };
}
