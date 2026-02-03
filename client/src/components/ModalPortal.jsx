import { createPortal } from 'react-dom'

/**
 * Renders children into document.body so the modal appears above the navbar
 * and everything else (avoids z-index stacking context issues).
 */
export default function ModalPortal({ children }) {
  return createPortal(children, document.body)
}
