import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function PublicHome() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const actions = [
    { to: "/map", label: t("home.map"), className: "public-home-action primary" },
    { to: "/statistics", label: t("home.stats"), className: "public-home-action secondary" },
    { to: "/login", label: t("nav.login"), className: "public-home-action ghost" },
  ];

  return (
    <div className="public-home-shell">
      <div className="public-home-card">
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
    </div>
  );
}
