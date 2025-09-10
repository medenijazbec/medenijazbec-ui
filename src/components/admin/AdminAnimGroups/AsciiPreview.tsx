import React, { useEffect, useRef, useState } from 'react'
import { AsciiBadger } from '@/components/badger/badger.logic'
import { ANIM_DIR } from '@/components/badger/badger.constants'

type Props = { fileName?: string }

export const AsciiPreview: React.FC<Props> = ({ fileName }) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [core, setCore] = useState<AsciiBadger | null>(null)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    if (!mountRef.current) return
    const instance = new AsciiBadger(mountRef.current, setStatus)
    setCore(instance)
    return () => instance.dispose()
  }, [])

  useEffect(() => {
    if (!core || !fileName) return
    core.loadClipPath(fileName)
  }, [core, fileName])

  return (
    <div style={{ height: 360, width: '100%', border: '1px solid rgba(16,185,129,.4)', borderRadius: 8, overflow: 'hidden' }}>
      <div ref={mountRef} style={{ height: '100%', width: '100%' }} />
      <div style={{ fontSize: 12, padding: 6, color: '#7ef2b7' }}>{status}</div>
    </div>
  )
}
