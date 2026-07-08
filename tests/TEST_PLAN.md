# Test Plan — LLM Man

## 1. Tests Structure HTML
- [ ] DOCTYPE présent ✅
- [ ] Balise html avec lang="fr" ✅
- [ ] data-theme="dark" par défaut ✅
- [ ] Meta viewport responsive ✅
- [ ] 7 sections (accueil, cours, chat, examens, outils, forum, glossaire) ✅

## 2. Tests Navigation
- [ ] Nav links : 8 liens (brand + 7 sections) 
- [ ] Chaque lien pointe vers une section existante
- [ ] Section active = class "active"
- [ ] Theme toggle change l'icône
- [ ] Theme toggle persiste (localStorage)

## 3. Tests Cours
- [ ] 12 chapitres affichés
- [ ] Chapitre 1 ouvert par défaut
- [ ] Click sur header toggle open/close
- [ ] Tags (Débutant, Intermédiaire, Avancé, Expert) visibles

## 4. Tests Chat Professeur
- [ ] Interface de setup API key si pas de clé
- [ ] Champ input clé avec validation
- [ ] Chat container avec header, messages, input
- [ ] Messages bot et user formatés
- [ ] Gestion d'erreur API

## 5. Tests Examens
- [ ] 3 quiz affichés
- [ ] Click "Commencer" lance le quiz
- [ ] Navigation question précédente/suivante
- [ ] Feedback correct/incorrect
- [ ] Score final affiché
- [ ] Refaire / retour fonctionnel

## 6. Tests Outils
- [ ] 3 outils : Prompt Playground, Matrice Évaluation, Détecteur Hallucination
- [ ] Prompt Playground : analyse fonctionnelle
- [ ] Matrice : sliders, score calculé
- [ ] Détecteur : analyse avec/sans contexte

## 7. Tests Forum
- [ ] Formulaire : pseudo + message
- [ ] Publication ajoute un post
- [ ] Persistance localStorage
- [ ] Suppression fonctionnelle
- [ ] Message vide non publié

## 8. Tests Glossaire
- [ ] 47 termes chargés
- [ ] Recherche filtre les résultats
- [ ] Termes cliquables (état hover)

## 9. Tests Responsive
- [ ] Navigation mobile (overflow scroll)
- [ ] Cards en colonne sur mobile
- [ ] Hero responsive

## 10. Tests Non-Régression (TNR)
- [ ] Navigation entre sections : pas d'erreur console
- [ ] Theme preserve après navigation
- [ ] Forum posts preserve après navigation
- [ ] Quiz state preserve
