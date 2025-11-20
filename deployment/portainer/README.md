# Portainer deployment

This folder contains the artefacts required to deploy **slotlist-backend** via [Portainer](https://www.portainer.io/) and expose it behind [NGINX Proxy Manager](https://nginxproxymanager.com/).

## Prerequisites

1. A Portainer instance with access to the Docker environment that will host slotlist-backend.
2. An operational NGINX Proxy Manager (NPM) container. Create or reuse a Docker network that both NPM and slotlist-backend can join (the default configuration expects a network named `npm_proxy`).
3. (Optional) Google Cloud credentials if you plan to use the image storage integration. Place the JSON key file in `deployment/portainer/credentials/` and update `CONFIG_STORAGE_KEYFILENAME` accordingly.
4. Node.js 22.21.0 on build hosts to mirror the runtime specified in `package.json` and `Dockerfile`.

## Preparing configuration

1. Review `deployment/portainer/production.env` and replace all placeholder values such as database passwords, JWT secrets and Steam API secrets with secure values. The same file is loaded by both the application and PostgreSQL containers, so keep the `CONFIG_DATABASE_*` values in sync with the `POSTGRES_*` entries.
2. If your NPM installation uses a different network name, either create a network called `npm_proxy` (`docker network create npm_proxy`) or adjust the `name:` field of the `npm_proxy` network in `docker-compose.yml`.
3. Commit any organisation specific overrides to `deployment/portainer/production.env.local` (ignored by git) if you need to maintain local copies alongside the repository defaults.
4. Create a `.env` file in the project root based on `.env.example` when you deploy from a cloned working copy. Portainer automatically merges this file with the values declared in `production.env`.

### Secrets and sensitive values
- **JWT & Steam:** Always provide `CONFIG_JWT_SECRET` and `CONFIG_STEAM_API_SECRET` via the stack UI or `.env` rather than committing them. Rotate these secrets if a deployment stack is recreated.
- **Database:** Use strong passwords for `CONFIG_DATABASE_PASSWORD`/`POSTGRES_PASSWORD` and restrict access to the Docker network containing `db` and `slotlist-backend`.
- **Storage:** If Google Cloud Storage is enabled, ensure `CONFIG_STORAGE_KEYFILENAME` points to a mounted JSON credentials file and set restrictive IAM policies on the bucket.

## Deploying through Portainer

1. In Portainer, create a new *Stack* and choose the "Web editor" or "Git repository" option that best fits your workflow.
2. Provide the contents of `docker-compose.yml` (or reference this repository) and ensure `deployment/portainer/production.env` is supplied as an environment file for the stack.
3. Deploy the stack. Portainer will build the image using the included `Dockerfile` and start two services: `slotlist-backend` and the accompanying PostgreSQL database.
4. In NGINX Proxy Manager, create a new **Proxy Host** for `api.slotlist.insidearma.de` pointing to the internal hostname `slotlist-backend` on port `3000` and enable SSL using your preferred certificate source.

After the stack has been deployed and the proxy host configured, the API will be reachable at `https://api.slotlist.insidearma.de`.

### Deploying the stack directly from GitHub

Portainer can pull this repository and build the container image on the target Docker host without requiring a pre-built image. To use this workflow:

1. Choose the **Git repository** option when creating the stack.
2. Set the repository URL to the GitHub project that contains the backend (for example `https://github.com/<organisation>/slotlist-backend.git`) and select the branch or tag you want to deploy.
3. In **Compose path**, enter `docker-compose.yml` so Portainer uses the root compose file from the repository.
4. Add an environment file entry that points to `deployment/portainer/production.env`. Portainer will mount it automatically when deploying the stack. If your GitHub repository is private, provide access credentials in the stack configuration so Portainer can clone it.
5. Deploy the stack. Portainer clones the repository, builds the image from the included `Dockerfile` and starts the `slotlist-backend` and PostgreSQL services.

This approach ensures that the deployed container always reflects the selected Git revision without the need to publish Docker images to an external registry.

### Operational checklist
- Verify the health check at `http://127.0.0.1:3000/health` returns `200 OK` once the container is running.
- Confirm DNS or host overrides for `api.slotlist.insidearma.de` point to the reverse proxy that fronts the Portainer stack.
- Review container logs after first start to ensure migrations complete and Steam API configuration is valid.
- Back up the persistent PostgreSQL volume regularly; the default compose file mounts data to `deployment/portainer/postgres` on the host.
