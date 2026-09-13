import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '@/features/auth/hooks/use-login'
import { loginSchema } from '@/features/auth/schema'
import { APP_NAME } from '@/lib/constants'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

export function LoginForm() {
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setFormError('Enter a valid email and password (min 8 characters).')
      return
    }

    try {
      await loginMutation.mutateAsync(parsed.data)
      await navigate('/')
    } catch (error) {
      setFormError(getApiErrorMessage(error))
    }
  }

  const isInvalid = Boolean(formError)

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
        <CardDescription>Sign in with your work email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={isInvalid || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                aria-invalid={isInvalid || undefined}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field data-invalid={isInvalid || undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                aria-invalid={isInvalid || undefined}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {formError ? <FieldError>{formError}</FieldError> : null}
          </FieldGroup>
          <Button type="submit" size="lg" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
