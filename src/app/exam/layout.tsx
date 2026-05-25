export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#F7F3EE' }}>
      <header className="border-b bg-white px-6 py-3 flex items-center gap-3 shadow-sm">
        <span className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
          PROF.IA
        </span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#00B4D820', color: '#00B4D8' }}>
          Exame
        </span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
