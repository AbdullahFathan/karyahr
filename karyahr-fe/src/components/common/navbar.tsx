type NavbarProps = {
  readonly title: string
}

export function Navbar({ title }: NavbarProps) {
  return (
    <header
      style={{
        height: 64,
        background: '#ffffff',
        borderBottom: '1px solid #eceaf0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h1>
    </header>
  )
}
