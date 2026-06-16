import StaggeredMenu from './StaggeredMenu.jsx';
import { getDict, localePath, languages, langLabels, langNames, defaultLang } from '../../i18n';

/**
 * Menu del sito basato su StaggeredMenu (React Bits), adattato al brand e ora
 * multilingua. Voci, contatti e label del toggle vengono dal dizionario della
 * lingua corrente; lo switcher di lingua è costruito dalla rotta base `route`
 * ('/' o '/chi-siamo'), così ogni lingua punta alla pagina equivalente.
 *
 * `home` decide il prefisso dei link ancora (sulla home "#sezione", altrove
 * "/#sezione", localizzato per lingua).
 */
export default function SiteMenu({ home = false, lang = defaultLang, route = '/' }) {
  const t = getDict(lang);
  const homeHref = localePath(lang, '/');
  const anchor = (id) => (home ? `#${id}` : `${homeHref}#${id}`);

  const items = [
    { label: t.nav.items.projects, ariaLabel: t.nav.aria.projects, link: anchor('projects') },
    { label: t.nav.items.services, ariaLabel: t.nav.aria.services, link: anchor('cosa-facciamo') },
    { label: t.nav.items.about, ariaLabel: t.nav.aria.about, link: localePath(lang, '/chi-siamo') },
    { label: t.nav.items.info, ariaLabel: t.nav.aria.info, link: anchor('info') }
  ];

  // Switcher: una voce per lingua, ognuna verso la stessa pagina nell'altra lingua.
  const languageLinks = languages.map((code) => ({
    code,
    label: langLabels[code],
    name: langNames[code],
    href: localePath(code, route),
    active: code === lang
  }));

  // Social come icone (non più testo): SVG inline, currentColor per ereditare
  // il colore del brand e l'hover accent.
  const socialItems = [
    {
      label: 'Instagram',
      link: '#',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
        </svg>
      )
    },
    {
      label: 'LinkedIn',
      link: '#',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 17v-7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    }
  ];

  // Mail + luogo: stessa gerarchia del menu originale, ora localizzati.
  const [place1, place2] = t.nav.place.split('\n');
  const extraPanelContent = (
    <>
      <span className="sm-panel-extra-label">{t.nav.write}</span>
      <a href="mailto:hello@auralpdigital.com">hello@auralpdigital.com</a>
      <span className="sm-panel-place">
        {place1}
        <br />
        {place2}
      </span>
    </>
  );

  return (
    <StaggeredMenu
      position="right"
      isFixed
      items={items}
      socialItems={socialItems}
      displaySocials
      displayItemNumbering
      socialsLabel={t.nav.socialsLabel}
      extraPanelContent={extraPanelContent}
      colors={['#3B5BDB', '#1A2340']}
      logoUrl="/logo/wordmark.svg"
      accentColor="#3B5BDB"
      menuButtonColor="#0D0D0D"
      openMenuButtonColor="#0D0D0D"
      changeMenuColorOnOpen={false}
      homeUrl={homeHref}
      menuLabel={t.nav.toggleOpen}
      closeLabel={t.nav.toggleClose}
      openMenuLabel={t.nav.openMenu}
      closeMenuLabel={t.nav.closeMenu}
      languageLinks={languageLinks}
      languageLabel={t.nav.langLabel}
    />
  );
}
