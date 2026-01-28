import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
    text?: string
}

const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <Loader2 className={`animate-spin text-primary ${sizeStyles[size]}`} />
            {text && <p className="text-sm text-text-secondary">{text}</p>}
        </div>
    )
}

// Full page loading overlay
export function LoadingOverlay({ text = 'Carregando...' }: { text?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <LoadingSpinner size="lg" text={text} />
        </div>
    )
}
