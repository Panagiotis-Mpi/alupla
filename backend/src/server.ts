// Εκκινεί το backend server χρησιμοποιώντας το app και το port από το περιβάλλον.
import { createApp } from "./app";
import { env } from "./config/env";

// Δημιουργεί το Express app
const app = createApp();

// Ξεκινά τον server στο συγκεκριμένο port
app.listen(env.port);
