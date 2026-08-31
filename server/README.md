# Astra / Velo.Schulplaner Backend & Admin Portal

Sicheres, modernes Backend mit Rollenverwaltung (Admin, Lehrer, Schüler), JWT-Authentifizierung, strikter Klassenfilterung und Web-Admin-Portal.

---

## 🚀 Coolify Deployment Anleitung

### Methode 1: Direkt via Git Repository (Empfohlen)

1. **Neues Projekt in Coolify anlegen**:
   - Gehe in dein Coolify Dashboard → **Projects** → Wähle deine Umgebung.
   - Klicke auf **+ Add Resource** → **Public/Private Git Repository**.
   - Gib dein Git-Repository an.

2. **Build Pack & Pfade konfigurieren**:
   - **Build Pack**: Wähle `Dockerfile`.
   - **Base Directory**: `/server` (falls das Backend im Unterordner `server/` liegt) oder Root.
   - **Dockerfile Location**: `/Dockerfile` (im Kontext des Base Directory).
   - **Exposed Port**: `3000`.

3. **Persistenten Speicher (Volume) einrichten**:
   - Da Nutzer- und Vertretungsdaten persistent gespeichert werden müssen, gehe in Coolify auf **Storages**:
   - **Name**: `astra_data`
   - **Destination path (im Container)**: `/app/data`

4. **Umgebungsvariablen (Environment Variables)**:
   In Coolify unter **Environment Variables** hinterlegen:
   ```env
   NODE_ENV=production
   PORT=3000
   DATA_DIR=/app/data
   JWT_SECRET=generiere-hier-einen-zufaelligen-64-zeichen-string
   JWT_EXPIRES_IN=7d
   ADMIN_DEFAULT_PASSWORD=DeinSicheresAdminPasswort2026!
   CORS_ORIGIN=*
   ```

5. **Bereitstellen (Deploy)**:
   - Klicke auf **Deploy**.
   - Nach erfolgreichem Start ist das Web-Admin-Portal unter deiner konfigurierten Domain (z.B. `https://schulplaner.deine-domain.de`) erreichbar!

---

### Methode 2: Docker Compose in Coolify

1. Wähle in Coolify **+ Add Resource** → **Docker Compose**.
2. Füge den Inhalt von `docker-compose.yml` ein.
3. Klicke auf **Deploy**.

---

## 🛡️ Rollen & Berechtigungen

| Rolle | Plattform | Berechtigungen & Verhalten |
| :--- | :--- | :--- |
| **`admin`** | **Nur Web-Portal** | Vollzugriff: Benutzerverwaltung (Erstellen/Löschen/Passwörter kopieren), Vertretungspläne einpflegen. Login in Android-App wird abgewiesen. |
| **`lehrer`** | **Android App** | Kann Vertretungspläne für seine Fächer/Klassen oder die gesamte Schule einsehen. |
| **`schueler`** | **Android App** | Fest an die zugewiesene Klasse gebunden (z. B. `9aR`). Erhält serverseitig **nur** Pläne seiner eigenen Klasse. |

---

## 🏷️ Klassenkürzel-Standard

Schema: `[Klassenstufe][a-z][H/R]`
- **Klassenstufe**: `5` bis `13`
- **Zweig**: immer **klein** (`a`, `b`, `c`...)
- **Schulform**: immer **groß** am Ende (`H` = Hauptschule, `R` = Realschule)
- **Gültige Beispiele**: `9aR`, `8bH`, `10cR`, `7aH`
- Backend und Admin-Webportal normalisieren Eingaben wie `9ar` oder `8bh` automatisch zu `9aR` bzw. `8bH`.
