# IT Lernen

Plateforme de révision multi-cours avec exercices générés par IA, progression utilisateur et thème Geist/Vercel.

Cours disponibles :
- **Java** (28 chapitres)
- **Langages dynamiques** — Python, Perl, JavaScript (17 chapitres)

Chaque cours a ses propres chapitres (`lib/chapters/java.ts`, `lib/chapters/dynsprachen.ts`) déclarés dans le registre `lib/courses.ts`. Ajouter un nouveau cours = ajouter un fichier de chapitres + une entrée dans `COURSES`.

## Navigation

`/` (cours) → `/cours/[courseId]` (chapitres) → `/cours/[courseId]/kapitel/[id]` (cours + types d'exercice) → `/cours/[courseId]/kapitel/[id]/[type]` (exercice généré).

Les anciennes URLs `/kapitel/[id]` et `/kapitel/[id]/[type]` (avant la version multi-cours) redirigent automatiquement vers `/cours/java/...`.

## Variables d'environnement

Configure ces variables dans `.env.local` en local et dans Vercel en production:

```bash
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://java-learn-eta.vercel.app
```

`ANTHROPIC_API_KEY` reste côté serveur. Les deux variables `NEXT_PUBLIC_SUPABASE_*` sont les valeurs publiques Supabase nécessaires au client.

## Base de données Supabase

Applique les migrations dans l'ordre :

```bash
supabase db push
```

Ou copie le SQL de chaque fichier dans l'éditeur SQL Supabase, dans l'ordre :

1. `supabase/migrations/0001_progress.sql` — table `progress` mono-cours (Java) d'origine.
2. `supabase/migrations/0002_multi_course.sql` — ajoute `course_id`, migre la clé primaire, et remplace la fonction RPC `upsert_progress` pour accepter un cours. **Non destructif** : toute la progression Java existante est automatiquement rattachée à `course_id = 'java'`.

Si la base est neuve, applique simplement les deux migrations à la suite.

La migration crée/maintient :
- la table `public.progress` (clé : `user_id`, `course_id`, `chapter_id`, `exercise_type`)
- les politiques RLS pour que chaque utilisateur lise/modifie uniquement sa progression
- la fonction RPC `public.upsert_progress(p_user_id, p_course_id, p_chapter_id, p_exercise_type, p_correct)`

## Auth Supabase

Dans Supabase, ajoute l'URL de production Vercel dans:

`Authentication > URL Configuration`

Renseigne:
- `Site URL`: l'URL de production
- `Redirect URLs`: l'URL de production et l'URL locale si besoin, par exemple `http://localhost:3000`

## Développement

```bash
pnpm install
pnpm dev
```

## Vérifications

```bash
pnpm lint
pnpm build
```
