interface LoadingPairProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizeClasses = {
  sm: 'h-32 w-32',
  md: 'h-32 w-32',
  lg: 'h-32 w-32',
}

export default function LoadingPair({ size = 'md', label = 'Loading...', className = '' }: LoadingPairProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <img src="/wecoop_loading.gif" alt="Loading" className={`${sizeClasses[size]} h-32 object-contain`} />
      <span className="text-black font-medium">{label}</span>
    </div>
  )
}
