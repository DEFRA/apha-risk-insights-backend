# apha-risk-insights-backend

Modèle de plateforme backend Node.js pour la livraison de services. 🚀

- [Prérequis](#prérequis)
  - [Node.js](#nodejs)
- [Développement local](#développement-local)
  - [Configuration](#configuration)
  - [Hooks Git](#hooks-git)
  - [Développement](#développement)
  - [Tests](#tests)
  - [Production](#production)
  - [Scripts npm](#scripts-npm)
  - [Mise à jour des dépendances](#mise-à-jour-des-dépendances)
  - [Formatage](#formatage)
    - [Problème Prettier sous Windows](#problème-prettier-sous-windows)
- [Endpoints de l’API](#endpoints-de-lapi)
- [Outils d’aide au développement](#outils-daide-au-développement)
  - [Verrous MongoDB](#verrous-mongodb)
  - [Proxy](#proxy)
- [Docker](#docker)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [À propos de la licence](#à-propos-de-la-licence)

## Prérequis

### Node.js

Veuillez installer [Node.js](http://nodejs.org/) `>= v24` et [npm](https://nodejs.org/) `>= v11`. Le gestionnaire de versions Node [nvm](https://github.com/creationix/nvm) peut vous faciliter la tâche.

Pour utiliser la version de Node.js requise par cette application avec nvm :

```bash
cd apha-risk-insights-backend
nvm use
```

## Développement local

### Configuration

Installez les dépendances de l’application :

```bash
npm install
```

### Hooks Git

Les hooks Git sont gérés par [pre-commit](https://pre-commit.com/) (voir
[.pre-commit-config.yaml](./.pre-commit-config.yaml)). Lors d’un commit, ils exécutent
[detect-secrets](https://github.com/Yelp/detect-secrets), ESLint (avec `--fix`)
et Prettier.

Installez pre-commit, puis activez les hooks une fois après le clonage :

```bash
pip install pre-commit   # ou : pipx install pre-commit
pre-commit install
```

Pour exécuter les hooks sur tous les fichiers sans effectuer de commit :

```bash
pre-commit run --all-files
```

Pour exécuter manuellement ou dans la CI l’ensemble des vérifications (audit de sécurité,
contrôle du formatage, lint et tests) :

```bash
npm run check:all
```

#### Base de référence des secrets

`.secrets.baseline` répertorie les résultats connus et acceptés afin que
`detect-secrets` ne signale que les nouveaux résultats. Elle a été générée une fois avec :

```bash
pip install detect-secrets
detect-secrets scan > .secrets.baseline
```

Si le hook signale un faux positif, mettez à jour la base avec
`detect-secrets scan --baseline .secrets.baseline`, puis ajoutez le résultat au commit.

### Développement

Pour lancer l’application en mode `development` :

```bash
npm run dev
```

### Tests

Pour tester l’application :

```bash
npm run test
```

### Production

Pour simuler localement l’exécution de l’application en mode `production` :

```bash
npm start
```

### Scripts npm

Tous les scripts npm disponibles sont répertoriés dans [package.json](./package.json).
Pour les afficher dans votre terminal :

```bash
npm run
```

### Mise à jour des dépendances

Pour mettre à jour les dépendances, utilisez [npm-check-updates](https://github.com/raineorshine/npm-check-updates) :

> Le script suivant constitue un bon point de départ. Consultez toutes les options sur
> [npm-check-updates](https://github.com/raineorshine/npm-check-updates).

```bash
ncu --interactive --format group
```

### Formatage

#### Problème Prettier sous Windows

Si vous rencontrez des problèmes de formatage des retours à la ligne sous Windows, mettez à jour la configuration Git globale :

```bash
git config --global core.autocrlf false
```

## Endpoints de l’API

| Endpoint                       | Description                                               |
| :----------------------------- | :-------------------------------------------------------- |
| `GET: /health`                 | État de santé                                             |
| `GET: /documentation`          | Documentation OpenAPI                                     |
| `GET: /risks`                  | Évaluations des risques actuelles, paginées et filtrables |
| `GET: /risks/{riskId}`         | Une évaluation du risque avec son historique              |
| `GET: /diseases`               | Maladies utilisées dans les évaluations des risques       |
| `GET: /diseases/{diseaseCode}` | Une maladie utilisée dans les évaluations des risques     |

Les erreurs sont renvoyées au format `application/problem+json`. Le contrat est défini
dans la spécification OpenAPI `docs/openapi/v1.yaml`.

## Outils d’aide au développement

### Verrous MongoDB

Si vous avez besoin d’un verrou d’écriture pour MongoDB, vous pouvez l’obtenir via `server.locker` ou `request.locker` :

```javascript
async function doStuff(server) {
  const lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Verrou indisponible
    return
  }

  try {
    // effectuer les opérations
  } finally {
    await lock.free()
  }
}
```

Gardez les opérations courtes et atomiques.

Vous pouvez utiliser **using** pour gérer la ressource du verrou.
Notez que les rapports de couverture des tests ne prennent pas bien en charge cette syntaxe.

```javascript
async function doStuff(server) {
  await using lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Verrou indisponible
    return
  }

  // effectuer les opérations

  // verrou libéré automatiquement
}
```

Des méthodes utilitaires sont également disponibles dans `/src/helpers/mongo-lock.js`.

### Proxy

Un proxy de transfert est utilisé et configuré par défaut. Lors du déploiement, les services sont automatiquement configurés avec les variables d’environnement du proxy.

Node.js 24 utilise ces variables pour acheminer les requêtes HTTP(S) sortantes via le proxy :

```text
NODE_USE_ENV_PROXY=1
HTTPS_PROXY=...
NO_PROXY=...
```

Aucune configuration supplémentaire du proxy n’est nécessaire dans le service.

## Docker

Construire l’image :

```bash
docker build --no-cache --tag apha-risk-insights-backend .
```

Lancer le conteneur :

```bash
docker run -e PORT=3001 -p 3001:3001 apha-risk-insights-backend
```

### Docker Compose

Un environnement local comprend :

- Floci pour les services AWS (S3, SQS, SNS, etc.)
- MongoDB
- Ce service

Fichiers Compose :

- `compose.yaml` — services de base, sans ports publiés.
- `compose.override.yaml` — ports hôte pour le développement. Chargé automatiquement par `docker compose up` (sans option `-f`).
- `compose.debug.yaml` — lance le service avec l’inspecteur Node attaché.
- `compose.test.yaml` — lance la suite de tests dans un conteneur dédié, sans ports publiés.
- `compose.test.watch.yaml` — lance la suite de tests en mode watch.

```bash
npm run docker:up        # environnement de développement : API apha + MongoDB + Floci sur 3001/27017/4566
npm run docker:debug     # environnement de développement avec l’inspecteur Node sur 9229
npm run docker:test      # exécution unique des tests, projet isolé, sans conflit de ports avec le développement
npm run docker:test:watch
```

L’environnement de test utilise son propre nom de projet Compose
(`apha-risk-insights-backend-test`). Il peut ainsi fonctionner en parallèle de
l’environnement de développement sans conflit de ports, de noms de conteneurs ou de données MongoDB.

Vous pouvez créer des ressources AWS simulées au démarrage de Floci en modifiant les scripts dans `./compose/floci/start.d/`.
Vous pouvez également créer des enregistrements MongoDB au démarrage de MongoDB en modifiant les scripts dans `./compose/mongo/`.

### Dependabot

Un exemple de fichier de configuration Dependabot est présent dans le dépôt. Pour l’activer,
renommez [.github/example.dependabot.yml](.github/example.dependabot.yml) en `.github/dependabot.yml`.

### SonarCloud

Les instructions de configuration de SonarCloud se trouvent dans [sonar-project.properties](./sonar-project.properties).

## Licence

CES INFORMATIONS SONT SOUMISES AUX CONDITIONS DE L’OPEN GOVERNMENT LICENCE, disponible à l’adresse :

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

L’attribution suivante DOIT être mentionnée dans vos produits et applications lorsque vous utilisez ces informations.

> Contains public sector information licensed under the Open Government license v3

### À propos de la licence

L’Open Government Licence (OGL) a été élaborée par le Controller of Her Majesty's Stationery Office (HMSO) afin de permettre
aux fournisseurs d’informations du secteur public d’autoriser l’utilisation et la réutilisation de leurs informations dans le cadre d’une licence libre commune.

Elle vise à encourager l’utilisation et la réutilisation des informations de manière libre et souple, sous réserve de quelques conditions.
