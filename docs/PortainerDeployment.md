# Deployment des slotlist-backend über Portainer und GitHub

Diese Anleitung beschreibt, wie du das Repository [`sancron/slotlist-backend`](https://github.com/sancron/slotlist-backend) direkt aus Portainer als Stack ausrollst. Der Fokus liegt auf einer klaren Trennung des Netzwerkes, sodass Nginx Proxy Manager (NPM) anschließend **dem** Netzwerk des Backends beitritt und es nicht umgekehrt – so lassen sich doppelte Port-3000-Belegungen vermeiden.

## Voraussetzungen
* Portainer-Instanz mit Zugriff auf den Ziel-Docker-Host (Standalone oder Swarm).
* GitHub-Zugriff (ohne Authentifizierung, weil das Repository öffentlich ist) auf `https://github.com/sancron/slotlist-backend.git`.
* Ein dediziertes Docker-Netzwerk für das Backend (siehe nächsten Abschnitt) und optionaler Zugriff auf eine bestehende NPM-Installation.
* Die Konfigurationswerte aus `dev.env` bzw. [docs/Configuration.md](./Configuration.md), insbesondere Steam-/Storage-Credentials sowie die Default-Admin-Werte (`CONFIG_STEAM_API_SECRET`, `CONFIG_STORAGE_BUCKETNAME`, `CONFIG_STORAGE_PROJECTID`, `CONFIG_JWT_SECRET`, `DEFAULT_ADMIN_STEAMID`, `DEFAULT_ADMIN_NICKNAME`).

## Schritt 1 – internes Backend-Netzwerk anlegen
1. Melde dich in Portainer an und öffne **Environments → <Docker-Target> → Networks**.
2. Lege ein neues Netzwerk an, z. B. `slotlist-backend-net` (Typ `bridge`). Merke dir den Namen exakt.
3. Das Netzwerk bleibt zunächst leer – nur der Stack des Backends wird darin laufen. Erst nach dem erfolgreichen Deployment fügst du NPM hinzu.

## Schritt 2 – Stack direkt aus GitHub erstellen
1. Navigiere zu **Stacks → Add stack → Git repository**.
2. Fülle das Formular wie folgt aus:
   * **Name**: `slotlist-backend`
   * **Repository URL**: `https://github.com/sancron/slotlist-backend.git`
   * **Repository reference**: `master` (oder ein anderer gewünschter Branch/Tag)
   * **Compose path**: `docker-compose.yml`
3. Aktiviere bei Bedarf "Automatic updates" (Webhook oder Interval), wenn Portainer die Änderungen im Git-Repo regelmäßig übernehmen soll.
4. Unter **Environment variables** ergänze alle produktiven Werte. Die Compose-Datei lädt standardmäßig `dev.env` und `.env` ein und veröffentlicht den Backend-Port gemäß `HOST_PORT` ↔ `CONFIG_HTTP_PORT`. Passe mindestens die folgenden Variablen an:
   * `HOST_PORT`: Auf einen freien Host-Port setzen (z. B. `3300`) oder den Port-Mapping-Block nach dem ersten Deployment entfernen, wenn ausschließlich NPM den Dienst erreichen soll.
   * `CONFIG_HTTP_PORT`: Standard ist `3000`; dieser Port bleibt intern sichtbar und darf identisch zu NPMs internem Port sein.
   * Alle Secrets laut [Configuration](./Configuration.md).
5. Ergänze im Feld **Additional docker-compose** (oder indem du einen Fork des Repos pflegst) folgende Netzwerkanbindung, damit der Stack ausschließlich auf `slotlist-backend-net` läuft:
   ```yaml
   networks:
     default:
       external: true
       name: slotlist-backend-net
   ```
   Alternativ kannst du diese Zeilen lokal in einen Fork der `docker-compose.yml` aufnehmen.
6. Klicke auf **Deploy the stack**. Portainer baut nun das Node.js-Image (Service `app`) sowie den PostgreSQL-Container `db`. Der Healthcheck des App-Containers prüft `/v1/status` auf Port 3000, daher muss der Port intern erreichbar bleiben.

### Was macht die Compose-Datei?
* Der Service `app` baut das Image aus dem Repository, lädt `dev.env`/`.env`, startet mit `yarn dev:docker` und veröffentlicht `CONFIG_HTTP_PORT` (standardmäßig 3000) auf `HOST_PORT`. Zudem werden `dist/` sowie die GCP-Credentials eingebunden, die Datenbank ist als `depends_on`/`links` verdrahtet und ein Healthcheck sorgt für Neustarts bei Fehlern.【F:docker-compose.yml†L3-L37】
* Der Service `db` startet PostgreSQL 9.6 mit den Default-Zugangsdaten `slotlist-backend` und veröffentlicht – falls gewünscht – ebenfalls einen Host-Port über die Variable `POSTGRES_PORT`. Wenn du eine externe Datenbank nutzt, entferne diesen Service im Fork und setze `CONFIG_DATABASE_*` laut [Configuration](./Configuration.md).【F:docker-compose.yml†L31-L38】【F:docs/Configuration.md†L7-L41】

## Schritt 3 – NPM dem Backend-Netzwerk hinzufügen
1. Nach erfolgreichem Deployment öffne in Portainer **Containers → npm-app** (oder der Name deiner NPM-Instanz) → **Duplicate/Edit**.
2. Scrolle zu **Network** und klicke auf **+ Add network** → wähle `slotlist-backend-net` → **Deploy the container**. Damit wird NPM zusätzlich mit dem Backend-Netz verbunden, ohne seine bestehenden Netzwerke zu entfernen.
3. In NPM kannst du nun einen Proxy-Host anlegen, dessen **Forward Hostname/IP** `slotlist-backend_app` (oder der Containername des App-Services) lautet und dessen **Forward Port** `3000` ist. Da die Verbindung rein intern erfolgt, ist kein zweiter Host-Port 3000 nötig.

## Schritt 4 – Tests und Wartung
* Prüfe nach dem Deployment in Portainer die Logs des `app`-Containers. Bei erfolgreichem Start sollte der Healthcheck "healthy" melden.
* Für Updates genügt ein Klick auf **Pull and redeploy** innerhalb des Stacks, sofern automatische Updates nicht aktiviert sind.
* Ändern sich Credentials oder Ports, aktualisiere die Stack-Variablen und führe ein Redeploy durch. Die relevanten Umgebungsvariablen findest du jederzeit in [docs/Configuration.md](./Configuration.md).

Durch diese Vorgehensweise behält der slotlist-backend-Stack die Kontrolle über sein Netzwerk, während NPM lediglich beitritt. Damit bleiben interne Ports konsistent, und Host-Port-Konflikte – insbesondere doppelte 3000er Belegungen – werden vermieden.
