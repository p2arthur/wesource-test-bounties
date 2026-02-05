import { ReactNode } from 'react'

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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative z-10 w-full mx-4 ${panelClassName}`}>
        <div className="bg-white rounded-md border-b-4 border-2 border-black p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`w-10 h-10 border-2 border-black flex items-center justify-center ${iconWrapperClassName}`}>{icon}</div>
              )}
              <h3 className="text-xl font-bold text-black">{title}</h3>
            </div>
            <button type="button" onClick={onClose} className="btn-secondary w-8 h-8 p-0 flex items-center justify-center">
              x
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
