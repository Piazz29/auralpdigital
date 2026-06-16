import StaggeredMenu from './StaggeredMenu.jsx';

/**
 * Menu del sito basato su StaggeredMenu (React Bits), adattato al brand:
 * stesse voci, palette, e gli stessi contatti del menu originale
 * (mail + luogo + social Instagram/LinkedIn).
 *
 * `home` decide il prefisso dei link ancora (come nel vecchio Navbar):
 * sulla home restano "#sezione", altrove diventano "/#sezione".
 */
export default function SiteMenu({ home = false }) {
  const p = home ? '' : '/';

  const items = [
    { label: 'Progetti', ariaLabel: 'Vai ai progetti', link: `${p}#projects` },
    { label: 'Cosa Facciamo', ariaLabel: 'Scopri cosa facciamo', link: `${p}#cosa-facciamo` },
    { label: 'Chi Siamo', ariaLabel: 'Scopri chi siamo', link: '/chi-siamo' },
    { label: 'Info', ariaLabel: 'Informazioni e contatti', link: `${p}#info` }
  ];

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

  // Mail + luogo: stessi dati e stessa gerarchia del menu originale.
  const extraPanelContent = (
    <>
      <span className="sm-panel-extra-label">Scrivici</span>
      <a href="mailto:hello@auralpdigital.com">hello@auralpdigital.com</a>
      <span className="sm-panel-place">
        Alto Adige
        <br />
        Italia, 39100
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
      socialsLabel="Social"
      extraPanelContent={extraPanelContent}
      colors={['#3B5BDB', '#1A2340']}
      logoUrl="/logo/wordmark.svg"
      accentColor="#3B5BDB"
      menuButtonColor="#0D0D0D"
      openMenuButtonColor="#0D0D0D"
      changeMenuColorOnOpen={false}
    />
  );
}
