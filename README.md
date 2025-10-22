# slotlist-backend
Backend of [slotlist.insidearma.de](https://slotlist.insidearma.de), an ArmA 3 mission planning and slotlist management tool.
The corresponding frontend implementation of this project can be found at [slotlist-frontend](https://github.com/MorpheusXAUT/slotlist-frontend).

## 📢 Project Status

The public service previously available at slotlist.info is being sunset, but the software remains available for private
deployments. This repository has been updated to target the new instance operated at `slotlist.insidearma.de` and now focuses on
container-based deployments via Portainer and NGINX Proxy Manager.

## Installation
### Requirements
* [Node](https://nodejs.org) 22.20.0 (LTS)
* [Yarn](https://yarnpkg.com) 1.4 and up
* [PostgreSQL](https://www.postgresql.org/) 9.6 and up

#### Package requirements
* libpq
* g++ *(build only)*
* make *(build only)*
* postgresql-dev *(build only)*
* python3 *(build only)*

#### Optional dependencies
* [Docker](https://www.docker.com/) 17.12 and up
* [Docker Compose](https://docs.docker.com/compose/) 1.14 and up
* [Portainer](https://www.portainer.io/) (for production deployments)
* [NGINX Proxy Manager](https://nginxproxymanager.com/) (for HTTPS offloading)

### Setup
#### Install and transpile TypeScript
```sh
$ yarn
$ yarn build
```

#### Prepare database and migrate to latest state
```sh
$ yarn migrate
```

#### Remove unneeded packages for minimal production install (optional)
```sh
$ yarn install --prod
$ yarn cache clean
```

#### Adjust required environment variables and config
Configuration will be parsed from environment variables, all of which can be found in the `dev.env` file as well as the
[Configuration](docs/Configuration.md) markdown file in the `docs/` folder of this repository.

Beside `dev.env`, you should create a `.env` file in the root of your repository - it will automatically be ignored by git. Use
this file to overwrite the default config values or provide missing ones; you will at very least have to provide:
* CONFIG_STEAM_API_SECRET
* CONFIG_STORAGE_BUCKETNAME
* CONFIG_STORAGE_PROJECTID
* CONFIG_JWT_SECRET
* DEFAULT_ADMIN_STEAMID
* DEFAULT_ADMIN_NICKNAME

If you do not use Docker Compose to run slotlist-backend, make sure all environment variables are set up as listed in `dev.env`.

## Usage
slotlist-backend can either be run "natively" or utilising Docker and Docker Compose. When using the development Docker
compose file, a PostgreSQL instance will automatically be started as well, removing the need to provide a separate database
setup.

#### Start with bunyan formatting
```sh
$ yarn start
```

#### Start with raw bunyan JSON logs
```sh
$ yarn start:docker
```

#### Start using Docker for local development
```sh
$ docker compose -f docker-compose.dev.yml up
```

## Development
The easiest way to start developing is by using the Docker setup described above. Running `docker compose -f docker-compose.dev.yml up` automatically mounts the transpiled `dist/` folder to the Docker container and watches for file
changes - you can thus run a build task in your IDE and the backend container will automatically restart with the latest
changes.

Unfortunately, there are no automated unit tests as of now (2018-01-09), however I plan on adding some mocha tests in the
future, removing the need to test all new and existing functionality by hand.

## Deployment
slotlist-backend ist für den Betrieb über Portainer konzipiert und wird üblicherweise über den NGINX Proxy Manager
nach außen veröffentlicht. Im Ordner `deployment/portainer` findest du dafür eine Referenzkonfiguration.

### Voraussetzungen
* Eine Portainer-Instanz mit Zugriff auf den Ziel-Docker-Host.
* Ein gemeinsames Docker-Netzwerk mit deinem NGINX Proxy Manager (das Compose-File erwartet standardmäßig
  `npm_proxy`). Den Netzwerknamen kannst du im Compose-File anpassen, falls dein Setup einen anderen Namen nutzt.
* Optional: Eine lokale `.env`-Datei im Projektwurzelverzeichnis, um sensible Werte zu überschreiben, die nicht in der
  Versionskontrolle landen sollen.

### Schritt 1: Umgebungsvariablen vorbereiten
1. Öffne `deployment/portainer/production.env` und passe alle Werte an, die für deine Installation spezifisch sind.
   Die Datei enthält sowohl die Standardwerte für den Backend-Container als auch für den PostgreSQL-Dienst.
2. Lege im Projektverzeichnis eine eigene `.env`-Datei an (oder erweitere eine bestehende), um individuelle
   Überschreibungen vorzunehmen. Diese Datei wird automatisch vom `slotlist-backend`-Dienst eingelesen. Typische
   Einträge sehen beispielsweise so aus:
   ```dotenv
   CONFIG_HTTP_PUBLICHOST=slotlist.beispiel.de
   CONFIG_STEAM_API_SECRET=dein-geheimer-wert
   CONFIG_JWT_SECRET=bitte-anpassen

   # Optionale Overrides für die Datenbank
   POSTGRES_DB=slotlist_production
   POSTGRES_USER=slotlist_user
   POSTGRES_PASSWORD=sicheres-passwort
   ```
   Portainer erlaubt beim Deployment außerdem das manuelle Setzen einzelner Variablen. Werte aus der `.env`-Datei haben
   Vorrang vor denen aus `production.env`, sodass du sensible Informationen bequem trennen kannst.

### Schritt 2: Stack in Portainer deployen
1. Melde dich in Portainer an und öffne **Stacks → Add stack**.
2. Vergib einen aussagekräftigen **Name** für den Stack (z. B. `slotlist-backend`).
3. Lade den Inhalt der Datei `docker-compose.yml` in den Editor oder lade die Datei hoch.
4. Im Abschnitt **Environment variables** kannst du zusätzliche Schlüssel-Wert-Paare anlegen oder eine vorbereitete
   `.env`-Datei hochladen. Stelle sicher, dass mindestens alle geheimen Werte (`CONFIG_*`, `DEFAULT_ADMIN_*`,
   `POSTGRES_*`) korrekt gesetzt sind.
5. Bestätige mit **Deploy the stack**. Portainer startet dabei sowohl den `slotlist-backend`-Dienst als auch den
   dazugehörigen PostgreSQL-Container (`db`). Dank des `env_file`-Eintrags werden sämtliche Variablen automatisch
   übernommen.

### Schritt 3: Zugriff konfigurieren
1. Richte im NGINX Proxy Manager einen Proxy Host ein, der auf den Container `slotlist-backend` Port `3000`
   weiterleitet und – falls gewünscht – ein TLS-Zertifikat (z. B. Let’s Encrypt) bereitstellt.
2. Prüfe nach dem ersten Start die Container-Logs in Portainer, um sicherzustellen, dass die Verbindung zur
   PostgreSQL-Datenbank (`db`) hergestellt wurde.

### Wichtige Variablen im Überblick
| Variable | Zweck | Standardwert |
| --- | --- | --- |
| `CONFIG_DATABASE_HOST` | Hostname des PostgreSQL-Dienstes innerhalb des Stacks | `db` |
| `CONFIG_DATABASE_DATABASE` / `POSTGRES_DB` | Name der Datenbank | `slotlist-backend` |
| `CONFIG_DATABASE_USERNAME` / `POSTGRES_USER` | Datenbankbenutzer | `slotlist-backend` |
| `CONFIG_DATABASE_PASSWORD` / `POSTGRES_PASSWORD` | Datenbankpasswort | `slotlist-backend` |
| `CONFIG_HTTP_PUBLICHOST` | Öffentlicher Hostname der Anwendung | `slotlist.insidearma.de` |
| `CONFIG_STEAM_API_SECRET`, `CONFIG_JWT_SECRET` | Erforderliche Geheimnisse für Authentifizierung | `please-change-me` |
| `DEFAULT_ADMIN_STEAMID`, `DEFAULT_ADMIN_NICKNAME` | Initiale Admin-Zugänge | *(leer)* |

SSL/TLS wird weiterhin vollständig durch den NGINX Proxy Manager termininiert; der Backend-Container selbst spricht
innerhalb des Docker-Netzwerks HTTP.

## Contributing
Pull requests are more than welcome - I am grateful for any help, no matter how small it is! For major changes, please open an
issue first so proposed modifications can be discussed.

All pull requests should be submitted to the `dev` branch - once a feature is fully implemented and tested, it will be merged to
the `master` branch and deployed.
Attributions will be provided in the [Contributors](docs/Contributors.md) file inside the `docs/` folder as appropriate.

In additional to development work for the backend or frontend projects, [slotlist.insidearma.de](https://slotlist.insidearma.de)
also needs your help in providing accurate and complete translations. We are utilising
[OneSky](https://morpheusxaut.oneskyapp.com/collaboration/project/133324) to crowd-source our translations and provide an easy
interface to manage required strings. Feel free to contribute any translations or suggest a new language by opening an issue on
the [slotlist-frontend repository](https://github.com/MorpheusXAUT/slotlist-frontend/issues).

## Versioning
slotlist-backend uses [Semantic Versioning](https://semver.org/) for releases, every deployment will be tagged with a new,
appropriate version - old releases can be found on GitHub's [release tab](https://github.com/MorpheusXAUT/slotlist-backend/releases).

## License
[MIT](https://choosealicense.com/licenses/mit/)

## See Also
[slotlist-frontend](https://github.com/MorpheusXAUT/slotlist-frontend), the frontend portion of
[slotlist.insidearma.de](https://slotlist.insidearma.de), written in Vue.js

