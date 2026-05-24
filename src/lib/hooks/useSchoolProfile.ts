'use client'

import { useState, useEffect } from 'react'

export interface SchoolProfile {
  agrupamento: string   // "Agrupamento de Escolas de Xpto"
  escola: string        // "Escola EB 2,3 de Xpto"
  concelho: string
  anoLetivo: string     // "2025 / 2026"
  logoDataUrl: string   // base64 PNG/JPG — vazio = sem logótipo
}

const DEFAULT: SchoolProfile = {
  agrupamento: '',
  escola: '',
  concelho: '',
  anoLetivo: '2025 / 2026',
  logoDataUrl: '',
}

const KEY = 'profai_school_profile'

export function useSchoolProfile() {
  const [profile, setProfile] = useState<SchoolProfile>(DEFAULT)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setProfile({ ...DEFAULT, ...JSON.parse(raw) })
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  function saveProfile(p: SchoolProfile) {
    setProfile(p)
    try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ }
  }

  const hasProfile = loaded && (!!profile.agrupamento || !!profile.escola)

  return { profile, saveProfile, hasProfile, loaded }
}
