// questions_ctgenai.js — 40 questions
const QUESTIONS_CTGENAI = [
 [
  "Quel est l'avantage des LLMs pour la génération de cas de test ?",
  [
   "Toujours corrects",
   "Génération rapide depuis des spécifications en langage naturel",
   "Remplacement complet du testeur",
   "Aucune vérification nécessaire"
  ],
  1
 ],
 [
  "Comment un LLM assiste-t-il dans la création de données de test ?",
  [
   "Données aléatoires",
   "Génération de données synthétiques réalistes",
   "Impossible de générer des données",
   "Copie des données de production"
  ],
  1
 ],
 [
  "Quel risque avec un LLM générant des tests sans vérification humaine ?",
  [
   "Tests trop longs",
   "Tests contenant des erreurs logiques ou étapes impossibles",
   "Tests toujours redondants",
   "Tests difficiles à lire"
  ],
  1
 ],
 [
  "Pour quel type de test les LLMs sont-ils particulièrement efficaces ?",
  [
   "Test de performance",
   "Régression et génération de cas depuis des spécifications",
   "Test de charge",
   "Test de sécurité réseau"
  ],
  1
 ],
 [
  "Qu'est-ce que le prompt engineering ?",
  [
   "Technique d'entraînement",
   "Formuler des instructions pour obtenir le résultat désiré",
   "Type d'architecture de réseau",
   "Outil de performance"
  ],
  1
 ],
 [
  "Quel est le défi principal du test d'un système basé sur LLM ?",
  [
   "Déterministe et prévisible",
   "Non-déterministe : difficile de définir des résultats attendus précis",
   "Ne peut pas être testé automatiquement",
   "Pas de cycle de vie"
  ],
  1
 ],
 [
  "Comment tester un LLM face à des entrées adversariales ?",
  [
   "Utiliser uniquement des entrées normales",
   "Dataset d'entrées conçues pour tromper le modèle",
   "Augmenter la température",
   "Réduire les tokens"
  ],
  1
 ],
 [
  "Pourquoi le test de robustesse est-il crucial pour les LLMs ?",
  [
   "Les LLMs sont naturellement robustes",
   "De petites variations d'entrée peuvent produire des sorties dangereuses",
   "La robustesse n'est pas testable",
   "Les LLMs ne peuvent pas échouer"
  ],
  1
 ],
 [
  "Qu'est-ce que la dérive de modèle (model drift) ?",
  [
   "Amélioration continue",
   "Changement du comportement au fil du temps sans modification",
   "Type de fine-tuning",
   "Technique de test"
  ],
  1
 ],
 [
  "Comment tester la confidentialité dans un système LLM ?",
  [
   "Ne tester que les fonctionnalités",
   "Vérifier l'absence de divulgation de données via des attaques d'extraction",
   "Tester uniquement la vitesse",
   "Supprimer les données de test"
  ],
  1
 ],
 [
  "Quel test est essentiel pour un système RAG basé sur LLM ?",
  [
   "Vitesse réseau",
   "Fidélité (faithfulness) : le modèle ne contredit pas les sources",
   "Compilation",
   "Base de données"
  ],
  1
 ],
 [
  "Qu'est-ce qu'un test de chaîne pour un agent LLM ?",
  [
   "Test de files d'attente",
   "Vérification du comportement d'une séquence orchestrée par un LLM",
   "Test de performance réseau",
   "Test de sécurité blockchain"
  ],
  1
 ],
 [
  "Quel est le risque principal des agents LLM autonomes ?",
  [
   "Trop lents",
   "Boucles infinies ou actions non désirées sans supervision",
   "Ne peuvent pas exécuter de tâches",
   "Trop faciles à configurer"
  ],
  1
 ],
 [
  "Comment tester la gestion d'erreur d'un agent quand un outil échoue ?",
  [
   "Tester uniquement les succès",
   "Simuler l'échec et vérifier la récupération ou l'alerte",
   "Ignorer les erreurs",
   "Redémarrer l'agent"
  ],
  1
 ],
 [
  "Qu'est-ce qu'un timeout test pour un agent LLM ?",
  [
   "Vérifie l'arrêt après un temps défini sans accomplissement",
   "Test de performance réseau",
   "Test de temps de réponse",
   "Test de durée d'entraînement"
  ],
  0
 ],
 [
  "Comment tester la mémoire d'un agent LLM ?",
  [
   "Ne pas tester",
   "Vérifier que les infos données plus tôt sont correctement utilisées",
   "Tester la mémoire cache",
   "Tester le stockage"
  ],
  1
 ],
 [
  "Comment valider qu'un agent utilise le bon outil ?",
  [
   "Supposer un choix correct",
   "Donner une tâche nécessitant un outil spécifique et vérifier l'appel",
   "Désactiver tous les outils sauf un",
   "N'utiliser qu'un outil"
  ],
  1
 ],
 [
  "Quel est le défi du test multi-agents ?",
  [
   "Les agents sont toujours d'accord",
   "Comportements émergents imprévus dus à la coordination",
   "Les agents ne communiquent pas",
   "Le test multi-agents est plus simple"
  ],
  1
 ],
 [
  "Qu'est-ce qu'un handoff entre agents ?",
  [
   "Passage d'une tâche d'un agent à un autre",
   "Fin d'exécution",
   "Redémarrage",
   "Mise à jour"
  ],
  0
 ],
 [
  "Quelle métrique évalue la qualité d'un résumé généré par LLM ?",
  [
   "Précision",
   "ROUGE et/ou BERTScore",
   "Temps de réponse",
   "Nombre de tokens"
  ],
  1
 ],
 [
  "Qu'est-ce que la métrique BLEU ?",
  [
   "Rappel des n-grammes pour résumé",
   "Précision des n-grammes pour traduction",
   "Performance du modèle",
   "Qualité des données"
  ],
  1
 ],
 [
  "Qu'est-ce que la métrique ROUGE ?",
  [
   "Précision des n-grammes",
   "Rappel des n-grammes pour résumé",
   "Vitesse",
   "Fiabilité"
  ],
  1
 ],
 [
  "Comment évaluer la pertinence d'une réponse d'un chatbot LLM ?",
  [
   "Temps de réponse uniquement",
   "Évaluations humaines + métriques automatisées (pertinence, complétude)",
   "Nombre de mots",
   "Grammaire"
  ],
  1
 ],
 [
  "Quel risque juridique avec les LLMs ?",
  [
   "Coût d'utilisation",
   "Contenu pouvant violer droits d'auteur ou réglementations",
   "Lenteur",
   "Taille du modèle"
  ],
  1
 ],
 [
  "Comment tester les biais d'un LLM ?",
  [
   "Les biais ne peuvent pas être testés",
   "Jeux de test couvrant différents groupes démographiques + analyse des disparités",
   "Tester uniquement les fonctionnalités",
   "Ignorer les biais"
  ],
  1
 ],
 [
  "Qu'est-ce que le hallucination budget ?",
  [
   "Coût des hallucinations",
   "Taux maximal d'hallucination acceptable",
   "Budget de correction",
   "Nombre d'hallucinations/jour"
  ],
  1
 ],
 [
  "Pourquoi le TNR est-il important pour un LLM en production ?",
  [
   "Les LLMs ne changent jamais",
   "Le comportement peut changer lors de mises à jour du modèle/prompt/RAG",
   "Pas nécessaire",
   "Les LLMs s'améliorent toujours"
  ],
  1
 ],
 [
  "Quel premier remède face à un taux d'hallucination élevé ?",
  [
   "Changer de modèle",
   "Réduire température, améliorer prompt, vérifier la qualité du contexte RAG",
   "Augmenter les tokens",
   "Désactiver les guardrails"
  ],
  1
 ],
 [
  "Qu'est-ce que l'approche human-in-the-loop pour les LLMs ?",
  [
   "Entièrement automatisé",
   "Validation humaine des actions critiques avant exécution",
   "Technique de prompt",
   "Méthode d'entraînement"
  ],
  1
 ],
 [
  "Quel est l'avantage du A/B testing pour les LLMs ?",
  [
   "Comparaison objective de deux versions sur des métriques réelles",
   "Plus rapide que les tests unitaires",
   "Pas de données de test nécessaire",
   "Remplace tous les autres tests"
  ],
  0
 ],
 [
  "Qu'est-ce qu'un benchmark LLM comme MMLU ?",
  [
   "Outil de déploiement",
   "Jeu de test standardisé pour évaluer les capacités",
   "Framework de fine-tuning",
   "Type de garde-fou"
  ],
  1
 ],
 [
  "Comment tester la reproductibilité des réponses d'un LLM ?",
  [
   "Toujours reproductibles",
   "Même prompt plusieurs fois à température=0, comparer les sorties",
   "Pas testable",
   "Utiliser un modèle différent"
  ],
  1
 ],
 [
  "Quel est l'impact d'une modification du prompt système ?",
  [
   "Aucun",
   "Change fondamentalement les réponses, nécessite revalidation complète",
   "Seule la première réponse affectée",
   "Format de sortie uniquement"
  ],
  1
 ],
 [
  "Quelle stratégie pour valider un pipeline CI/CD de LLM ?",
  [
   "Tester uniquement en production",
   "Benchmark de non-régression à chaque étape",
   "Ne pas tester",
   "Après déploiement uniquement"
  ],
  1
 ],
 [
  "Comment tester les performances d'un LLM ?",
  [
   "TTFT et tokens/s sous différentes charges",
   "Nombre de mots par réponse",
   "Taille du modèle",
   "Test avec un seul utilisateur"
  ],
  0
 ],
 [
  "Qu'est-ce qu'un oracle de test pour un LLM sans réponse unique correcte ?",
  [
   "Pas d'oracle possible",
   "Modèle de référence, évaluateur automatisé ou jugement humain",
   "Base de données",
   "Test impossible"
  ],
  1
 ],
 [
  "Pourquoi la validation du format de sortie est-elle importante ?",
  [
   "Les LLMs produisent toujours le bon format",
   "Pour garantir le parsing par les systèmes en aval",
   "Sans importance",
   "Même format partout"
  ],
  1
 ],
 [
  "Quel outil open-source évalue les systèmes RAG ?",
  [
   "Selenium",
   "RAGAS",
   "JUnit",
   "JMeter"
  ],
  1
 ],
 [
  "Qu'est-ce qu'un test de robustesse pour un prompt ?",
  [
   "Vérifier la grammaire",
   "Tester des variations du prompt (synonymes, fautes) et vérifier la stabilité",
   "Tester la vitesse",
   "Compter les mots"
  ],
  1
 ],
 [
  "Comment valider les capacités de raisonnement d'un LLM ?",
  [
   "Questions à choix multiples",
   "Chaînes de syllogismes et problèmes logiques avec vérification des étapes",
   "Questions oui/non",
   "Tests de rapidité"
  ],
  1
 ]
];
