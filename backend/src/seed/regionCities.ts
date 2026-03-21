import { Region } from "../models/Region";

type CitySeed = {
  region: string;
  name: string;
  latitude: number;
  longitude: number;
};

const CITIES: CitySeed[] = [
  { region: "Ανατολική Μακεδονία και Θράκη", name: "Αλεξανδρούπολη", latitude: 40.8457, longitude: 25.8739 },
  { region: "Ανατολική Μακεδονία και Θράκη", name: "Ξάνθη", latitude: 41.1419, longitude: 24.8877 },
  { region: "Ανατολική Μακεδονία και Θράκη", name: "Καβάλα", latitude: 40.9396, longitude: 24.4018 },
  { region: "Κεντρική Μακεδονία", name: "Θεσσαλονίκη", latitude: 40.6401, longitude: 22.9444 },
  { region: "Κεντρική Μακεδονία", name: "Σέρρες", latitude: 41.0849, longitude: 23.5476 },
  { region: "Κεντρική Μακεδονία", name: "Κατερίνη", latitude: 40.2696, longitude: 22.5061 },
  { region: "Δυτική Μακεδονία", name: "Κοζάνη", latitude: 40.3006, longitude: 21.7889 },
  { region: "Δυτική Μακεδονία", name: "Πτολεμαΐδα", latitude: 40.5147, longitude: 21.6787 },
  { region: "Δυτική Μακεδονία", name: "Καστοριά", latitude: 40.5217, longitude: 21.2636 },
  { region: "Ήπειρος", name: "Ιωάννινα", latitude: 39.665, longitude: 20.8537 },
  { region: "Ήπειρος", name: "Άρτα", latitude: 39.1609, longitude: 20.9856 },
  { region: "Ήπειρος", name: "Πρέβεζα", latitude: 38.9593, longitude: 20.7517 },
  { region: "Θεσσαλία", name: "Λάρισα", latitude: 39.639, longitude: 22.4191 },
  { region: "Θεσσαλία", name: "Βόλος", latitude: 39.361, longitude: 22.9422 },
  { region: "Θεσσαλία", name: "Τρίκαλα", latitude: 39.5553, longitude: 21.7679 },
  { region: "Ιόνια Νησιά", name: "Κέρκυρα", latitude: 39.6243, longitude: 19.9217 },
  { region: "Ιόνια Νησιά", name: "Ζάκυνθος", latitude: 37.787, longitude: 20.8999 },
  { region: "Ιόνια Νησιά", name: "Αργοστόλι", latitude: 38.1811, longitude: 20.489 },
  { region: "Δυτική Ελλάδα", name: "Πάτρα", latitude: 38.2466, longitude: 21.7346 },
  { region: "Δυτική Ελλάδα", name: "Αγρίνιο", latitude: 38.6218, longitude: 21.4077 },
  { region: "Δυτική Ελλάδα", name: "Πύργος", latitude: 37.6751, longitude: 21.441 },
  { region: "Στερεά Ελλάδα", name: "Χαλκίδα", latitude: 38.4636, longitude: 23.6022 },
  { region: "Στερεά Ελλάδα", name: "Λαμία", latitude: 38.9, longitude: 22.4333 },
  { region: "Στερεά Ελλάδα", name: "Θήβα", latitude: 38.325, longitude: 23.3189 },
  { region: "Αττική", name: "Αθήνα", latitude: 37.9838, longitude: 23.7275 },
  { region: "Αττική", name: "Πειραιάς", latitude: 37.942, longitude: 23.6465 },
  { region: "Αττική", name: "Λαύριο", latitude: 37.7145, longitude: 24.0565 },
  { region: "Πελοπόννησος", name: "Καλαμάτα", latitude: 37.0389, longitude: 22.1142 },
  { region: "Πελοπόννησος", name: "Κόρινθος", latitude: 37.9381, longitude: 22.9322 },
  { region: "Πελοπόννησος", name: "Τρίπολη", latitude: 37.5089, longitude: 22.3794 },
  { region: "Βόρειο Αιγαίο", name: "Μυτιλήνη", latitude: 39.1077, longitude: 26.5553 },
  { region: "Βόρειο Αιγαίο", name: "Χίος", latitude: 38.3709, longitude: 26.1363 },
  { region: "Βόρειο Αιγαίο", name: "Βαθύ", latitude: 37.7544, longitude: 26.9779 },
  { region: "Νότιο Αιγαίο", name: "Ρόδος", latitude: 36.4341, longitude: 28.2176 },
  { region: "Νότιο Αιγαίο", name: "Κως", latitude: 36.8926, longitude: 27.2877 },
  { region: "Νότιο Αιγαίο", name: "Ερμούπολη", latitude: 37.4447, longitude: 24.9425 },
  { region: "Κρήτη", name: "Ηράκλειο", latitude: 35.3387, longitude: 25.1442 },
  { region: "Κρήτη", name: "Χανιά", latitude: 35.5138, longitude: 24.018 },
  { region: "Κρήτη", name: "Ρέθυμνο", latitude: 35.3656, longitude: 24.4823 },
  { region: "Ανατολική Μακεδονία και Θράκη", name: "Κομοτηνή", latitude: 41.1192, longitude: 25.4053 },
  { region: "Ανατολική Μακεδονία και Θράκη", name: "Ορεστιάδα", latitude: 41.5031, longitude: 26.5297 },
  { region: "Ανατολική Μακεδονία και Θράκη", name: "Σουφλί", latitude: 41.1919, longitude: 26.2993 },
  { region: "Κεντρική Μακεδονία", name: "Βέροια", latitude: 40.5244, longitude: 22.2024 },
  { region: "Κεντρική Μακεδονία", name: "Γιαννιτσά", latitude: 40.7919, longitude: 22.4075 },
  { region: "Κεντρική Μακεδονία", name: "Έδεσσα", latitude: 40.8026, longitude: 22.0475 },
  { region: "Κεντρική Μακεδονία", name: "Καλαμαριά", latitude: 40.5825, longitude: 22.9509 },
  { region: "Δυτική Μακεδονία", name: "Γρεβενά", latitude: 40.0833, longitude: 21.4278 },
  { region: "Δυτική Μακεδονία", name: "Σιάτιστα", latitude: 40.2619, longitude: 21.5442 },
  { region: "Δυτική Μακεδονία", name: "Φλώρινα", latitude: 40.781, longitude: 21.4095 },
  { region: "Ήπειρος", name: "Ηγουμενίτσα", latitude: 39.5034, longitude: 20.2634 },
  { region: "Ήπειρος", name: "Κόνιτσα", latitude: 40.0486, longitude: 20.749 },
  { region: "Ήπειρος", name: "Μέτσοβο", latitude: 39.7696, longitude: 21.1821 },
  { region: "Θεσσαλία", name: "Καρδίτσα", latitude: 39.3649, longitude: 21.9219 },
  { region: "Θεσσαλία", name: "Καλαμπάκα", latitude: 39.7061, longitude: 21.6291 },
  { region: "Θεσσαλία", name: "Ελασσόνα", latitude: 39.8947, longitude: 22.1885 },
  { region: "Θεσσαλία", name: "Λάρισσα", latitude: 39.639, longitude: 22.4191 },
  { region: "Ιόνια Νησιά", name: "Κεφαλονιά", latitude: 38.1754, longitude: 20.5692 },
  { region: "Ιόνια Νησιά", name: "Λευκάδα", latitude: 38.8303, longitude: 20.7044 },
  { region: "Ιόνια Νησιά", name: "Ιθάκη", latitude: 38.3644, longitude: 20.7205 },
  { region: "Δυτική Ελλάδα", name: "Μεσολόγγι", latitude: 38.3692, longitude: 21.4297 },
  { region: "Δυτική Ελλάδα", name: "Αίγιο", latitude: 38.2486, longitude: 22.0819 },
  { region: "Δυτική Ελλάδα", name: "Αμαλιάδα", latitude: 37.7984, longitude: 21.3506 },
  { region: "Στερεά Ελλάδα", name: "Λιβαδειά", latitude: 38.435, longitude: 22.8739 },
  { region: "Στερεά Ελλάδα", name: "Άμφισσα", latitude: 38.5253, longitude: 22.3746 },
  { region: "Στερεά Ελλάδα", name: "Ιτέα", latitude: 38.4312, longitude: 22.4246 },
  { region: "Αττική", name: "Περιστέρι", latitude: 38.0167, longitude: 23.6914 },
  { region: "Αττική", name: "Γλυφάδα", latitude: 37.8622, longitude: 23.7583 },
  { region: "Πελοπόννησος", name: "Άργος", latitude: 37.6333, longitude: 22.7333 },
  { region: "Πελοπόννησος", name: "Σπάρτη", latitude: 37.0736, longitude: 22.4297 },
  { region: "Βόρειο Αιγαίο", name: "Λήμνος", latitude: 39.8749, longitude: 25.0587 },
  { region: "Βόρειο Αιγαίο", name: "Ικαρία", latitude: 37.6122, longitude: 26.294 },
  { region: "Βόρειο Αιγαίο", name: "Άγιος Ευστράτιος", latitude: 39.5389, longitude: 24.9836 },
  { region: "Νότιο Αιγαίο", name: "Σύρος", latitude: 37.4447, longitude: 24.9425 },
  { region: "Νότιο Αιγαίο", name: "Νάξος", latitude: 37.1048, longitude: 25.3761 },
  { region: "Νότιο Αιγαίο", name: "Θήρα", latitude: 36.4167, longitude: 25.4333 },
  { region: "Κρήτη", name: "Ιεράπετρα", latitude: 35.0097, longitude: 25.742 },
  { region: "Κρήτη", name: "Σητεία", latitude: 35.2078, longitude: 26.1047 },
];

export async function ensureRegionCitiesSeeded(): Promise<void> {
  const peripheries = await Region.findAll({ where: { type: "PERIPHERY" } });
  const peripheryByName = new Map<string, any>();

  for (const item of peripheries as any[]) {
    peripheryByName.set(String(item.name), item);
  }

  for (const city of CITIES) {
    const parent = peripheryByName.get(city.region);
    if (!parent) continue;

    const existing = await Region.findOne({
      where: {
        type: "CITY",
        name: city.name,
        parent_id: Number(parent.id),
      },
    });

    if (!existing) {
      await Region.create({
        name: city.name,
        type: "CITY",
        parent_id: Number(parent.id),
        latitude: city.latitude,
        longitude: city.longitude,
      } as any);
      continue;
    }

    const lat = existing.latitude as any;
    const lng = existing.longitude as any;
    const needsUpdate = lat === null || lng === null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng));

    if (needsUpdate) {
      existing.latitude = city.latitude as any;
      existing.longitude = city.longitude as any;
      await existing.save();
    }
  }
}
