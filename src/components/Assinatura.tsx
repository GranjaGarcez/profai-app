// Assinatura de autoria — Granja Garcez. Rodapé discreto com logótipo
// Moon Elephant como botão de contacto (email).
export default function Assinatura() {
  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        flexWrap: 'wrap',
        padding: '1rem',
        fontSize: '0.78rem',
        lineHeight: 1.4,
        color: '#8a8a8a',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <span>© 2026 · Idealizado e desenvolvido por Granja Garcez</span>
      <a
        href="mailto:elefantedistante@gmail.com"
        title="Contactar Granja Garcez"
        aria-label="Enviar email a Granja Garcez"
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <img
          src="/moon-elephant.png"
          alt="Moon Elephant — contacto"
          width={30}
          height={30}
          style={{ borderRadius: '50%', verticalAlign: 'middle' }}
        />
      </a>
    </footer>
  )
}
