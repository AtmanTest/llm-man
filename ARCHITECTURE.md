# LLM Man — Architecture & Plan

## 1. Architecture

### Stack technique
- **Frontend :** HTML5 + CSS3 + JavaScript vanilla (SPA)
- **Déploiement :** GitHub Pages (AtmanTest.github.io/llm-man)
- **API externe :** NVIDIA integrate.api.nvidia.com/v1 (Nemotron-3-Ultra)
- **Stockage :** localStorage (forum, quiz progress, préférences)
- **Pas de backend** — tout est statique côté client

### Arborescence
```
llm-man/
├── index.html              # Entry point unique (SPA)
├── README.md
├── tests/
│   └── test-plan.md        # Stratégie de test
└── .github/
    └── workflows/
        └── test-deploy.yml # CI test avant déploiement
```

### Modules (sections de la SPA)
1. **Accueil** — Hero, présentation, navigation
2. **Cours** — Parcours complet Zéro → Hero (10+ chapitres)
3. **Chat Professeur** — Assistant IA avec Nemotron-3-Ultra
4. **Examens** — QCM, mises en situation, certifications
5. **Forum** — Discussions, questions/réponses
6. **Glossaire** — +200 termes avec recherche
7. **Outils interactifs** — Prompt playground, évaluateur LLM, comparateur

## 2. User Stories

| ID | User Story | Priorité | Sprint |
|---|---|---|---|
| US-01 | En tant qu'apprenant, je veux un parcours zéro-to-hero structuré | P0 | 1 |
| US-02 | En tant qu'apprenant, je veux un mode dark/light | P0 | 1 |
| US-03 | En tant qu'apprenant, je veux tester mes connaissances via des QCM | P0 | 1 |
| US-04 | En tant qu'apprenant, je veux discuter avec un prof IA | P0 | 1 |
| US-05 | En tant qu'apprenant, je veux un glossaire complet | P1 | 1 |
| US-06 | En tant qu'apprenant, je veux un forum pour échanger | P1 | 1 |
| US-07 | En tant qu'apprenant, je veux un outil pour tester des prompts | P2 | 2 |
| US-08 | En tant que QA, je veux des exemples concrets de tests LLM | P0 | 1 |

## 3. Stratégie de test

### Tests fonctionnels (TNR avant chaque push)
- [ ] Navigation : tous les liens internes fonctionnent
- [ ] Dark/Light mode : toggle fonctionne, persistence localStorage
- [ ] Chat IA : envoi message, réception réponse, gestion erreur
- [ ] Quiz : soumission, score, feedback, réinitialisation
- [ ] Forum : CRUD messages, persistence
- [ ] Glossaire : recherche, filtres, responsive
- [ ] Responsive : mobile, tablette, desktop
- [ ] Formulaires : validation champs vides, XSS, longueur max

### Tests non-régression
- [ ] Navigation entre sections — pas de perte d'état
- [ ] Mode dark/light preserve après rechargement
- [ ] Quiz scores conservés après navigation
- [ ] Chat historique conservé dans la session
