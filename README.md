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
slotlist-backend is now intended to be deployed through Portainer and exposed via NGINX Proxy Manager. The
`deployment/portainer` folder contains the environment file and documentation required for that workflow. A typical
installation involves the following steps:

1. Review and customise `deployment/portainer/production.env`.
2. Ensure a Docker network shared with your NGINX Proxy Manager instance exists (the provided configuration expects
   `npm_proxy`).
3. Deploy the stack in Portainer using the root `docker-compose.yml` file.
4. Configure a Proxy Host in NGINX Proxy Manager for `slotlist.insidearma.de` that forwards traffic to the
   `slotlist-backend` service on port 3000.

Since no direct SSL support is integrated, HTTPS termination is handled entirely by NGINX Proxy Manager.

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

