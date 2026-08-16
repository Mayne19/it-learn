# Plan — Mode "Révision quotidienne" (`/etude`)

Statut : proposition, en réflexion. Rien n'est encore implémenté.
Dernière mise à jour : 2026-08-16.

## 1. Objectif

Aujourd'hui IT Lernen (nom de code `java-learn`) couvre bien la **phase Klausur** :
révision intensive avant l'examen, avec une Klausur blanche complète (90 points,
format réel) et des exercices générés sur des chapitres écrits à la main
(`lib/chapters/*.ts`, 3 cours actuellement : Java, Langages dynamiques,
Projektmanagement).

L'objectif de ce plan est différent et complémentaire : un mode
**d'apprentissage au jour le jour**, dès que les nouveaux cours du semestre
arrivent, avec :

- upload de tes vrais supports de cours (PDF complet en début de semestre,
  ou Vorlesung par Vorlesung au fil du temps selon les profs),
- détection automatique du type de cours (programmation vs théorique vs
  mixte) pour proposer des exercices pertinents,
- un cours détaillé qui couvre *vraiment tout*, avec exemples concrets et
  méthodes simples de compréhension (pas juste un résumé de 3 minutes),
- une Lernkartei avec répétition espacée (SM-2),
- des exercices plus variés et plus ludiques ("fun") que les 6 types actuels,
- une gestion des coûts IA maîtrisée (cache + choix de modèle par tâche).

## 1bis. Principe directeur : l'algorithme porte le système, l'IA le nourrit

Le système ne doit **pas dépendre uniquement de l'IA**. Beaucoup de ce qui
fait qu'une app de révision est utile — savoir *quand* réviser, *quoi*
proposer, *dans quel ordre* — est un problème algorithmique classique, pas
un problème de génération de texte. L'IA est réservée à ce qu'elle seule
peut faire (comprendre un PDF de cours, rédiger une explication, générer
des variantes d'exercices) ; tout le reste — planification, priorisation,
dosage, décision de quoi montrer maintenant — est du code déterministe,
testable sans appel réseau, et qui continue de fonctionner même si l'API
est indisponible ou si le budget est épuisé.

Répartition dans le plan :

| Composant | Nature | Où |
|---|---|---|
| Répétition espacée (SM-2) : quand réviser une carte | 100% algorithme | `lib/study/spaced-repetition.ts` (étape 4) |
| Dosage des types d'exercices selon le profil de cours | 100% algorithme (table de règles) | `lib/study/exercise-strategy.ts` (étape 3) |
| **Sélection du prochain exercice/carte selon l'historique de réussite** | 100% algorithme (pondération par taux d'erreur, pas de bandit complexe nécessaire au départ) | `lib/study/next-up.ts` (étape 3, détaillé plus bas) |
| Priorisation du tableau de bord "aujourd'hui" | 100% algorithme (tri par échéance) | `app/etude/page.tsx` (étape 6) |
| Validation structurelle d'un découpage en chapitres (doublons, chapitres vides, concepts orphelins) | 100% algorithme, en aval de l'IA | `lib/study/validate-chapters.ts` (étape 1) |
| Découpage d'un PDF de cours en chapitres | IA (Sonnet) — compréhension de texte libre, irremplaçable | étape 1 |
| Rédaction du cours détaillé, des flashcards, des exercices | IA (Sonnet/Haiku) — génération de contenu pédagogique | étapes 2, 4, 5 |

Ce découpage a un bénéfice concret au-delà du principe : les parties
algorithmiques ne coûtent rien en tokens, sont instantanées, et peuvent
être testées avec de simples suites de tests (voir les critères de sortie
par étape en §5.3) plutôt qu'en jugeant subjectivement une sortie IA.

## 2. Principe directeur : construire à côté, pas dessus

Aucun fichier existant n'est modifié pendant ce chantier :
`lib/chapters/*.ts`, `lib/prompts.ts`, `lib/courses.ts`, `app/cours/*`,
`components/exercises/*`, la table `progress` et la Klausur restent
strictement intacts et fonctionnels à chaque étape. Le nouveau mode vit
dans son propre espace de noms : nouvelles routes sous `/etude`, nouveaux
fichiers sous `lib/study/*`, `components/study/*`, `app/api/study/*`,
nouvelles tables Supabase préfixées `study_*`.

Avantage : si une étape ne convainc pas à l'usage, on peut l'ajuster ou
l'abandonner sans jamais casser ce qui fonctionne déjà.

## 3. État des lieux (ce qui existe déjà et sert de base)

| Brique existante | Fichier(s) | Réutilisable pour `/etude` ? |
|---|---|---|
| Modèle de chapitre (`concepts`, `summary`, `lang`, `hasCode`) | `lib/chapters/types.ts` | Oui, base d'inspiration pour `StudyChapter` |
| Génération d'exercices (6 types) | `lib/prompts.ts`, `app/api/exercise/route.ts` | Oui, mêmes patterns de prompt (JSON strict, pièges de confusion par langue) |
| Mini-cours à la demande | `app/api/lesson/route.ts`, `components/lesson-view.tsx` | Oui, mais volontairement trop court ("3 min max, 2 sections") — à réécrire en plus exhaustif |
| Klausur blanche complète | `app/api/klausur/route.ts`, `components/klausur-view.tsx` | Non touché, reste pour la phase examen |
| Progression | `lib/local-progress.ts`, `lib/supabase.ts`, table `progress` | Non touché ; nouvelle table dédiée pour ne pas mélanger les sémantiques (SM-2 ≠ compteur correct/total) |
| Auth | Supabase Auth (email + password) | Réutilisé tel quel |
| Exécution de code dans le navigateur | `lib/pyodide.ts`, `components/exercises/code-exercise.tsx` | Réutilisable pour les exercices pratiques de programmation du nouveau mode |

## 4. Choix de modèle IA et coûts

### 4.1 Pourquoi Sonnet pour certaines tâches et Haiku pour d'autres

- **Claude Sonnet 5** (`claude-sonnet-4-6`, déjà utilisé partout dans le
  projet) : meilleure qualité de raisonnement et de rédaction. Réservé aux
  tâches complexes et peu fréquentes par nature : extraire/structurer un
  vrai PDF de cours (contenu ambigu, mise en page variable, nécessite de
  bien juger où couper les chapitres), et rédiger le cours détaillé
  pédagogique (analogies, méthodes de compréhension). Ces deux tâches ne se
  déclenchent qu'une fois par cours/chapitre car le résultat est mis en cache.
- **Claude Haiku 4.5** : environ 3 à 4× moins cher que Sonnet, largement
  suffisant pour du JSON structuré bien cadré par un prompt strict
  (flashcards, Speed Round, QCM/matching/vrai-faux adaptés). Ce sont les
  générations les plus fréquentes (relancées à chaque session de révision
  si non cachées), donc c'est là que l'économie compte le plus.
- **Opus** : écarté, aucune tâche du projet ne justifie ce niveau (ni de
  coût).

### 4.2 Tarifs de référence (par million de tokens) — vérifiés le 2026-08-16

| Modèle | Input | Output |
|---|---|---|
| Claude Sonnet 5 (`claude-sonnet-5`) | 3 $ (tarif intro 2 $ jusqu'au 2026-08-31) | 15 $ (tarif intro 10 $ jusqu'au 2026-08-31) |
| Claude Haiku 4.5 (`claude-haiku-4-5`) | 1 $ | 5 $ |

Ces tarifs sont ceux de l'API Anthropic au moment de l'implémentation — le
projet est déjà sur `claude-sonnet-4-6` dans `app/api/exercise/route.ts` et
`app/api/lesson/route.ts` ; migrer vers `claude-sonnet-5` lors du chantier
`/etude` est recommandé (mêmes capacités, tarif introductif en vigueur).

### 4.3 Extraction PDF : comparaison chiffrée des deux approches

Question à trancher : envoyer le PDF natif à Sonnet (lecture directe,
gère texte + schémas) vs. extraire le texte côté serveur d'abord (lib
Node type `unpdf`, moins de tokens mais perd les schémas). Comparaison
sur un support de cours réaliste (~30 pages de slides, format proche de
`doc dynam/DynamischeSprachen_AbgedeckteFolien.pdf`).

| Approche | Tokens d'entrée estimés | Coût d'ingestion (Sonnet, tarif intro 2$/M) | Dépendance ajoutée |
|---|---|---|---|
| PDF natif (base64, lu directement par Sonnet) | ~1500-3000 tokens/page en mode vision → ~45-90k tokens pour 30 pages | ~0.09–0.18 $ par fichier | Aucune (l'API gère le PDF nativement, limite 32 Mo / 100 pages) |
| Texte pré-extrait (lib Node) puis envoyé à Sonnet | ~400-700 tokens/page en texte brut → ~12-21k tokens pour 30 pages | ~0.02–0.04 $ par fichier | 1 lib npm (`unpdf` ou équivalent) à maintenir |

Le PDF natif coûte environ **4 à 5× plus cher par fichier** que le texte
pré-extrait, mais l'écart absolu reste faible (quelques centimes par
fichier) vu le volume attendu (~20 fichiers sur le semestre, voir §4.4).
Ça ne fait **pas exploser le budget global** : même en scénario le plus
cher (PDF natif partout), l'ingestion reste de l'ordre de 2-4 $ pour tout
le semestre.

**Recommandation** : PDF natif malgré le surcoût — la différence absolue
est négligeable à cette échelle, alors que la perte de qualité sur des
slides avec schémas/diagrammes (fréquents en cours de programmation ou
gestion de projet) serait, elle, un vrai problème pour la fidélité du
découpage en chapitres. Réévaluer seulement si le volume de fichiers
uploadés dépasse largement les ~20 fichiers/semestre prévus.

### 4.4 Coût mensuel estimé pour un usage réaliste (un seul utilisateur)

Scénario : 4 nouveaux cours dans le semestre, ~15 chapitres chacun (60
chapitres au total), upload progressif (~20 fichiers/Vorlesung sur le
semestre), et une pratique quotidienne de ~15-20 exercices/flashcards par
jour pendant 4 mois. Calculs au tarif intro Sonnet (2$/10$ par M tokens,
valable jusqu'au 2026-08-31) et tarif Haiku (1$/5$ par M tokens).

- Ingestion PDF natif : 20 fichiers × ~0.09-0.18 $ ≈ **2-4 $** (one-shot, étalé sur le semestre)
- Cours détaillé : 60 chapitres × (~1.5k in + ~3-4k out) ≈ **~0.5-0.7 $** (one-shot par chapitre, caché)
- Flashcards (Haiku) : 60 chapitres × (~1k in + ~1.5k out) ≈ **~0.05 $** (one-shot par chapitre, caché)
- Pratique quotidienne (Speed Round + exercices non cachés, Haiku) :
  ~18/jour × (~1k in + ~1k out) × ~120 jours ≈ **~1.3 $**

**Total estimé sur un semestre complet : de l'ordre de 4 à 6 $**, largement
dominé par l'ingestion PDF (one-shot par fichier, avec le choix PDF natif)
plutôt que par l'usage quotidien — ce qui confirme que le cache reste le
levier de coût le plus important, bien avant le choix Sonnet/Haiku. Ces
chiffres sont indicatifs (ordre de grandeur possible selon la taille réelle
des PDF et la longueur des sorties) mais confirment que ce n'est pas un
poste de dépense significatif à l'échelle d'un semestre pour un usage
personnel — y compris avec l'option PDF native la plus chère.

### 4.5 Réglage du cache (le vrai levier de coût)

- Tout contenu généré par chapitre (cours détaillé, jeu de flashcards) est
  stocké en base (`study_lessons_cache`, `study_flashcards`) et **jamais
  régénéré automatiquement** — seulement sur action explicite "régénérer".
- Les exercices "à jouer" (Speed Round, QCM adaptés) ne sont volontairement
  pas cachés : leur intérêt pédagogique vient de leur variabilité à chaque
  session. C'est pour ça qu'ils tournent sur Haiku (moins cher) plutôt que
  Sonnet.

### 4.6 Budget révisé et ce qu'il achète réellement

Budget maximum accepté : **15-20 $ pour le semestre** (contre 4-6 $ dans le
scénario de base §4.4). Point important à ne pas perdre de vue : **le
budget n'achète pas mécaniquement de la qualité.** Le levier qui compte
vraiment pour la qualité est déjà activé au maximum dans le plan — Sonnet
(le modèle le plus capable disponible) est utilisé précisément là où la
qualité compte le plus : l'ingestion de cours (§5.3 étape 1) et le cours
détaillé pédagogique (§5.3 étape 2). Doubler ou tripler le budget ne rend
pas ces générations "meilleures" — Sonnet est déjà le plafond.

Ce que la marge supplémentaire (15-20 $ au lieu de 4-6 $) permet
concrètement, décidé avec toi :

- **Régénération libre, sans compter** : le bouton "régénérer" (cours
  détaillé, flashcards, découpage en chapitres à l'étape 1) devient un
  outil de travail normal plutôt qu'une action à éviter. Si un cours
  généré n'est pas satisfaisant après relecture, on relance sans
  hésitation — chaque régénération coûte l'équivalent d'une génération
  initiale (voir tarifs unitaires §4.3/§4.4), donc la marge de 10-15 $
  supplémentaires représente largement de quoi régénérer un bon nombre de
  chapitres plusieurs fois sur le semestre.
- **Priorité affirmée : ne pas dégrader ce qui existe déjà.** Le mode
  Klausur/exercices actuel (`app/api/exercise`, `app/api/klausur`,
  `app/api/lesson`) tourne déjà sur Sonnet et reste strictement intact —
  ce chantier n'y touche pas (§2). La marge budgétaire sert le nouveau
  contenu `/etude`, pas une remise en cause du mode existant.
- **Non retenu pour l'instant** : basculer flashcards/Speed Round/QCM
  adaptés sur Sonnet plutôt que Haiku, et la double passe de vérification
  après ingestion. Les deux restent des options si, après usage réel, la
  qualité Haiku sur ces formats courts déçoit — mais rien n'indique que
  ce soit nécessaire avant de l'avoir testé en conditions réelles.

## 5. Architecture technique détaillée

### 5.1 Nouveaux types (`lib/study/types.ts`)

```ts
export type CourseProfile = "programming" | "theory" | "mixed"

export interface StudyCourse {
  id: string
  user_id: string
  title: string
  profile: CourseProfile
  detected_language: Lang | null   // si programmation
  created_at: string
}

export interface StudyCourseFile {
  id: string
  study_course_id: string
  filename: string
  status: "pending" | "processing" | "done" | "error"
  error_message: string | null
  uploaded_at: string
}

export interface StudyChapter {
  id: string
  study_course_id: string
  order: number
  title_de: string
  title_fr: string
  concepts: string[]
  summary: string
  has_code: boolean
  source_file_id: string
}

export interface Flashcard {
  id: string
  study_chapter_id: string
  front_de: string
  back_de: string
  back_fr: string
}

export interface FlashcardProgress {
  flashcard_id: string
  user_id: string
  interval_days: number
  ease_factor: number
  due_at: string
  last_grade: "again" | "hard" | "good" | "easy" | null
}
```

### 5.2 Migration Supabase additive (`supabase/migrations/0003_study_mode.sql`)

Tables nouvelles uniquement, RLS sur `user_id` comme le reste du projet :
`study_courses`, `study_course_files`, `study_chapters`, `study_flashcards`,
`study_flashcards_progress`. Aucune modification de `progress` ni de ses
policies/RPC existants.

### 5.3 Étapes d'implémentation

**Étape 0 — Fondations**
Types + migration. Test : migration s'applique proprement sur la base
existante, `pnpm build` reste vert, aucune route actuelle affectée.

**Étape 1 — Upload & ingestion de cours**
- `app/etude/dashboard/page.tsx` : créer un cours, uploader un ou plusieurs
  fichiers (support complet ou Vorlesung par Vorlesung), suivi de statut
  par fichier.
- **Upload direct vers Supabase Storage** (bucket `study-course-files`,
  RLS par `user_id`) depuis le client, pas via une route API Next — les
  Route Handlers ont une limite de taille de payload (défaut proche de 1
  Mo pour les Server Actions) que des supports de cours complets peuvent
  dépasser facilement. La route API ne reçoit que le chemin du fichier
  déjà stocké, pas son contenu.
- `app/api/study/ingest/route.ts` (Sonnet, PDF envoyé nativement en pièce
  jointe — voir §4.3) : lecture du PDF + découpage en `StudyChapter[]` +
  détection du `CourseProfile` (et du langage de programmation si
  pertinent).
- **Deux régimes de taille, à traiter différemment** — un support donné
  Vorlesung par Vorlesung (quelques dizaines de pages, comme les PDF déjà
  dans `doc dynam/`) et un support complet donné en une fois en début de
  semestre (potentiellement 200-400+ pages) ne peuvent pas passer par le
  même chemin :
  - **Limite dure côté API** : 32 Mo et 600 pages par requête PDF (Sonnet,
    contexte 1M). Un fichier qui dépasse ces bornes est **rejeté**, pas
    juste lent — il faut le détecter et le découper *avant* l'envoi, pas
    après un échec.
  - **Découpage préalable si trop volumineux** : à l'upload, si le PDF
    dépasse un seuil (ex. ~80-100 pages, marge de sécurité sous la limite
    API et sous ce qui reste exploitable en un seul prompt de qualité),
    le découper en tranches de pages côté serveur (lib légère de split
    PDF, pas d'extraction de texte — on garde des PDF, juste plus petits)
    avant de les envoyer un par un à Sonnet. Chaque tranche produit un
    lot de chapitres, fusionnés ensuite dans le même cours.
  - **Coût qui suit la taille, pas un forfait** : un support de semestre
    complet en PDF natif peut coûter plusieurs dizaines de centimes à
    quelques dollars à lui seul selon sa taille réelle (voir §4.3 — le
    calcul par page reste valable, il suffit de multiplier par le nombre
    de tranches). Le budget §4.4 suppose des fichiers Vorlesung-par-
    Vorlesung ; si tu sais déjà qu'un prof donne tout d'un coup, ce
    fichier-là doit être compté à part au moment de l'uploader.
- **Traitement asynchrone du statut** : la route marque le fichier
  `processing` puis `done`/`error` (avec le détail par tranche si
  découpé) ; le dashboard interroge périodiquement (polling léger) ou
  s'abonne aux changements Supabase (`realtime`) plutôt que d'attendre la
  réponse HTTP en direct — indispensable dès qu'un fichier est découpé en
  plusieurs appels, la génération peut prendre plusieurs minutes.
- **Validation structurelle algorithmique en aval de l'IA**
  (`lib/study/validate-chapters.ts`, pas d'appel réseau) : avant même de
  te présenter l'écran de confirmation, du code vérifie mécaniquement le
  JSON renvoyé par Sonnet — chapitres sans titre ou sans concepts,
  doublons de titre, concepts qui n'apparaissent dans aucun `summary`,
  numérotation d'ordre incohérente. Les anomalies sont signalées sur
  l'écran de confirmation (pas bloquantes, mais visibles) plutôt que de te
  laisser découvrir un chapitre vide trois semaines plus tard. C'est du
  code déterministe, testable directement avec des fixtures JSON, aucune
  dépendance à la qualité du modèle ce jour-là.
- Écran de confirmation : profil détecté proposé, tu valides ou corriges
  avant enregistrement définitif (pas de classement silencieux).
- Test : uploader 2-3 vrais fichiers de ce semestre, **en incluant si
  possible un support complet de semestre** (le cas le plus volumineux
  réellement attendu), pour valider le découpage automatique en tranches
  et vérifier qualité du découpage en chapitres + détection de profil sur
  ce cas extrême, pas seulement sur des fichiers Vorlesung courts.
- **Critère de sortie** : découpage jugé correct sur au moins 2 fichiers
  réels sur 3 testés, avant de passer à l'étape 2.

**Étape 2 — Cours détaillé exhaustif**
- Prompt Sonnet : une section par concept extrait, exemple concret +
  astuce/mnémotechnique par section, aucun concept oublié.
- `app/etude/[courseId]/kapitel/[id]/page.tsx`,
  `components/study/detailed-lesson-view.tsx`.
- Test : vérifier sur un cours théorique et un cours de programmation que
  la couverture est complète.
- **Critère de sortie** : relecture manuelle sur 3 chapitres contrastés
  (Java POO, Python dynamique, gestion de projet) confirmant qu'aucun
  concept de `chapter.concepts` n'est absent du cours généré.

**Étape 3 — Moteur d'adaptation des exercices selon le profil**
- `lib/study/exercise-strategy.ts` : selon `CourseProfile`, une table de
  règles explicite fixe quels types d'exercice proposer et leur dosage.
  Base de départ (à affiner après usage réel) :

  | Profil détecté | Types privilégiés | Dosage indicatif |
  |---|---|---|
  | `programming` | Exercice de code (write/complete/fix, façon `code` existant), analyse de code, Speed Round sur syntaxe | ~50% pratique code, ~30% flashcards/QCM, ~20% ludique |
  | `theory` | QCM, matching, vrai/faux, flashcards, texte à trous conceptuel | ~60% flashcards/QCM, ~40% ludique (Speed Round sur définitions) |
  | `mixed` | Mélange des deux selon `chapter.hasCode` par chapitre (comme le fait déjà `lib/prompts.ts` pour Java vs Projektmanagement) | Dosage par chapitre, pas par cours entier |

  Interface : `getExerciseMix(profile: CourseProfile, chapter: StudyChapter): ExerciseTypeWeight[]`
  — fonction pure, testable sans appel IA.
- **Algorithme de sélection du prochain exercice** (`lib/study/next-up.ts`,
  toujours sans IA) : `getExerciseMix` fixe le dosage *par défaut* selon
  le profil, mais ne dit pas *quoi proposer maintenant* à un instant T.
  Un second algorithme croise ce dosage avec ton historique de réussite
  réel par type d'exercice et par chapitre (déjà stocké en base) :
  - pondération simple par taux d'erreur — un type d'exercice où ton taux
    de réussite est bas sur un chapitre est proposé plus souvent que la
    moyenne du dosage par défaut (pas besoin d'un vrai bandit multi-bras
    au départ, une pondération linéaire suffit et reste explicable) ;
  - les chapitres jamais pratiqués sont priorisés sur les chapitres déjà
    bien maîtrisés ;
  - interface : `pickNextExercise(history: ExerciseHistory[], mix: ExerciseTypeWeight[]) → { chapterId, exerciseType }`
    — fonction pure, testable avec des historiques simulés, aucun appel
    réseau. C'est cette fonction qui alimente le tableau de bord de
    l'étape 6 et, plus tard, peut aussi piloter un mode "je ne sais pas
    quoi réviser, propose-moi quelque chose".
- Test : vérifier sur 3 profils différents (un cours 100% code, un 100%
  théorique, un mixte) que les propositions ont du sens ; vérifier sur un
  historique simulé que `pickNextExercise` priorise bien un type
  d'exercice en échec récurrent sur un chapitre donné.
- **Critère de sortie** : sur le cours mixte, confirmer que le dosage suit
  bien `chapter.hasCode` chapitre par chapitre et non une moyenne globale ;
  sur `pickNextExercise`, confirmer par test qu'un historique à 20% de
  réussite sur un type d'exercice le fait remonter en priorité par
  rapport à un type à 90% de réussite sur le même chapitre.

**Étape 4 — Lernkartei (flashcards + SM-2)**
- `lib/study/spaced-repetition.ts` : SM-2 simplifié, logique pure testable
  sans appel API (`scheduleNext(card, grade) → card`).
- Génération Haiku par chapitre, cache en base.
- Test : simulation de séquences de révision sur plusieurs jours (dates
  mockées), vérifier que les intervalles évoluent correctement.
- **Critère de sortie** : suite de cas de test sur `scheduleNext` couvrant
  au moins les 4 notes (again/hard/good/easy) et la remise à zéro de
  l'intervalle sur une réponse "again" après plusieurs succès.

**Étape 5 — Speed Round (premier exercice fun)**
- Génération Haiku, chronométré, score/streak, feedback immédiat.
- Test : jouer plusieurs manches sur un cours de programmation et un cours
  théorique, valider fun + fiabilité du JSON. Les types suivants (Memory,
  Quiz Combo...) seront décidés après ce retour d'usage réel.
- **Critère de sortie** : au moins 5 manches jouées sans erreur de
  génération JSON, et retour subjectif positif avant de considérer
  d'autres types d'exercices ludiques.

**Étape 6 — Tableau de bord "aujourd'hui"**
- `app/etude/page.tsx` : assemble uniquement des sorties d'algorithmes
  déjà écrits, sans nouvel appel IA — cartes dues (`scheduleNext`, étape
  4), chapitres jamais vus, prochain exercice recommandé
  (`pickNextExercise`, étape 3). La page elle-même n'est qu'un affichage ;
  toute la logique de priorisation vit déjà dans `lib/study/`.
- **Critère de sortie** : vérification manuelle que la priorisation
  reflète bien les dates d'échéance SM-2 (une carte en retard de 3 jours
  apparaît avant une carte due demain) et que le prochain exercice suggéré
  correspond à ce que `pickNextExercise` aurait renvoyé pour cet
  historique (pas de logique de priorisation dupliquée dans le composant).

### 5.4 Reporté (backlog explicite, pas oublié)

- Fusion incrémentale des chapitres quand un nouveau fichier Vorlesung
  arrive pour un cours déjà existant (aujourd'hui : ingestion traitée
  fichier par fichier, sans fusion automatique).
- Édition manuelle du découpage en chapitres après extraction IA.
- Recherche web de sources complémentaires fiables sur un concept donné
   (ajoute coût + question de fiabilité des sources — à évaluer une fois le
  cœur du système stable et le budget réel observé).

## 6. Politique linguistique

- **DE primaire** : contenus, questions, titres, Fachbegriffe en allemand
- **FR complément** : explications de concepts difficiles, astuces mnémotechniques, traductions de pièges
- **Fachbegriffe** : jamais traduits (Vererbung, Polymorphie, etc.)
- **Bonne qualité FR** : quand le français est utilisé, c'est rigoureux et pédagogique

## 7. UX/UI — "machen Spaß"

- Interface visuellement attractive, feedback positif immédiat
- Progression visible (barres, streaks, compteurs)
- Variété des formats pour maintenir la motivation
- Ton amical, pas austère

## 8. Risques et points de vigilance

- **Qualité d'extraction PDF** : un PDF de slides mal structuré peut donner
  un découpage en chapitres médiocre — d'où la validation utilisateur
  obligatoire à l'étape 1, jamais un classement silencieux.
- **Dérive de coût si le cache est contourné** : le bouton "régénérer"
  doit rester une action explicite et visible comme telle, pas un
  comportement par défaut au chargement de page.
- **Deux systèmes de progression en parallèle** (`progress` pour le mode
  Klausur/existant, `study_flashcards_progress` pour le nouveau mode) :
  assumé comme un choix délibéré vu que les sémantiques sont différentes
  (compteur simple vs. planification SM-2), mais à garder en tête si un
  jour on veut un score unifié inter-modes.
