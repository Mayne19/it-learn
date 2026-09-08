# Mode étude — architecture IA et coûts

Ce document décrit **quel modèle Anthropic fait quoi**, **pourquoi**, et **comment le coût est maîtrisé**, dans le mode étude (upload de PDF de cours → chapitres → révision). Écrit après une session d'audit de coûts (sept. 2026) — voir aussi `docs/db-anpassung.md` §3 pour les colonnes DB associées.

## 1. Vue d'ensemble : qui fait quoi

| Étape | Route | Modèle | Pourquoi ce modèle |
|---|---|---|---|
| Découpage en tranches d'un PDF volumineux | `app/api/study/ingest/plan/route.ts` | Haiku 4.5 | Tâche mécanique (compter les pages, proposer des bornes) — pas besoin de raisonnement |
| Ingestion PDF → extraction des chapitres | `app/api/study/ingest/route.ts` | **Sonnet 5** | Lecture native du PDF (mise en page, schémas, tableaux) — Haiku et les modèles tiers ne lisent pas le PDF aussi fidèlement |
| Cours détaillé par chapitre | `app/api/study/lesson/route.ts` | **Sonnet 5** | Contenu pédagogique riche, doit rester fidèle à la source (voir §4) — testé contre Haiku, écarté pour risque de qualité |
| Flashcards | `app/api/study/flashcards/route.ts` | Haiku 4.5 | Génération courte et structurée à partir d'un résumé déjà extrait |
| Speed Round (exercices rapides) | `app/api/study/speed-round/route.ts` | Haiku 4.5 | Idem — pas de lecture de PDF, contenu court |

Principe général : **Sonnet uniquement là où c'est nécessaire** (lecture de PDF brut, ou contenu long qui doit rester exact) ; **Haiku partout ailleurs** (tâches courtes, mécaniques, ou dérivées d'un texte déjà propre).

## 2. Le pipeline complet, dans l'ordre

1. **Upload** d'un PDF par l'utilisateur → stocké dans Supabase Storage (`study_course_files`, colonne `next_slice_index` à 0).
2. **Plan de découpage** (`ingest/plan`, Haiku) : si le PDF dépasse `SPLIT_THRESHOLD_PAGES` (45 pages, voir `lib/study/pdf-split.ts`), il est découpé en tranches. Sinon, une seule "tranche" = le document entier.
3. **Ingestion par tranche** (`ingest`, Sonnet) : chaque tranche est envoyée en pièce jointe native (`type: 'document'`) à Sonnet, qui renvoie une liste de chapitres structurés (titres DE/FR, résumé, concepts, présence de code). Traité côté client tranche par tranche (`app/etude/[courseId]/page.tsx`, `handleGenerate`).
4. **Sauvegarde** des chapitres en DB (`study_chapters`), progression avancée via `advanceNextSliceIndex` (voir §3).
5. **Cours détaillé** (`lesson`, Sonnet) : généré **à la demande**, la première fois qu'un utilisateur ouvre un chapitre — pas à l'upload. Mis en cache dans `study_lessons_cache`, **partagé entre tous les utilisateurs** (clé primaire = `study_chapter_id` seul, pas de `user_id`).
6. **Flashcards / Speed Round** (Haiku) : générés à la demande à partir du chapitre déjà en base, pas du PDF.

## 3. Ce qui limite le coût structurellement

Trois mécanismes, tous déjà en place :

- **Reprise de tranche après erreur** (`next_slice_index`, `lib/study/queries.ts::advanceNextSliceIndex`) : si une tranche échoue (ex. JSON invalide), "Réessayer" ne retraite **que** cette tranche — pas tout le document depuis le début. Avant ce fix, un retry sur un cours de 345 pages pouvait repayer les 300 premières pages déjà réussies.
- **Prompt caching** (`cache_control: { type: 'ephemeral' }` sur le PDF, TTL 5 min) : si la même tranche est renvoyée dans les 5 minutes (retry immédiat), le PDF est relu à ~10% du prix normal au lieu du plein tarif.
- **Cache applicatif partagé** (`study_lessons_cache`) : un cours détaillé n'est généré **qu'une seule fois par chapitre, pour tous les utilisateurs confondus**. Si deux personnes suivent le même cours, la deuxième ne paie jamais rien sur cette étape.

Concrètement : le coût d'un cours n'est jamais reproportionnel au nombre de fois qu'il est consulté, seulement au nombre de chapitres qu'il contient, une fois pour toutes.

## 4. La règle anti-invention (lesson-prompt.ts)

Ajoutée après un test comparatif Sonnet vs Haiku sur le cours détaillé : les deux modèles peuvent enrichir le contenu avec des détails factuels précis (numéro de norme, date, nom d'organisation) qui ne sont **pas** dans le résumé/concepts fournis par l'ingestion. Ces ajouts étaient vrais dans les cas observés, mais rien dans le pipeline ne le garantirait si un jour ce n'est pas le cas — risque silencieux sur du contenu que l'étudiant utilise pour réviser.

Règle dans `lib/study/lesson-prompt.ts::buildDetailedLessonPrompt` : le modèle peut inventer librement des exemples et analogies (pas besoin d'être factuels), mais ne doit ajouter **aucun fait** non déductible du résumé source.

## 5. Pourquoi Sonnet et pas Haiku sur le cours détaillé

Testé explicitement (voir historique git, commits autour de la comparaison A/B) sur deux chapitres réels :

- Qualité structurelle (JSON, couverture des concepts) : comparable dans les deux cas.
- Fidélité à la source : Sonnet reste strictement dans le résumé fourni ; Haiku a ajouté des détails factuels externes sur 2/2 tests (corrigé depuis par la règle du §4, mais le pattern reste un signal de moindre discipline).
- Gain financier de Haiku (-50 % sur cette étape) : non déterminant à l'échelle actuelle (voir §6).

Décision : rester sur Sonnet pour cette étape. À rouvrir si le volume d'usage change fondamentalement.

## 6. Dimensionnement du coût (référence sept. 2026)

Hypothèses d'usage : 2 utilisateurs, 5–6 cours par semestre chacun, mélange de cours à script unique volumineux et cours à scripts multiples (un par séance).

| Scénario | Coût estimé |
|---|---|
| Cours à script unique, ~200 pages | ~$1,43 |
| Cours à script unique, ~345 pages | ~$2,44 |
| Cours à scripts multiples (12 séances × 15p) | ~$1,43 |
| **Pire cas** : 12 cours distincts entre les 2 utilisateurs, aucun partage | **~$18 / semestre** |
| **Meilleur cas** : mêmes cours suivis par les deux (cache partagé) | **~$9 / semestre** |

Sur un budget de $50/semestre, marge confortable (64–82 % non utilisée) même dans le pire cas. Tarifs Sonnet 5 utilisés : $2/M tokens input, $10/M tokens output (voir [claude.com/pricing](https://claude.com/pricing) pour les tarifs à jour).

## 7. Pistes explorées et écartées (pour référence future)

Si le volume change un jour et que ce sujet doit être rouvert :

- **Batch API Anthropic** (-50 % garanti) : écarté pour l'instant car impose un traitement asynchrone (généralement <1h, jusqu'à 24h max) qui casserait l'expérience "attendre devant l'écran" actuelle. Vrai gain si un jour l'app peut absorber ce délai (ex. notification "ton cours est prêt").
- **Haiku sur le cours détaillé** : écarté, voir §5.
- **Modèles tiers (OpenAI, Gemini, open source)** : écartés — les fournisseurs open source (Together AI, Fireworks, Groq) ne supportent pas nativement les PDF en pièce jointe, ce qui casserait l'étape d'ingestion sans réécriture significative (extraction de texte préalable, perte de la lecture visuelle).
- **Cache étendu 1h** : existe côté Anthropic mais non pertinent ici — le PDF d'une tranche n'est normalement lu qu'une fois, le cache 5 min suffit pour les retries immédiats.
