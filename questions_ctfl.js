// questions_ctfl.js — 40 questions
const QUESTIONS_CTFL = [
 [
  "Lequel des énoncés suivants décrit le mieux l'objectif principal du test logiciel ?",
  [
   "Trouver le maximum de défauts possible",
   "Démontrer que le logiciel fonctionne parfaitement",
   "Réduire le niveau de risque du logiciel",
   "Corriger tous les défauts avant la mise en production"
  ],
  0
 ],
 [
  "Quel principe de test énonce qu'il est impossible de tester toutes les combinaisons d'entrées ?",
  [
   "Les tests exhaustifs sont impossibles",
   "Le regroupement de défauts",
   "Le paradoxe du pesticide",
   "Les tests dépendent du contexte"
  ],
  0
 ],
 [
  "Quelle activité de test consiste à définir l'ordre de priorité des cas de test ?",
  [
   "Analyse et conception",
   "Planification et estimation",
   "Mise en œuvre et exécution",
   "Évaluation des critères de sortie"
  ],
  0
 ],
 [
  "Lequel est un exemple de défaut (bug) ?",
  [
   "Le système plante lors de la connexion",
   "Une ligne de code incorrecte",
   "L'utilisateur ne peut pas finaliser sa commande",
   "Le temps de réponse est trop lent"
  ],
  1
 ],
 [
  "Qu'est-ce que le 'paradoxe du pesticide' en test logiciel ?",
  [
   "Les tests répétés finissent par ne plus trouver de nouveaux défauts",
   "Les pesticides ralentissent l'exécution des tests",
   "Les tests manuels sont plus efficaces",
   "Les défauts sont concentrés dans quelques modules"
  ],
  0
 ],
 [
  "Quel est le rôle principal d'un testeur dans une équipe agile ?",
  [
   "Coder les fonctionnalités",
   "Planifier et exécuter les tests",
   "Gérer l'équipe de développement",
   "Définir les spécifications métier"
  ],
  1
 ],
 [
  "Parmi les activités suivantes, laquelle relève du test de confirmation ?",
  [
   "Exécuter à nouveau les tests après correction d'un défaut",
   "Tester un système complet intégré",
   "Vérifier que les correctifs n'ont pas introduit de régressions",
   "Tester l'interface utilisateur"
  ],
  0
 ],
 [
  "Quel niveau de test vérifie les interactions entre les composants intégrés ?",
  [
   "Test unitaire",
   "Test d'intégration",
   "Test système",
   "Test d'acceptation"
  ],
  1
 ],
 [
  "Quel type de test évalue les attributs comme la performance et la sécurité ?",
  [
   "Test fonctionnel",
   "Test structurel",
   "Test non fonctionnel",
   "Test boîte blanche"
  ],
  2
 ],
 [
  "Quand le test de maintenance doit-il être effectué ?",
  [
   "Uniquement lors de la mise en production initiale",
   "Après chaque modification du logiciel ou de son environnement",
   "Uniquement si des défauts sont signalés",
   "Seulement pour les applications critiques"
  ],
  1
 ],
 [
  "Qu'est-ce qu'un test de bout en bout (end-to-end) ?",
  [
   "Un test qui valide un flux complet",
   "Un test qui ne vérifie qu'une seule fonction",
   "Un test exécuté par l'utilisateur final",
   "Un test automatisé de régression"
  ],
  0
 ],
 [
  "Lequel est un exemple de test statique ?",
  [
   "Exécuter un cas de test",
   "Analyser le code source sans l'exécuter",
   "Mesurer le temps de réponse",
   "Vérifier la couverture de code"
  ],
  1
 ],
 [
  "Quelle revue est généralement dirigée par l'auteur du document ?",
  [
   "Revue technique formelle",
   "Inspection",
   "Relecture par un pair (peer review)",
   "Audit"
  ],
  2
 ],
 [
  "Un système accepte des notes de 0 à 20. Combien de classes d'équivalence valides et invalides ?",
  [
   "1 valide, 1 invalide",
   "1 valide, 2 invalides",
   "2 valides, 1 invalide",
   "2 valides, 2 invalides"
  ],
  1
 ],
 [
  "Pour une saisie de 1 à 100, quelles valeurs tester avec l'analyse des valeurs limites ?",
  [
   "0,1,50,100,101",
   "1,100",
   "0,1,100,101",
   "1,2,99,100"
  ],
  2
 ],
 [
  "Quel est l'avantage des techniques boîte blanche ?",
  [
   "Aucune connaissance du code nécessaire",
   "Garantie une couverture complète du code source",
   "Plus rapides à exécuter",
   "Testent l'interface utilisateur"
  ],
  1
 ],
 [
  "Quel pourcentage de couverture de branche est requis pour un test unitaire critique ?",
  [
   "50%",
   "75%",
   "85%",
   "100%"
  ],
  3
 ],
 [
  "Dans une table de décision, que représente chaque colonne ?",
  [
   "Une condition",
   "Une règle",
   "Une action",
   "Un cas de test"
  ],
  1
 ],
 [
  "Quel est l'objectif des tests basés sur l'expérience ?",
  [
   "Atteindre une couverture de code max",
   "Utiliser l'intuition du testeur pour trouver des défauts",
   "Couvrir tous les chemins",
   "Automatiser tous les scénarios"
  ],
  1
 ],
 [
  "Laquelle est une technique boîte noire ?",
  [
   "Couverture de branche",
   "Couverture de déclaration",
   "Partitionnement d'équivalence",
   "Couverture de chemin"
  ],
  2
 ],
 [
  "Qu'est-ce qu'un risque de produit en test ?",
  [
   "Le risque qu'un test échoue",
   "Un défaut grave présent dans le logiciel livré",
   "Le dépassement de budget",
   "Le manque de formation"
  ],
  1
 ],
 [
  "Quand un test est-il considéré comme réussi ?",
  [
   "Résultat réel = résultat attendu",
   "Aucun défaut trouvé",
   "Le test s'exécute sans erreur",
   "Le temps est inférieur au seuil"
  ],
  0
 ],
 [
  "Quel est le premier état d'un défaut après son rapport ?",
  [
   "Fermé",
   "En cours",
   "Ouvert",
   "Résolu"
  ],
  2
 ],
 [
  "Quel critère peut indiquer que les tests peuvent être arrêtés ?",
  [
   "Tous les cas ont été exécutés",
   "Le taux de défauts critiques est sous le seuil acceptable",
   "Le budget est épuisé",
   "Le développeur a fini le codage"
  ],
  1
 ],
 [
  "Qu'est-ce que le test monitoring ?",
  [
   "La création de cas de test",
   "L'évaluation continue de l'état des activités de test",
   "L'exécution des tests automatisés",
   "La correction des défauts"
  ],
  1
 ],
 [
  "Quel risque est associé à l'automatisation des tests ?",
  [
   "Les tests automatisés sont plus lents",
   "L'automatisation peut créer des faux positifs",
   "Tous les tests peuvent être automatisés",
   "Pas de maintenance nécessaire"
  ],
  1
 ],
 [
  "Quel outil est utilisé pour la gestion des tests ?",
  [
   "Compilateur",
   "Outil de gestion des cas de test",
   "Débogueur",
   "Analyseur de performance"
  ],
  1
 ],
 [
  "Quel avantage offre un outil de gestion de configuration ?",
  [
   "Exécute automatiquement les tests",
   "Assure la traçabilité et le versionnage",
   "Génère les cas de test",
   "Calcule la couverture de code"
  ],
  1
 ],
 [
  "Quand l'automatisation des tests de régression est-elle la plus bénéfique ?",
  [
   "Tests exécutés une seule fois",
   "Tests fréquemment répétés sur des versions",
   "Tests exploratoires",
   "Tests d'acceptation"
  ],
  1
 ],
 [
  "Combien de tests pour couvrir toutes les transitions avec 3 états totalement connectés ?",
  [
   "3",
   "6",
   "9",
   "12"
  ],
  1
 ],
 [
  "Quel est l'objectif du test d'acceptation utilisateur (UAT) ?",
  [
   "Trouver le max de défauts",
   "Vérifier les interactions entre composants",
   "Valider que le système répond aux besoins métier",
   "Tester la performance"
  ],
  2
 ],
 [
  "Quelle est la différence entre un défaut et une défaillance ?",
  [
   "Identiques",
   "Défaut=erreur dans le code ; Défaillance=comportement incorrect observé",
   "Défaut=observé en test ; Défaillance=observé en prod",
   "Un défaut est plus grave"
  ],
  1
 ],
 [
  "Quelle stratégie priorise les tests sur les fonctionnalités critiques ?",
  [
   "Test exhaustif",
   "Test basé sur le risque",
   "Test de régression",
   "Test exploratoire"
  ],
  1
 ],
 [
  "Quelle technique est appropriée pour valider le respect d'une spécification ?",
  [
   "Test exploratoire",
   "Test boîte noire",
   "Test boîte blanche",
   "Test de performance"
  ],
  1
 ],
 [
  "Quand le test de régression doit-il être exécuté ?",
  [
   "Fin de cycle uniquement",
   "Après chaque correction ou modification significative",
   "Si le budget le permet",
   "Avant les tests fonctionnels"
  ],
  1
 ],
 [
  "Qu'est-ce qu'un oracle de test ?",
  [
   "Outil de test automatisé",
   "Source fiable pour déterminer le résultat attendu",
   "Test exécuté par un oracle",
   "Test de base de données"
  ],
  1
 ],
 [
  "Quel est l'objectif du test de charge ?",
  [
   "Trouver des défauts fonctionnels",
   "Vérifier le comportement sous volume d'utilisateurs attendu",
   "Tester la sécurité",
   "Vérifier la compatibilité navigateur"
  ],
  1
 ],
 [
  "À quoi les tests d'intégration sont-ils associés dans le cycle en V ?",
  [
   "Conception détaillée",
   "Conception architecturale",
   "Analyse des besoins",
   "Codage"
  ],
  1
 ],
 [
  "Lequel n'est pas un critère de sortie typique ?",
  [
   "Couverture de code atteinte",
   "Nombre de défauts résiduels estimé",
   "Nombre de lignes de code écrites",
   "Tests planifiés exécutés"
  ],
  2
 ],
 [
  "Quelle est la séquence correcte de gestion des défauts ?",
  [
   "Détection,Correction,Vérification,Clôture",
   "Détection,Rapport,Tri,Analyse,Correction,Confirmation,Clôture",
   "Rapport,Analyse,Correction,Test",
   "Tri,Correction,Vérification,Clôture"
  ],
  1
 ]
];
