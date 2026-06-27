# Java Lernen

Plateforme de révision Java avec exercices générés par IA, progression utilisateur et thème Geist/Vercel.

## Variables d'environnement

Configure ces variables dans `.env.local` en local et dans Vercel en production:

```bash
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

`ANTHROPIC_API_KEY` reste côté serveur. Les deux variables `NEXT_PUBLIC_SUPABASE_*` sont les valeurs publiques Supabase nécessaires au client.

## Base de données Supabase

Avant d'utiliser l'app en ligne avec progression persistante, applique la migration:

```bash
supabase db push
```

Ou copie le SQL de `supabase/migrations/0001_progress.sql` dans l'éditeur SQL Supabase.

La migration crée:
- la table `public.progress`
- les politiques RLS pour que chaque utilisateur lise/modifie uniquement sa progression
- la fonction RPC `public.upsert_progress`

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
