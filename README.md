# Mon Budget

Application de budget personnel installable (Android, iPhone, Windows), qui fonctionne hors connexion.

Éditions (même code, données séparées) :
- `Budget_GFib/` — https://gytube-lab.github.io/monbudget/Budget_GFib/
- `Budget_BHoff/` — https://gytube-lab.github.io/monbudget/Budget_BHoff/ (démarre vierge)
- `v2/` — ancienne adresse, identique à Budget_GFib (mêmes données).

Le code commun est dans `src/`. `python3 build_editions.py` fabrique les dossiers des éditions
(réglages dans `edition.js` : nom, stockage local, fichier Google Drive).

Aucune donnée personnelle n'est stockée dans ce dépôt : les données restent sur l'appareil de chaque utilisateur et dans son propre Google Drive.
