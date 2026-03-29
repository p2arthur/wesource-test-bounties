import { ReactNode } from 'react'
import { FiX } from 'react-icons/fi'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: ReactNode
  iconWrapperClassName?: string
  panelClassName?: string
  children: ReactNode
}

export default function Modal({
  open,
  onClose,
  title,
  icon,
  iconWrapperClassName = '',
  panelClassName = 'max-w-lg',
  children,
}: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full mx-4 ${panelClassName}`}>
        <div className="rounded-lg border border-border-default bg-bg-elevated shadow-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`w-9 h-9 rounded-md border border-border-default flex items-center justify-center ${iconWrapperClassName}`}>
                  {icon}
                </div>
              )}
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm p-1 text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <FiX className="w-5 h-5" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
