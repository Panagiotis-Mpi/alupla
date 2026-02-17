import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listRegions, type Region } from "../lib/api";

export default function Regions() {
  const { t } = useTranslation("regions");

  const [parentId, setParentId] = useState<number | null>(null);
  const [items, setItems] = useState<Region[]>([]);
  const [stack, setStack] = useState<Array<{ id: number | null; label: string }>>([{ id: null, label: "" }]);

  async function load(pid: number | null) {
    const r = await listRegions(pid);
    setItems(r.items);
  }

  useEffect(() => {
    void load(parentId);
  }, [parentId]);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("title")}</h2>
        <div className="spacer" />
        <span className="badge">
          {t("parentId")}: {parentId ?? t("null")}
        </span>
      </div>

      <div className="card">
        <div className="muted">{t("breadcrumb")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {stack.map((s, idx) => (
            <button
              key={idx}
              className="btn"
              onClick={() => {
                setParentId(s.id);
                setStack(stack.slice(0, idx + 1));
              }}
            >
              {s.id === null ? t("root") : s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t("table.id")}</th>
              <th>{t("table.type")}</th>
              <th>{t("table.name")}</th>
              <th>{t("table.go")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.type}</td>
                <td>{r.name}</td>
                <td>
                  <button
                    className="btn"
                    onClick={() => {
                      setParentId(r.id);
                      setStack([...stack, { id: r.id, label: r.name }]);
                    }}
                  >
                    {t("children")}
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={4} className="muted">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
