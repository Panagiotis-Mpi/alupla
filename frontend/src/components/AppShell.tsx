import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import type { SessionUser } from "../lib/auth";
import Icon from "./Icon";
import aluplaLogo from "../assets/logo_black.svg";
import chartColumnIcon from "../assets/icons/chart-column-big.svg";
import globeIcon from "../assets/icons/globe.svg";
import graduationCapIcon from "../assets/icons/graduation-cap.svg";
import graduatePeopleIcon from "../assets/icons/graduate-people.svg";
import historyIcon from "../assets/icons/history.svg";
import usersIcon from "../assets/icons/users.svg";
import languagesIcon from "../assets/icons/languages.svg";
import logInIcon from "../assets/icons/log-in.svg";
import logOutIcon from "../assets/icons/log-out.svg";
import userPenIcon from "../assets/icons/user-pen.svg";
import xIcon from "../assets/icons/x.svg";

type ShellLink = {
  to: string;
  label: string;
  icon: string;
};

type ShellGroup = {
  label: string;
  links: ShellLink[];
};

type PublicHeaderProps = {
  user: SessionUser | null;
  onLogout: () => void;
};

type AuthenticatedShellProps = {
  user: SessionUser;
  onLogout: () => void;
  children: React.ReactNode;
};

function useLanguageMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const lang: "gr" | "en" = i18n.language?.startsWith("en") ? "en" : "gr";

  React.useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const changeLanguage = React.useCallback((language: "gr" | "en") => {
    void i18n.changeLanguage(language);
    setOpen(false);
  }, []);

  return { open, setOpen, ref, lang, changeLanguage };
}

function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { open, setOpen, ref, lang, changeLanguage } = useLanguageMenu();
  const current = lang === "en" ? "EN" : "ΕΛ";
  const alternate = lang === "en" ? "ΕΛ" : "EN";
  const alternateLanguage = lang === "en" ? "gr" : "en";

  return (
    <div className={`shell-language-menu${compact ? " is-compact" : ""}`} ref={ref}>
      <button
        type="button"
        className="shell-language-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={lang === "en" ? t("aria.languageEnglish") : t("aria.languageGreek")}
      >
        <Icon src={languagesIcon} size={18} />
        <span>{current}</span>
        <span className="shell-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="shell-language-popover">
          <button type="button" onClick={() => changeLanguage(alternateLanguage)}>
            {alternate}
          </button>
        </div>
      )}
    </div>
  );
}

function routeIsActive(pathname: string, route: string) {
  if (route === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(route);
}

function PublicHeader({ user, onLogout }: PublicHeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const accountRef = React.useRef<HTMLDivElement | null>(null);
  const lang: "gr" | "en" = i18n.language?.startsWith("en") ? "en" : "gr";
  const links: ShellLink[] = [
    { to: "/", label: t("nav.homepage"), icon: aluplaLogo },
    { to: "/map", label: t("nav.map"), icon: globeIcon },
    { to: "/statistics", label: t("nav.statistics"), icon: chartColumnIcon },
  ];

  React.useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  React.useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    document.body.classList.add("shell-drawer-open");
    document.addEventListener("keydown", close);
    return () => {
      document.body.classList.remove("shell-drawer-open");
      document.removeEventListener("keydown", close);
    };
  }, [drawerOpen]);

  return (
    <header className="public-shell-header">
      <div className="public-shell-header-inner">
        <Link className="shell-brand" to={user ? "/graduates" : "/"} aria-label={t("aria.brandHome")}>
          <img src={aluplaLogo} alt="" aria-hidden="true" />
          <span>ALUPLA</span>
        </Link>

        <nav className="public-shell-links" aria-label={t("nav.primary", { defaultValue: lang === "en" ? "Primary navigation" : "Κύρια πλοήγηση" })}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`shell-nav-link${routeIsActive(location.pathname, link.to) ? " is-active" : ""}`}
            >
              <Icon src={link.icon} size={18} />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="public-shell-actions">
          <LanguageMenu />
          {user ? (
            <div className="shell-account-menu" ref={accountRef}>
              <button type="button" className="shell-account-button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen}>
                <span>{user.first_name}</span>
                <span className="shell-chevron" aria-hidden="true" />
              </button>
              {accountOpen && (
                <div className="shell-account-popover">
                  <button type="button" onClick={() => navigate("/graduates")}>
                    <Icon src={graduatePeopleIcon} size={18} />
                    <span>{t("nav.openWorkspace", { defaultValue: lang === "en" ? "Open workspace" : "Άνοιγμα πλατφόρμας" })}</span>
                  </button>
                  <button type="button" onClick={() => navigate("/profile")}>
                    <Icon src={userPenIcon} size={18} />
                    <span>{t("nav.myProfile")}</span>
                  </button>
                  <button type="button" className="is-danger" onClick={onLogout}>
                    <Icon src={logOutIcon} size={18} />
                    <span>{t("nav.logout")}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="shell-login-button" to="/login">
              <Icon src={logInIcon} size={18} />
              <span>{t("nav.login")}</span>
            </Link>
          )}
          <button
            type="button"
            className="shell-menu-button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("aria.brandMenu")}
            aria-expanded={drawerOpen}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div className="shell-overlay is-visible" onClick={() => setDrawerOpen(false)} />
          <aside className="public-shell-drawer is-open">
            <div className="shell-drawer-header">
              <span>{t("nav.menu", { defaultValue: lang === "en" ? "Menu" : "Μενού" })}</span>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label={t("aria.closeMenu")}>
                <Icon src={xIcon} size={20} />
              </button>
            </div>
            <nav className="shell-drawer-links">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`shell-nav-link${routeIsActive(location.pathname, link.to) ? " is-active" : ""}`}
                >
                  <Icon src={link.icon} size={19} />
                  <span>{link.label}</span>
                </Link>
              ))}
              {user ? (
                <>
                  <Link className="shell-nav-link" to="/graduates">
                    <Icon src={graduatePeopleIcon} size={19} />
                    <span>{t("nav.openWorkspace", { defaultValue: lang === "en" ? "Open workspace" : "Άνοιγμα πλατφόρμας" })}</span>
                  </Link>
                  <Link className="shell-nav-link" to="/profile">
                    <Icon src={userPenIcon} size={19} />
                    <span>{t("nav.myProfile")}</span>
                  </Link>
                  <button type="button" className="shell-nav-link is-danger" onClick={onLogout}>
                    <Icon src={logOutIcon} size={19} />
                    <span>{t("nav.logout")}</span>
                  </button>
                </>
              ) : (
                <Link className="shell-nav-link" to="/login">
                  <Icon src={logInIcon} size={19} />
                  <span>{t("nav.login")}</span>
                </Link>
              )}
            </nav>
          </aside>
        </>
      )}
    </header>
  );
}

function AuthenticatedShell({ user, onLogout, children }: AuthenticatedShellProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const lang: "gr" | "en" = i18n.language?.startsWith("en") ? "en" : "gr";

  const groups = React.useMemo<ShellGroup[]>(() => {
    const result: ShellGroup[] = [
      {
        label: t("nav.data", { defaultValue: lang === "en" ? "Data" : "Δεδομένα" }),
        links: [
          { to: "/graduates", label: t("nav.graduates"), icon: graduatePeopleIcon },
          { to: "/academic-data", label: t("nav.academicPrograms"), icon: graduationCapIcon },
        ],
      },
      {
        label: t("nav.analysis", { defaultValue: lang === "en" ? "Analysis" : "Ανάλυση" }),
        links: [
          { to: "/statistics", label: t("nav.statistics"), icon: chartColumnIcon },
          { to: "/map", label: t("nav.map"), icon: globeIcon },
        ],
      },
    ];

    if (user.role === "super_admin") {
      result.push({
        label: t("nav.management", { defaultValue: lang === "en" ? "Management" : "Διαχείριση" }),
        links: [
          { to: "/users", label: t("nav.users"), icon: usersIcon },
          { to: "/logs", label: t("nav.logs"), icon: historyIcon },
        ],
      });
    }

    return result;
  }, [lang, t, user.role]);

  const currentLabel = React.useMemo(() => {
    if (location.pathname.startsWith("/profile")) {
      return t("nav.myProfile");
    }
    for (const group of groups) {
      const match = group.links.find((link) => routeIsActive(location.pathname, link.to));
      if (match) {
        return match.label;
      }
    }
    return t("nav.graduates");
  }, [groups, location.pathname, t]);

  const roleLabel = t(`profile:roles.${user.role}`);

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    document.body.classList.add("shell-drawer-open");
    document.addEventListener("keydown", close);
    return () => {
      document.body.classList.remove("shell-drawer-open");
      document.removeEventListener("keydown", close);
    };
  }, [drawerOpen]);

  const sidebar = (
    <>
      <div className="private-sidebar-brand-row">
        <Link className="private-sidebar-brand" to="/graduates" aria-label={t("aria.brandHome")}>
          <img src={aluplaLogo} alt="" aria-hidden="true" />
          <span>
            <strong>ALUPLA</strong>
            <small>{t("nav.workspace", { defaultValue: lang === "en" ? "Graduate platform" : "Πλατφόρμα αποφοίτων" })}</small>
          </span>
        </Link>
        <button type="button" className="private-sidebar-close" onClick={() => setDrawerOpen(false)} aria-label={t("aria.closeMenu")}>
          <Icon src={xIcon} size={20} />
        </button>
      </div>

      <nav className="private-sidebar-nav" aria-label={t("nav.primary", { defaultValue: lang === "en" ? "Primary navigation" : "Κύρια πλοήγηση" })}>
        {groups.map((group) => (
          <div className="private-sidebar-group" key={group.label}>
            <div className="private-sidebar-group-label">{group.label}</div>
            <div className="private-sidebar-group-links">
              {group.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`private-sidebar-link${routeIsActive(location.pathname, link.to) ? " is-active" : ""}`}
                >
                  <span className="private-sidebar-link-icon"><Icon src={link.icon} size={19} /></span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="private-sidebar-account">
        <div className="private-sidebar-user">
          <div className="private-sidebar-avatar" aria-hidden="true">
            {user.first_name.trim().charAt(0).toUpperCase()}{user.last_name.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{user.first_name} {user.last_name}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
        <div className="private-sidebar-account-actions">
          <button type="button" onClick={() => navigate("/profile")} className={location.pathname.startsWith("/profile") ? "is-active" : ""}>
            <Icon src={userPenIcon} size={18} />
            <span>{t("nav.myProfile")}</span>
          </button>
          <button type="button" className="is-danger" onClick={onLogout}>
            <Icon src={logOutIcon} size={18} />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="private-shell">
      <aside className="private-sidebar">{sidebar}</aside>
      {drawerOpen && (
        <>
          <div className="shell-overlay is-visible" onClick={() => setDrawerOpen(false)} />
          <aside className="private-sidebar-drawer is-open">{sidebar}</aside>
        </>
      )}
      <div className="private-shell-body">
        <header className="private-topbar">
          <div className="private-topbar-leading">
            <button type="button" className="private-topbar-menu" onClick={() => setDrawerOpen(true)} aria-label={t("aria.brandMenu")} aria-expanded={drawerOpen}>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            <div className="private-topbar-title">
              <span>{t("nav.workspaceLabel", { defaultValue: lang === "en" ? "Workspace" : "Χώρος εργασίας" })}</span>
              <strong>{currentLabel}</strong>
            </div>
          </div>
          <LanguageMenu compact />
        </header>
        {children}
      </div>
    </div>
  );
}

export { AuthenticatedShell, PublicHeader };
