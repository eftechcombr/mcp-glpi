---
slug: api-endpoints
category: features
generatedAt: 2026-07-09T23:58:35.846Z
relevantFiles:
  - src/search.ts
  - src/glpi-client.ts
  - src/http.ts
---

# API Endpoints

## Base URL

All requests go to `<GLPI_URL>/api.php/<path>`.

## Endpoints used

| Path | Method | Purpose |
|---|---|---|
| `/api.php/token` | POST | OAuth2 token (password / client_credentials) |
| `/api.php/session` | GET | Active profile, entities, permissions |
| `/api.php/Assistance/Ticket` | GET / POST | CRUD + search with RSQL `filter` param |
| `/api.php/Assistance/Problem` | GET / POST | Problem CRUD |
| `/api.php/Assistance/Change` | GET / POST | Change CRUD |
| `/api.php/Assets/Computer` | GET / POST | Computer CRUD |
| `/api.php/Assets/Monitor` | GET / POST | Monitor CRUD |
| `/api.php/Assets/Printer` | GET / POST | Printer CRUD |
| `/api.php/Assets/Phone` | GET / POST | Phone CRUD |
| `/api.php/Assets/NetworkEquipment` | GET / POST | Network equipment CRUD |
| `/api.php/Assets/Software` | GET / POST | Software CRUD |
| `/api.php/Administration/User` | GET / POST | User CRUD |
| `/api.php/Administration/Group` | GET / POST | Group CRUD |
| `/api.php/Administration/Entity` | GET | Entity listing |
| `/api.php/Dropdowns/ITILCategory` | GET | Category listing |
| `/api.php/Management/Contract` | GET / POST | Contract CRUD |
| `/api.php/Management/Supplier` | GET / POST | Supplier CRUD |
| `/api.php/Management/Document` | GET | Document listing |
| `/api.php/Dropdowns/Location` | GET / POST | Location CRUD |
| `/api.php/Knowledgebase/Article` | GET / POST | KB article CRUD |
| `/api.php/Project/Project` | GET / POST | Project CRUD |

## Search (RSQL)

GLPI 11 uses **RSQL** (RESTful SQL Query Language) for filtering. The `filter`
query parameter supports:

| Operator | Meaning |
|---|---|
| `==` | equals |
| `!=` | not equals |
| `=lt=` | less than |
| `=gt=` | greater than |
| `=le=` | less or equal |
| `=ge=` | greater or equal |
| `==*val*` | contains (wildcard) |
| `;` | AND |
| `,` | OR |

Example: `filter=status=lt=5;name==*test*`

## Pagination

List endpoints use `start` and `limit` query parameters. The `Content-Range`
response header provides the total count.
