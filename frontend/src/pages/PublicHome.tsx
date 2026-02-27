import React from "react";
import { useNavigate } from "react-router-dom";

export default function PublicHome() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "calc(100vh - 70px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.2rem 1.5rem",
        background: "linear-gradient(180deg, #eef4ff 0%, #ffffff 65%)",
        // leave space for the pinned footer on this static page
        paddingBottom: "4rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e5edff",
          boxShadow: "0 20px 40px rgba(37,99,235,0.08)",
          padding: "2.6rem 3rem",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "2.6rem",
            fontWeight: 900,
            color: "#1e3a8a",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          ALUPLA | Πλατφόρμα Στατιστικών Αποφοίτων
        </h1>

        <div style={{ height: 18 }} />

        <p style={{ margin: 0, fontSize: "1.06rem", lineHeight: 1.75, color: "#475569" }}>
          Η ALUPLA αποτελεί μια διαδικτυακή πλατφόρμα προβολής και ανάλυσης ανώνυμων
          στατιστικών δεδομένων αποφοίτων για το τμήμα Μηχανικών Ηλεκτρονικών και
          Πληροφορικής του Πανεπιστημίου Πατρών.
        </p>

        <div style={{ height: 16 }} />

        <p style={{ margin: 0, fontSize: "1.06rem", lineHeight: 1.75, color: "#475569" }}>
          Μέσω διαδραστικών διαγραμμάτων και χάρτη Ελλάδας, οι επισκέπτες μπορούν να
          εξερευνήσουν μεταβολές στον χρόνο, αναλογίες και κατανομές, καθώς και να
          εξάγουν ανωνυμοποιημένα δεδομένα.
        </p>

        <div style={{ height: 26 }} />

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/map")}
            style={{
              padding: "0.95rem 1.7rem",
              borderRadius: 12,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 800,
              fontSize: "1.05rem",
              cursor: "pointer",
              boxShadow: "0 10px 22px rgba(37,99,235,0.22)",
            }}
          >
            Χάρτης Αποφοίτων
          </button>

          <button
            onClick={() => navigate("/statistics")}
            style={{
              padding: "0.95rem 1.7rem",
              borderRadius: 12,
              border: "1px solid #93c5fd",
              background: "#f0f6ff",
              color: "#1e3a8a",
              fontWeight: 800,
              fontSize: "1.05rem",
              cursor: "pointer",
            }}
          >
            Στατιστικά & Διαγράμματα
          </button>

          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "0.95rem 1.7rem",
              borderRadius: 12,
              border: "1px solid #dbeafe",
              background: "#ffffff",
              color: "#1e3a8a",
              fontWeight: 800,
              fontSize: "1.05rem",
              cursor: "pointer",
            }}
          >
            Σύνδεση
          </button>
        </div>
      </div>
    </div>
  );
}
