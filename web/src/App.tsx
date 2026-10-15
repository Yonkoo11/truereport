import Header from './components/Header';
import Doctor from './pages/Doctor';
import Home from './pages/Home';
import Registrar from './pages/Registrar';
import Verify from './pages/Verify';

const PAGES: Record<string, () => React.JSX.Element> = { '/': Home, '/verify': Verify, '/doctor': Doctor, '/registrar': Registrar };

export default function App() {
  const Page = PAGES[location.pathname.replace(/\/+$/, '') || '/'] ?? Home;
  return (
    <>
      <Header />
      <Page />
    </>
  );
}
