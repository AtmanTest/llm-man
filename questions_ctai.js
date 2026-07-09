// questions_ctai.js — 40 questions
const QUESTIONS_CTAI = [
 [
  "Quelle est la différence entre un système IA et un logiciel traditionnel du point de vue tests ?",
  [
   "Les systèmes IA sont plus simples",
   "Comportement probabiliste et non-déterministe",
   "Pas de tests nécessaires",
   "Toujours plus fiables"
  ],
  1
 ],
 [
  "Quel est un exemple d'apprentissage supervisé ?",
  [
   "Recommandation non supervisée",
   "Classifieur entraîné avec données étiquetées",
   "Clustering k-means",
   "GAN"
  ],
  1
 ],
 [
  "Qu'est-ce que l'apprentissage par renforcement ?",
  [
   "Données étiquetées",
   "Essais/erreurs avec récompenses",
   "Apprentissage sans données",
   "Supervisé avec boucles"
  ],
  1
 ],
 [
  "Quelle norme ISO définit les caractéristiques qualité pour les systèmes IA ?",
  [
   "ISO 9001",
   "ISO 25059",
   "ISO 27001",
   "ISO 12207"
  ],
  1
 ],
 [
  "Quel est le principal défi de qualité des données ML ?",
  [
   "Volume toujours suffisant",
   "Les biais dans les données peuvent être amplifiés",
   "Pas d'impact sur la qualité",
   "Format JSON obligatoire"
  ],
  1
 ],
 [
  "Qu'est-ce que le biais algorithmique ?",
  [
   "Erreur de calcul",
   "Distorsion systématique due à des données ou conceptions biaisées",
   "Type de test spécifique",
   "Paramètre de configuration"
  ],
  1
 ],
 [
  "Quelle métrique évalue la performance d'un classifieur ?",
  [
   "MSE",
   "Matrice de confusion",
   "R²",
   "Perte d'entropie croisée"
  ],
  1
 ],
 [
  "Que représente un faux positif (FP) dans une matrice de confusion ?",
  [
   "Cas négatif correctement identifié",
   "Cas négatif classifié comme positif",
   "Cas positif correctement identifié",
   "Cas positif classifié comme négatif"
  ],
  1
 ],
 [
  "Quelle est la formule de la précision (precision) ?",
  [
   "TP/(TP+FP)",
   "TP/(TP+FN)",
   "(TP+TN)/total",
   "TP/(FP+FN)"
  ],
  0
 ],
 [
  "Quelle est la formule du rappel (recall) ?",
  [
   "TP/(TP+FP)",
   "TP/(TP+FN)",
   "(TP+TN)/total",
   "TN/(TN+FP)"
  ],
  1
 ],
 [
  "Quelle est la formule du F1-score ?",
  [
   "(p*r)/(p+r)",
   "2*(p*r)/(p+r)",
   "(p+r)/2",
   "1-(p*r)"
  ],
  1
 ],
 [
  "TP=80, TN=50, FP=20, FN=30. Quelle est l'exactitude (accuracy) ?",
  [
   "72%",
   "65%",
   "80%",
   "62%"
  ],
  0
 ],
 [
  "Qu'est-ce que le surapprentissage (overfitting) ?",
  [
   "Modèle trop simple",
   "Modèle apprend trop bien les données d'entraînement au détriment de la généralisation",
   "Pas de convergence",
   "Trop peu de paramètres"
  ],
  1
 ],
 [
  "Comment détecter le surapprentissage ?",
  [
   "Accuracy élevée en entraînement, faible en test",
   "Accuracy faible en entraînement, élevée en test",
   "Perte élevée partout",
   "Modèle ne converge pas"
  ],
  0
 ],
 [
  "Quel est le défi du test des LLMs comparé au logiciel traditionnel ?",
  [
   "Déterministe",
   "Comportement non-déterministe nécessite métriques statistiques et évaluation humaine",
   "Ne peuvent pas être testés",
   "Ne produisent jamais d'erreurs"
  ],
  1
 ],
 [
  "Qu'est-ce que le red teaming pour les LLMs ?",
  [
   "Correction du modèle",
   "Attaque simulée pour identifier les vulnérabilités",
   "Méthode d'entraînement",
   "Type de prompt"
  ],
  1
 ],
 [
  "Quelle technique teste la non-divulgation d'informations sensibles ?",
  [
   "Test de charge",
   "Test d'extraction de prompt",
   "Test de régression",
   "Test unitaire"
  ],
  1
 ],
 [
  "Qu'est-ce qu'une hallucination dans un LLM ?",
  [
   "Faux positif de classification",
   "Réponse contenant des informations fausses ou inventées",
   "Erreur de syntaxe",
   "Arrêt prématuré"
  ],
  1
 ],
 [
  "Quels types d'hallucinations sont observés dans les LLMs ?",
  [
   "Factuelles, logiques, instructionnelles, contextuelles",
   "Uniquement factuelles",
   "Uniquement contextuelles",
   "Syntaxiques et sémantiques"
  ],
  0
 ],
 [
  "Qu'est-ce que la faithfulness dans l'évaluation RAG ?",
  [
   "Vitesse de réponse",
   "Fidélité de la réponse au contexte fourni",
   "Précision du classifieur",
   "Couverture des documents"
  ],
  1
 ],
 [
  "Quelle approche détecte les hallucinations par comparaison de réponses multiples ?",
  [
   "SelfCheckGPT",
   "Test unitaire",
   "Revue de code",
   "Analyse statique"
  ],
  0
 ],
 [
  "Quel est le but du test d'un système RAG ?",
  [
   "Tester la base de données",
   "Vérifier la fidélité au contexte et la pertinence des documents retrouvés",
   "Tester la vitesse réseau",
   "Tester l'interface"
  ],
  1
 ],
 [
  "Quelle métrique RAGAS évalue si tous les chunks pertinents sont récupérés ?",
  [
   "Answer Relevancy",
   "Context Precision",
   "Context Recall",
   "Faithfulness"
  ],
  2
 ],
 [
  "Pourquoi séparer données d'entraînement et de test en ML ?",
  [
   "Réduire la taille des données",
   "Éviter le surapprentissage et obtenir une évaluation fiable",
   "Accélérer l'entraînement",
   "Réduire les coûts"
  ],
  1
 ],
 [
  "Qu'est-ce qu'un jeu de validation en ML ?",
  [
   "Identique au test",
   "Données pour ajuster les hyperparamètres",
   "Données pour l'entraînement uniquement",
   "Données non étiquetées"
  ],
  1
 ],
 [
  "Quand le test d'un pipeline ML doit-il commencer ?",
  [
   "Après déploiement",
   "Dès la collecte et préparation des données",
   "Après l'entraînement",
   "Après mise en production"
  ],
  1
 ],
 [
  "Qu'est-ce que le test de données (data testing) en ML ?",
  [
   "Tester la BDD relationnelle",
   "Vérifier qualité, complétude et absence de biais dans les données d'entraînement",
   "Tester les requêtes SQL",
   "Tester les sauvegardes"
  ],
  1
 ],
 [
  "Quel test vérifie les transformations de données ?",
  [
   "Test du pipeline de données",
   "Test de charge",
   "Test de sécurité",
   "Test d'intégration"
  ],
  0
 ],
 [
  "Comment la dérive de données (data drift) est-elle testée ?",
  [
   "Comparaison des distributions statistiques entre entraînement et production",
   "Tests de régression",
   "Réentraînement",
   "Augmentation du volume"
  ],
  0
 ],
 [
  "Qu'est-ce qu'un test A/B pour un système IA ?",
  [
   "Comparaison de deux versions du modèle sur des utilisateurs réels",
   "Test de régression automatique",
   "Test d'interface",
   "Test de performance serveur"
  ],
  0
 ],
 [
  "Quel est l'avantage de l'approche shift-left dans le test IA ?",
  [
   "Réduire les coûts en détectant les problèmes plus tôt",
   "Accélérer la mise en production",
   "Réduire le nombre de tests",
   "Éliminer les tests d'acceptation"
  ],
  0
 ],
 [
  "Quel est l'impact de la température sur les réponses d'un LLM ?",
  [
   "Aucun effet",
   "Haute température = réponses créatives mais moins reproductibles",
   "Réduit les hallucinations",
   "Contrôle la longueur"
  ],
  1
 ],
 [
  "Qu'est-ce qu'une injection de prompt (prompt injection) ?",
  [
   "Technique pour améliorer les prompts",
   "Attaque avec instructions malveillantes dans l'entrée",
   "Méthode de fine-tuning",
   "Test de performance"
  ],
  1
 ],
 [
  "Qu'est-ce qu'un jailbreak de LLM ?",
  [
   "Mise à jour de sécurité",
   "Contournement des garde-fous éthiques et de sécurité",
   "Technique d'entraînement",
   "Type d'architecture"
  ],
  1
 ],
 [
  "Quelles métriques évaluent un système Q&A basé sur LLM ?",
  [
   "Précision et rappel",
   "BLEU, ROUGE, faithfulness",
   "Temps de réponse uniquement",
   "Couverture de code"
  ],
  1
 ],
 [
  "Comment le chain-of-thought aide-t-il au test des LLMs ?",
  [
   "Réduit le temps de réponse",
   "Améliore la traçabilité du raisonnement, facilitant l'identification d'erreurs",
   "Augmente la température",
   "Limite les tokens"
  ],
  1
 ],
 [
  "Quel est l'objectif des guardrails dans un système LLM ?",
  [
   "Accélérer l'inférence",
   "Filtrer entrées/sorties pour bloquer contenus dangereux",
   "Augmenter le contexte",
   "Améliorer les embeddings"
  ],
  1
 ],
 [
  "Pourquoi la validation du format de sortie est-elle cruciale ?",
  [
   "Les LLMs produisent toujours le bon format",
   "Pour garantir que la sortie peut être traitée par les systèmes en aval",
   "Le format n'a pas d'importance",
   "Tous les LLMs utilisent le même format"
  ],
  1
 ],
 [
  "Quel outil open-source évalue spécifiquement les systèmes RAG ?",
  [
   "Selenium",
   "RAGAS",
   "JUnit",
   "JMeter"
  ],
  1
 ],
 [
  "Comment tester un système de modération basé sur LLM ?",
  [
   "Tester uniquement les contenus autorisés",
   "Créer un dataset de contenus inappropriés et vérifier le taux de blocage",
   "Ne pas tester",
   "Utiliser des contenus génériques"
  ],
  1
 ]
];
