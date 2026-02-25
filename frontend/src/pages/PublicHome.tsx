import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/auth";

export default function PublicHome() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = getUser();

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("home.title", { defaultValue: "Καλώς ήρθατε" })}</h2>
        <div className="spacer" />
        {!user && (
          <button className="btn" type="button" onClick={() => nav("/login")}>
            {t("nav.login", { defaultValue: "Σύνδεση" })}
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <p style={{ marginTop: 0, opacity: 0.9, maxWidth: 720 }}>
          {t("home.subtitle", {
            defaultValue: "Επιλέξτε τι θέλετε να δείτε. Τα δεδομένα είναι ανώνυμα/συγκεντρωτικά.",
          })}
        </p>

        <div className="topbar" style={{ marginTop: 14 }}>
          <button className="btn primary" type="button" onClick={() => nav("/map")}>
            {t("home.map", { defaultValue: "Δείτε Χάρτη" })}
          </button>
          <button className="btn" type="button" onClick={() => nav("/statistics")}>
            {t("home.stats", { defaultValue: "Δείτε Στατιστικά" })}
          </button>
        </div>
      </div>
    </div>
  );
}
