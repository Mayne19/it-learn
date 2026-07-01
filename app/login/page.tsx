"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PasswordInput } from "@/components/password-input"
import { BookOpen, Mail, CheckCircle, AlertCircleIcon, ArrowLeft } from "lucide-react"

type Mode = "signin" | "signup" | "forgot"

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "")
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackError = searchParams.get("error")

  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const switchMode = (next: Mode) => {
    setMode(next)
    setError("")
    setSent(false)
    setPassword("")
    setConfirmPassword("")
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : error.message === "Email not confirmed"
            ? "Confirmez d'abord votre email — vérifiez votre boîte de réception."
            : "Erreur : " + error.message
      )
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${getSiteUrl()}/api/auth/callback?next=/` }
    })

    if (error) {
      setError(
        error.message.includes("already registered") || error.message.includes("already exists")
          ? "Un compte existe déjà avec cet email — connectez-vous plutôt."
          : "Erreur : " + error.message
      )
      setLoading(false)
      return
    }

    // If email confirmation is disabled on the Supabase project, signUp
    // already returns an active session — no need to wait for an email.
    if (data.session) {
      router.push("/")
      router.refresh()
      return
    }

    setSent(true)
    setLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/api/auth/callback?next=/reset-password`
    })

    if (error) {
      setError("Erreur : " + error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  const handleSubmit =
    mode === "signin" ? handleSignIn : mode === "signup" ? handleSignUp : handleForgotPassword

  if (!isSupabaseConfigured()) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertDescription>
          Supabase non configuré — remplissez .env.local avec vos vraies clés.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">IT Lernen</CardTitle>
        <CardDescription>
          Plateforme de révision Java & langages dynamiques pour vos examens en Allemagne
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode !== "forgot" && (
          <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">Connexion</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Créer un compte</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {callbackError && !sent && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              Le lien a expiré ou est invalide. Réessayez.
            </AlertDescription>
          </Alert>
        )}

        {sent ? (
          <div className="text-center space-y-4 py-2">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <p className="font-medium">
              {mode === "forgot" ? "Lien de réinitialisation envoyé !" : "Email de confirmation envoyé !"}
            </p>
            <p className="text-sm text-muted-foreground">
              Vérifiez votre email <strong>{email}</strong> et cliquez sur le lien.
            </p>
            <Button variant="outline" size="sm" onClick={() => switchMode("signin")}>
              Retour à la connexion
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
              </button>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Chargement..."
                : mode === "signin"
                  ? "Se connecter"
                  : mode === "signup"
                    ? "Créer mon compte"
                    : "Envoyer le lien de réinitialisation"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
