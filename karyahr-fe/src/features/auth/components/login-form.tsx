import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '@/features/auth/hooks/use-login'
import { loginSchema } from '@/features/auth/schema'
import { APP_NAME } from '@/lib/constants'

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
    } catch {
      setFormError('Sign in failed. Check email and password.')
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        width: 400,
        background: '#ffffff',
        borderRadius: 16,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 8px 24px rgb(22 21 28 / 6%)',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 24 }}>{APP_NAME}</h1>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        Email
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {formError ? <p style={{ color: '#e11d48', margin: 0 }}>{formError}</p> : null}
      <button
        type="submit"
        disabled={loginMutation.isPending}
        style={{
          background: '#e11d48',
          color: '#ffffff',
          border: 0,
          borderRadius: 8,
          padding: '10px 16px',
          cursor: 'pointer',
        }}
      >
        {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
