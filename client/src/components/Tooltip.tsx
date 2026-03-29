import { ReactNode } from 'react'
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { FiHelpCircle } from 'react-icons/fi'

interface TooltipProps {
  text: string
  children?: ReactNode
  className?: string
}

export default function Tooltip({ text, children, className = '' }: TooltipProps) {
  return (
    <TooltipProvider>
      <ShadcnTooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center text-text-muted hover:text-text-secondary cursor-help transition-colors ${className}`}>
            {children ?? <FiHelpCircle className="w-4 h-4" />}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{text}</p>
        </TooltipContent>
      </ShadcnTooltip>
    </TooltipProvider>
  )
}
