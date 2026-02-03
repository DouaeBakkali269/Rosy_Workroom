import { useEffect } from 'react'

export default function useLockBodyScroll(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.classList.add('modal-open')
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.overflow = originalOverflow
    }
  }, [isLocked])
}
