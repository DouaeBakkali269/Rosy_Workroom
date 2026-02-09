import { useEffect } from 'react'

export default function useLockBodyScroll(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined

    const body = document.body
    const count = Number(body.dataset.scrollLockCount || '0')
    const nextCount = count + 1
    body.dataset.scrollLockCount = String(nextCount)

    if (nextCount === 1) {
      body.dataset.scrollLockOriginalOverflow = body.style.overflow || ''
      body.classList.add('modal-open')
      body.style.overflow = 'hidden'
    }

    return () => {
      const current = Number(body.dataset.scrollLockCount || '0')
      const remaining = Math.max(current - 1, 0)
      body.dataset.scrollLockCount = String(remaining)

      if (remaining === 0) {
        body.classList.remove('modal-open')
        body.style.overflow = body.dataset.scrollLockOriginalOverflow || ''
        delete body.dataset.scrollLockOriginalOverflow
      }
    }
  }, [isLocked])
}
