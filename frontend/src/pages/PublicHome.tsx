// Δημόσια αρχική σελίδα για επισκέπτες χωρίς login.
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import connectedWorldIllustration from "../assets/undraw_connected-world_anke.svg";

export default function PublicHome() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const actions = [
    { to: "/map", label: t("home.map"), className: "public-home-action primary" },
    { to: "/statistics", label: t("home.stats"), className: "public-home-action secondary" },
  ];

  useEffect(() => {
    document.body.classList.add("public-home-scroll-lock");
    return () => document.body.classList.remove("public-home-scroll-lock");
  }, []);

  return (
    <div className="public-home-shell">
      <div className="public-home-card">
        <div className="public-home-content">
          <div className="public-home-copy">
            <h1 className="public-home-title">{t("home.heroTitle")}</h1>

            <p className="public-home-text">{t("home.heroLead")}</p>

            <p className="public-home-text public-home-text-spaced">{t("home.heroSublead")}</p>

            <div className="public-home-actions">
              {actions.map((action) => (
                <button
                  key={action.to}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className={action.className}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="public-home-visual" aria-hidden="true">
            <img src={connectedWorldIllustration} alt="" className="public-home-illustration" />
          </div>
        </div>
      </div>
    </div>
  );
}
