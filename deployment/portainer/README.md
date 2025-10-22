# Portainer deployment

This folder contains the artefacts required to deploy **slotlist-backend** via [Portainer](https://www.portainer.io/) and expose it behind [NGINX Proxy Manager](https://nginxproxymanager.com/).

## Prerequisites

1. A Portainer instance with access to the Docker environment that will host slotlist-backend.
2. An operational NGINX Proxy Manager (NPM) container. Create or reuse a Docker network that both NPM and slotlist-backend can join (the default configuration expects a network named `npm_proxy`).
3. (Optional) Google Cloud credentials if you plan to use the image storage integration. Place the JSON key file in `deployment/portainer/credentials/` and update `CONFIG_STORAGE_KEYFILENAME` accordingly.

## Preparing configuration

1. Review `deployment/portainer/production.env` and replace all placeholder values such as database passwords, JWT secrets and Steam API secrets with secure values. The same file is loaded by both the application and PostgreSQL containers, so keep the `CONFIG_DATABASE_*` values in sync with the `POSTGRES_*` entries.
2. If your NPM installation uses a different network name, either create a network called `npm_proxy` (`docker network create npm_proxy`) or adjust the `name:` field of the `npm_proxy` network in `docker-compose.yml`.
3. Commit any organisation specific overrides to `deployment/portainer/production.env.local` (ignored by git) if you need to maintain local copies alongside the repository defaults.

## Deploying through Portainer

1. In Portainer, create a new *Stack* and choose the "Web editor" or "Git repository" option that best fits your workflow.
2. Provide the contents of `docker-compose.yml` (or reference this repository) and ensure `deployment/portainer/production.env` is supplied as an environment file for the stack.
3. Deploy the stack. Portainer will build the image using the included `Dockerfile` and start two services: `slotlist-backend` and the accompanying PostgreSQL database.
4. In NGINX Proxy Manager, create a new **Proxy Host** for `api.slotlist.insidearma.de` pointing to the internal hostname `slotlist-backend` on port `3000` and enable SSL using your preferred certificate source.

After the stack has been deployed and the proxy host configured, the API will be reachable at `https://api.slotlist.insidearma.de`.

