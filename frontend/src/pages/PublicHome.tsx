import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/auth";

export default function PublicHome() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = getUser();

  return (
    <div className="page" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>{t("home.title", { defaultValue: "Καλώς ήρθατε" })}</h2>
        <p style={{ marginTop: 6, opacity: 0.9 }}>
          {t("home.subtitle", {
            defaultValue: "Επιλέξτε τι θέλετε να δείτε. Τα δεδομένα είναι ανώνυμα/συγκεντρωτικά.",
          })}
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <button className="btn" onClick={() => nav("/map")}> 
            {t("home.map", { defaultValue: "Δείτε Χάρτη" })}
          </button>
          <button className="btn" onClick={() => nav("/statistics")}> 
            {t("home.stats", { defaultValue: "Δείτε Στατιστικά" })}
          </button>
          {!user && (
            <button className="secondary" onClick={() => nav("/login")}>
              {t("nav.login", { defaultValue: "Σύνδεση" })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
