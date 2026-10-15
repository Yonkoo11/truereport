import { SITE_DOMAIN } from '../lib/config';

export default function Header() {
  return (
    <header className="header">
      <div className="header__in">
        <a className="wordmark" href="/">TrueReport</a>
        <span className="domain">{SITE_DOMAIN}</span>
      </div>
    </header>
  );
}
