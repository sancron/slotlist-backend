# AGENTS.md
> Verbindliche Richtlinie für Code-Agenten und Entwickler  
> Gültig für:  
> - https://github.com/sancron/slotlist-backend  
> - https://github.com/sancron/slotlist-frontend  
> Domains:  
> - Frontend → https://slotlist.insidearma.de  
> - Backend → https://api.slotlist.insidearma.de

---

## 1. Ziel dieses Dokuments

Diese Datei definiert **verbindliche technische und organisatorische Richtlinien** für automatische Code-Agenten (z. B. OpenAI Codex) und Entwickler, die am Slotlist-Projekt arbeiten.  
Ziel ist ein **stabiler, wartbarer, moderner und konsistenter Stack** über beide Repositories hinweg.

### Zusammengefasst:
- Das gesamte Projekt läuft **nativ auf Node.js 22.21.0 LTS** (lokal und in Docker).
- Falls eine **ältere Node-Version erkannt wird**, **muss Codex Node 22.21.0 LTS automatisch installieren und aktivieren**.
- **Veraltete oder deprecated APIs** müssen aktiv ersetzt werden.
- **Frontend und Backend** sind **kompatibel und klar getrennt**, aber synchron versioniert.
- Das Projekt wird via **Docker-Compose** unter **Portainer** betrieben, mit **Nginx Proxy Manager (NPM)** als Reverse Proxy.
- **Domains sind fix definiert** und dürfen nicht verändert werden.
- **README** und **.env.example** müssen bei jeder Codeänderung **aktualisiert** werden.
- **Sicherheits- und Qualitätsstandards** (Linting, Tests, moderne Syntax, CORS, Secrets) gelten verbindlich.

---

## 2. Node.js & Sprachstandard

- **Node.js Version:** `22.21.0 LTS` (nativ & in Containern).  
  → In `package.json`:
  ```json
  "engines": { "node": "22.21.0" }
  ````

### 2.1 Automatische Installation durch Codex

Wenn Codex oder die lokale Umgebung eine ältere Node-Version (< 22.21.0) erkennt,
**muss er die aktuelle Version automatisch nachinstallieren**.

#### Für Linux / macOS:

```bash
# Prüfen ob Node-Version zu alt ist
if ! node -v | grep -q "v22.21.0"; then
  echo "⚙️  Aktualisiere Node.js auf 22.21.0 LTS..."
  # nvm installieren falls nicht vorhanden
  if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi
  nvm install 22.21.0
  nvm use 22.21.0
  node -v
fi
```

#### Für Windows (PowerShell):

```powershell
$nodeVersion = (node -v) -replace "v",""
if ($nodeVersion -ne "22.21.0") {
  Write-Host "⚙️  Aktualisiere Node.js auf 22.21.0 LTS..."
  winget install OpenJS.NodeJS.LTS --version 22.21.0 --silent
}
node -v
```

> **Codex MUSS diese Befehle automatisch ausführen**, wenn Node < 22.21.0 erkannt wird,
> bevor er Build-, Test- oder Docker-Befehle ausführt.

---

### 2.2 Sprachrichtlinien

* **Nur moderne Syntax (ESM):**

  * `import` / `export`
  * `async/await`
  * Keine Callback-APIs, keine CommonJS (`require`, `module.exports`)
  * Keine Verwendung veralteter Node-APIs (`fs.exists`, `Buffer()` ohne `alloc`, alte `url`-Parser, etc.)

* **TypeScript empfohlen**:

  * `strict: true`
  * Pfad-Aliases erlaubt, solange Build sauber ist
  * Build-Ausgabe nach `/dist` oder `/build`

* **Styling:** ESLint + Prettier verpflichtend

* **Abhängigkeiten:**

  * Keine nicht benötigten Packages („Dependency Bloat“)
  * Sicherheitsprüfungen (`npm audit`) regelmäßig ausführen

---

## 3. Repository-Übergreifende Architektur

| Bereich       | Zweck                  | Domain / Port                                                            | Repo              |
| ------------- | ---------------------- | ------------------------------------------------------------------------ | ----------------- |
| Frontend      | SPA/SSR Weboberfläche  | [https://slotlist.insidearma.de](https://slotlist.insidearma.de)         | slotlist-frontend |
| Backend (API) | REST/GraphQL-Endpunkte | [https://api.slotlist.insidearma.de](https://api.slotlist.insidearma.de) | slotlist-backend  |

* **Kommunikation:**
  Frontend spricht **ausschließlich** mit `api.slotlist.insidearma.de`
  über HTTPS und dokumentierte Endpunkte (OpenAPI).

* **API-Verträge:**

  * Backend enthält `openapi/openapi.yaml`
  * Frontend konsumiert generierten Client (z. B. OpenAPI-Codegen)

* **Versionierung:**

  * SemVer (`1.2.3`)
  * Breaking Changes → Major Version + Changelog
  * Frontend erst anpassen, wenn API kompatibel ist

---

## 4. Deployment & Infrastruktur

### 4.1 Umgebung

Das Projekt wird über **Portainer** als Docker-Stack verwaltet.
TLS und Routing erfolgen über den **Nginx Proxy Manager (NPM)**.

| Komponente | Proxy Host                   | Zielcontainer-Port | Zweck              |
| ---------- | ---------------------------- | ------------------ | ------------------ |
| Frontend   | `slotlist.insidearma.de`     | `8080`             | Web-App (Vite/SSR) |
| Backend    | `api.slotlist.insidearma.de` | `3000`             | API-Server         |

**SSL:** Let’s Encrypt via NPM (HSTS aktiv, HTTP→HTTPS Redirect)
**Zugriff:** Optionale Access Control Lists (NPM) für Admin- oder Management-Endpunkte

---

### 4.2 Dockerfiles (Mindeststandard)

**Backend Beispiel:**

```Dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22.21.0-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22.21.0-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22.21.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package*.json ./
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["npm", "start"]
```

**Frontend Beispiel (Vite):**

```Dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22.21.0-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22.21.0-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist ./
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080 || exit 1
```

---

### 4.3 docker-compose Beispiel (Portainer Stack)

```yaml
version: "3.9"
services:
  slotlist-backend:
    image: ghcr.io/sancron/slotlist-backend:latest
    container_name: slotlist-backend
    env_file: .env.backend
    environment:
      - NODE_ENV=production
      - PUBLIC_BASE_URL=https://api.slotlist.insidearma.de
      - CORS_ORIGIN=https://slotlist.insidearma.de
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  slotlist-frontend:
    image: ghcr.io/sancron/slotlist-frontend:latest
    container_name: slotlist-frontend
    env_file: .env.frontend
    environment:
      - VITE_API_BASE_URL=https://api.slotlist.insidearma.de
      - VITE_PUBLIC_BASE_URL=https://slotlist.insidearma.de
    ports:
      - "8080:8080"
    restart: unless-stopped
```

---

## 5. Domains & Konfiguration

* **Frontend:** `https://slotlist.insidearma.de`
* **Backend:** `https://api.slotlist.insidearma.de`
* Keine anderen Subdomains oder Aliase verwenden.

### .env.example (Backend)

```
NODE_ENV=production
PORT=3000
PUBLIC_BASE_URL=https://api.slotlist.insidearma.de
CORS_ORIGIN=https://slotlist.insidearma.de
DATABASE_URL=postgres://user:pass@host:5432/slotlist
LOG_LEVEL=info
```

### .env.example (Frontend)

```
VITE_PUBLIC_BASE_URL=https://slotlist.insidearma.de
VITE_API_BASE_URL=https://api.slotlist.insidearma.de
```

---

## 6. Sicherheitsrichtlinien

* **CORS**: Nur `https://slotlist.insidearma.de` darf auf das Backend zugreifen.
* **Secrets**: Niemals im Repo speichern → nur ENV/Portainer Secrets.
* **HTTP-Header**: Verwende Sicherheitsheader (Helmet, OWASP-Richtlinien).
* **Rate Limiting & CSRF**: Aktiv bei Authentifizierungsendpunkten.
* **TLS enforced** durch NPM, HTTP→HTTPS-Redirect aktiv.

---

## 7. Qualität, Tests & Linting

* **Linting Pflicht:**
  `npm run lint` muss fehlerfrei sein.

* **Tests Pflicht:**
  `npm test` (Unit/E2E, Vitest/Jest) grün vor Merge.

* **CI/CD (GitHub Actions):**

  * Nutze Node `22.21.0`
  * Prüfe `build`, `lint`, `test`
  * Erzeuge Docker-Images → GHCR.io → Portainer Deployment-Webhook

---

## 8. Dokumentationspflichten

Bei **jeder Codeänderung**, die folgende Bereiche betrifft, **muss** der Agent oder Entwickler:

1. Die **README.md** aktualisieren

   * Node-Version
   * Setup-Anleitung
   * ENV-Variablen
   * Start- und Build-Kommandos
   * Domains (`slotlist.insidearma.de` / `api.slotlist.insidearma.de`)
2. `.env.example` anpassen
3. Falls API-Endpunkte geändert werden:

   * `openapi.yaml` aktualisieren
   * Frontend-Codegen regenerieren
4. Changelog-Eintrag im PR ergänzen

---

## 9. Checkliste für Codex / Agent vor Merge

* [ ] Node-Version 22.21.0 aktiv oder automatisch installiert
* [ ] Keine CommonJS- oder Callback-APIs
* [ ] Keine veralteten Node-Funktionen
* [ ] `.env.example` aktuell
* [ ] Domains korrekt (`slotlist.insidearma.de`, `api.slotlist.insidearma.de`)
* [ ] Dockerfile nutzt `node:22.21.0-alpine`
* [ ] README.md aktualisiert
* [ ] Tests & Lint erfolgreich
* [ ] CI/CD Workflow aktuell

---

## 10. Was der Agent nicht darf

* Keine Änderung der Domains
* Keine Abweichung von Node.js 22.21.0 LTS
* Keine Secrets im Code
* Keine ungetesteten Frameworks oder Bibliotheken
* Keine Änderungen ohne aktualisierte Dokumentation

---

*Letzte Aktualisierung: Oktober 2025*
*Erstellt für das Slotlist-Projekt (Frontend & Backend) by insidearma.de*