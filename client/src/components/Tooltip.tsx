import { ReactNode } from 'react'
import { FaQuestionCircle } from 'react-icons/fa'

interface TooltipProps {
  text: string
  children: ReactNode
  className?: string
}

export default function Tooltip({ text, children, className = '' }: TooltipProps) {
  return (
    <span className={`relative inline-flex items-center group ${className}`}>
      <FaQuestionCircle />
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded border-2 border-black bg-white px-2 py-1 text-black opacity-0 shadow group-hover:opacity-100">
        {text}
      </span>
    </span>
  )
}
