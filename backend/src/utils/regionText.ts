// Καθαρίζει ονόματα περιοχών για σταθερό matching σε ελληνικά/λατινικά.
export function normalizeRegionText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Καθαρίζει απλό κείμενο περιοχής για εμφάνιση/σύγκριση.
export function cleanRegionText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
