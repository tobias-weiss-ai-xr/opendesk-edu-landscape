# openDesk Edu Landscape — Continuation Handoff

> **Erstellt:** 2026-07-14
> **Zweck:** Aufräumpunkt vor Ende des Open-Source-Wettbewerbs.
> **Nächster Schritt:** Nach Wettbewerbsende hier weitermachen.

---

## Aktueller Stand (produktiv auf landscape.opendesk-edu.org)

| Metrik | Wert |
|---|---|
| Services | 49 |
| Kategorien | 11 |
| Subkategorien | 26 |
| Logos | 31/49 |
| Metadata docs_url | 49/49 |
| Metadata stars | 49/49 |
| Metadata organization | 49/49 |
| Metadata language | 49/49 |
| Tags (edu) | 49/49 |

**Features:** Theme Toggle, Detail Modal, CSV/JSON Export, Maturity Filter, Category Nav, Keyboard Shortcuts, Skeleton Loading, Empty State, Card Animationen, Responsive Design, Light/Dark Theme.

---

## Offene Tasks (nach Priorität)

### 1. Service Descriptions standardisieren
**Plan:** `docs/superpowers/plans/2026-07-14-landscape-improvements-round3.md` — Task 1

**Problem:** Beschreibungen sind inkonsistent (manche 1-zeilig, manche Absätze).
**Lösung:** Alle 49 Beschreibungen in 2-Satz-Format:
1. Was: Technische Zusammenfassung
2. Warum Bildung: Nutzen für Bildungseinrichtungen

**Datei:** `data/services.yaml` (49 Einträge)

### 2. Fehlende Logos besorgen (18 Stück)
**Plan:** Selbe Datei — Task 2

| Service | Kategorie |
|---|---|
| Collabora Online | Content & Collaboration |
| Draw.io | Content & Collaboration |
| Etherpad | Content & Collaboration |
| Notes (im.press) | Content & Collaboration |
| Nubus | Identity & Access |
| OpenCloud | Content & Collaboration |
| OpenLDAP | Identity & Access |
| OX App Suite | Communication |
| Pa11y | Accessibility & Inclusion |
| Planka | Project Management |
| Postfix | Communication |
| Prometheus | Operations & Infrastructure |
| Restic (k8up) | Operations & Infrastructure |
| Self-Service Password | Identity & Access |
| SOGo | Communication |
| Woodpecker CI | Development & DevOps |
| XWiki | Learning Management |
| Zammad | Communication |

**Quelle:** `https://cdn.simpleicons.org/icons/{name}.svg`
**Alternative:** GitHub-Repo-SVG, manueller Download.

### 3. Category Nav Description Tooltips
**Plan:** Selbe Datei — Task 4

**1 Zeile in `script.js`:** `title="${cat.description}"` in `renderCategoryNav()` ergänzen.

---

## Nützliche Befehle

```bash
# Build (YAML → JS generieren + validieren)
npm run build

# Neuen Service-Hash für Filter nutzen
# (Hash fuer Farbe der Initial-Fallback-Logos)
```

---

## Links

- **Produktiv:** https://landscape.opendesk-edu.org
- **Repo:** https://codeberg.org/opendesk-edu/opendesk-edu-landscape
- **Spec:** https://github.com/opendesk-edu/opendesk-edu-spec
