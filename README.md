# Mon Budget

Application de budget personnel installable (Android, iPhone, Windows), qui fonctionne hors connexion.

Chaque édition a son propre dossier (`budget-1/`, `budget-2/`…) : même code, données séparées.
`v2/` est l'ancienne adresse de la première édition.

Le code commun est dans `src/`. `python3 build_editions.py` fabrique les dossiers des éditions
(réglages dans `edition.js` : nom, stockage local, fichier Google Drive).

Aucune donnée personnelle n'est stockée dans ce dépôt : les données restent sur l'appareil de chaque utilisateur et dans son propre Google Drive.
