import React from "react";
import { useNavigate } from "react-router-dom";

const ACTIONS = [
  { to: "/map", label: "Χάρτης Αποφοίτων", className: "public-home-action primary" },
  { to: "/statistics", label: "Στατιστικά & Διαγράμματα", className: "public-home-action secondary" },
  { to: "/login", label: "Σύνδεση", className: "public-home-action ghost" },
];

export default function PublicHome() {
  const navigate = useNavigate();

  return (
    <div className="public-home-shell">
      <div className="public-home-card">
        <h1 className="public-home-title">ALUPLA | Πλατφόρμα Στατιστικών Αποφοίτων</h1>

        <p className="public-home-text">
          Η ALUPLA αποτελεί μια διαδικτυακή πλατφόρμα προβολής και ανάλυσης ανώνυμων
          στατιστικών δεδομένων αποφοίτων για το τμήμα Μηχανικών Ηλεκτρονικών και
          Πληροφορικής του Πανεπιστημίου Πατρών.
        </p>

        <p className="public-home-text public-home-text-spaced">
          Μέσω διαδραστικών διαγραμμάτων και χάρτη Ελλάδας, οι επισκέπτες μπορούν να
          εξερευνήσουν μεταβολές στον χρόνο, αναλογίες και κατανομές, καθώς και να
          εξάγουν ανωνυμοποιημένα δεδομένα.
        </p>

        <div className="public-home-actions">
          {ACTIONS.map((action) => (
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
