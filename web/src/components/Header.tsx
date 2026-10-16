const LINKS = [
  ['/verify', 'Check a report'],
  ['/doctor', 'For doctors'],
  ['/registrar', 'Registrar'],
] as const;

export default function Header() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  return (
    <header className="header">
      <div className="header__in">
        <a className="wordmark" href="/">TrueReport</a>
        <nav className="nav" aria-label="Pages">
          {LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className={path === href ? 'nav__link nav__link--here' : 'nav__link'}
              aria-current={path === href ? 'page' : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
