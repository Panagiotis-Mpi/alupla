
import React from "react";
import { useNavigate } from "react-router-dom";

export default function PublicHome() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div
      style={{
        height: "calc(100vh - 70px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #eef4ff 0%, #ffffff 70%)",
        padding: "1rem 1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          background: "white",
          borderRadius: "20px",
          border: "1px solid #e5edff",
          boxShadow: "0 20px 40px rgba(37,99,235,0.08)",
          padding: "2.5rem 3rem",
        }}
      >
        <h1
          style={{
            fontSize: "2.4rem",
            fontWeight: 800,
            color: "#1e3a8a",
            marginBottom: "1.2rem",
            lineHeight: "1.2",
          }}
        >
          ALUPLA | Πλατφόρμα Στατιστικών Αποφοίτων
        </h1>

        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: "1.7",
            color: "#475569",
            marginBottom: "1.2rem",
          }}
        >
          Η ALUPLA αποτελεί μια διαδικτυακή πλατφόρμα προβολής και ανάλυσης
          ανώνυμων στατιστικών δεδομένων αποφοίτων για το τμήμα Μηχανικών
          Ηλεκτρονικών και Πληροφορικής του Πανεπιστημίου Πατρών.
        </p>

        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: "1.7",
            color: "#475569",
            marginBottom: "2rem",
          }}
        >
          Μέσω διαδραστικών διαγραμμάτων και χάρτη Ελλάδας, οι επισκέπτες
          μπορούν να εξερευνήσουν μεταβολές στον χρόνο, αναλογίες και
          κατανομές, καθώς και να εξάγουν ανωνυμοποιημένα δεδομένα.
        </p>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/map")}
            style={{
              fontSize: "1.05rem",
              padding: "0.9rem 1.6rem",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 10px 20px rgba(37,99,235,0.25)",
            }}
          >
            Χάρτης Αποφοίτων
          </button>

          <button
            onClick={() => navigate("/statistics")}
            style={{
              fontSize: "1.05rem",
              padding: "0.9rem 1.6rem",
              borderRadius: "12px",
              border: "1px solid #2563eb",
              backgroundColor: "#f0f6ff",
              color: "#1e3a8a",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Στατιστικά & Διαγράμματα
          </button>

          <button
            onClick={() => navigate("/login")}
            style={{
              fontSize: "1.05rem",
              padding: "0.9rem 1.6rem",
              borderRadius: "12px",
              border: "1px solid #dbeafe",
              backgroundColor: "#ffffff",
              color: "#1e3a8a",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Σύνδεση
          </button>
        </div>
      </div>
    </div>
  );
}
