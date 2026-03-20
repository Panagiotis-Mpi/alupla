export type RegionCity = {
  region: string;
  nameEl: string;
  nameEn: string;
  lat: number;
  lng: number;
  population: number;
};

export const regionCities: RegionCity[] = [
  { region: "Ανατολική Μακεδονία και Θράκη", nameEl: "Αλεξανδρούπολη", nameEn: "Alexandroupoli", lat: 40.8457, lng: 25.8739, population: 57812 },
  { region: "Ανατολική Μακεδονία και Θράκη", nameEl: "Ξάνθη", nameEn: "Xanthi", lat: 41.1419, lng: 24.8877, population: 56000 },
  { region: "Ανατολική Μακεδονία και Θράκη", nameEl: "Καβάλα", nameEn: "Kavala", lat: 40.9396, lng: 24.4018, population: 54027 },
  { region: "Κεντρική Μακεδονία", nameEl: "Θεσσαλονίκη", nameEn: "Thessaloniki", lat: 40.6401, lng: 22.9444, population: 788952 },
  { region: "Κεντρική Μακεδονία", nameEl: "Σέρρες", nameEn: "Serres", lat: 41.0849, lng: 23.5476, population: 58787 },
  { region: "Κεντρική Μακεδονία", nameEl: "Κατερίνη", nameEn: "Katerini", lat: 40.2696, lng: 22.5061, population: 56576 },
  { region: "Δυτική Μακεδονία", nameEl: "Κοζάνη", nameEn: "Kozani", lat: 40.3006, lng: 21.7889, population: 41566 },
  { region: "Δυτική Μακεδονία", nameEl: "Πτολεμαΐδα", nameEn: "Ptolemaida", lat: 40.5147, lng: 21.6787, population: 32000 },
  { region: "Δυτική Μακεδονία", nameEl: "Καστοριά", nameEn: "Kastoria", lat: 40.5217, lng: 21.2636, population: 30179 },
  { region: "Ήπειρος", nameEl: "Ιωάννινα", nameEn: "Ioannina", lat: 39.665, lng: 20.8537, population: 65574 },
  { region: "Ήπειρος", nameEl: "Άρτα", nameEn: "Arta", lat: 39.1609, lng: 20.9856, population: 21895 },
  { region: "Ήπειρος", nameEl: "Πρέβεζα", nameEn: "Preveza", lat: 38.9593, lng: 20.7517, population: 19842 },
  { region: "Θεσσαλία", nameEl: "Λάρισα", nameEn: "Larissa", lat: 39.639, lng: 22.4191, population: 162591 },
  { region: "Θεσσαλία", nameEl: "Βόλος", nameEn: "Volos", lat: 39.361, lng: 22.9422, population: 144449 },
  { region: "Θεσσαλία", nameEl: "Τρίκαλα", nameEn: "Trikala", lat: 39.5553, lng: 21.7679, population: 61729 },
  { region: "Ιόνια Νησιά", nameEl: "Κέρκυρα", nameEn: "Corfu", lat: 39.6243, lng: 19.9217, population: 39000 },
  { region: "Ιόνια Νησιά", nameEl: "Ζάκυνθος", nameEn: "Zakynthos", lat: 37.787, lng: 20.8999, population: 16332 },
  { region: "Ιόνια Νησιά", nameEl: "Αργοστόλι", nameEn: "Argostoli", lat: 38.1811, lng: 20.489, population: 10706 },
  { region: "Δυτική Ελλάδα", nameEl: "Πάτρα", nameEn: "Patras", lat: 38.2466, lng: 21.7346, population: 213984 },
  { region: "Δυτική Ελλάδα", nameEl: "Αγρίνιο", nameEn: "Agrinio", lat: 38.6218, lng: 21.4077, population: 46899 },
  { region: "Δυτική Ελλάδα", nameEl: "Πύργος", nameEn: "Pyrgos", lat: 37.6751, lng: 21.441, population: 24185 },
  { region: "Στερεά Ελλάδα", nameEl: "Χαλκίδα", nameEn: "Chalkida", lat: 38.4636, lng: 23.6022, population: 102223 },
  { region: "Στερεά Ελλάδα", nameEl: "Λαμία", nameEn: "Lamia", lat: 38.9, lng: 22.4333, population: 75315 },
  { region: "Στερεά Ελλάδα", nameEl: "Θήβα", nameEn: "Thebes", lat: 38.325, lng: 23.3189, population: 22663 },
  { region: "Αττική", nameEl: "Αθήνα", nameEn: "Athens", lat: 37.9838, lng: 23.7275, population: 643452 },
  { region: "Αττική", nameEl: "Πειραιάς", nameEn: "Piraeus", lat: 37.942, lng: 23.6465, population: 163688 },
  { region: "Αττική", nameEl: "Λαύριο", nameEn: "Lavrio", lat: 37.7145, lng: 24.0565, population: 25871 },
  { region: "Πελοπόννησος", nameEl: "Καλαμάτα", nameEn: "Kalamata", lat: 37.0389, lng: 22.1142, population: 69903 },
  { region: "Πελοπόννησος", nameEl: "Κόρινθος", nameEn: "Corinth", lat: 37.9381, lng: 22.9322, population: 58280 },
  { region: "Πελοπόννησος", nameEl: "Τρίπολη", nameEn: "Tripoli", lat: 37.5089, lng: 22.3794, population: 30866 },
  { region: "Βόρειο Αιγαίο", nameEl: "Μυτιλήνη", nameEn: "Mytilene", lat: 39.1077, lng: 26.5553, population: 37689 },
  { region: "Βόρειο Αιγαίο", nameEl: "Χίος", nameEn: "Chios", lat: 38.3709, lng: 26.1363, population: 26850 },
  { region: "Βόρειο Αιγαίο", nameEl: "Βαθύ", nameEn: "Vathy", lat: 37.7544, lng: 26.9779, population: 12500 },
  { region: "Νότιο Αιγαίο", nameEl: "Ρόδος", nameEn: "Rhodes", lat: 36.4341, lng: 28.2176, population: 56128 },
  { region: "Νότιο Αιγαίο", nameEl: "Κως", nameEn: "Kos", lat: 36.8926, lng: 27.2877, population: 19244 },
  { region: "Νότιο Αιγαίο", nameEl: "Ερμούπολη", nameEn: "Ermoupoli", lat: 37.4447, lng: 24.9425, population: 11407 },
  { region: "Κρήτη", nameEl: "Ηράκλειο", nameEn: "Heraklion", lat: 35.3387, lng: 25.1442, population: 173993 },
  { region: "Κρήτη", nameEl: "Χανιά", nameEn: "Chania", lat: 35.5138, lng: 24.018, population: 108642 },
  { region: "Κρήτη", nameEl: "Ρέθυμνο", nameEn: "Rethymno", lat: 35.3656, lng: 24.4823, population: 34293 },
];
