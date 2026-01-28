interface CardProps {
    children: React.ReactNode
    className?: string
    padding?: 'none' | 'sm' | 'md' | 'lg'
    hover?: boolean
    onClick?: () => void
}

const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
}

export function Card({
    children,
    className = '',
    padding = 'md',
    hover = false,
    onClick
}: CardProps) {
    const isClickable = !!onClick

    return (
        <div
            onClick={onClick}
            className={`
        bg-surface rounded-lg border border-border shadow-soft
        ${paddingStyles[padding]}
        ${hover || isClickable ? 'hover:shadow-medium hover:border-primary/20 transition-all duration-200' : ''}
        ${isClickable ? 'cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    )
}

// Card Header subcomponent
export function CardHeader({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`border-b border-border pb-4 mb-4 ${className}`}>
            {children}
        </div>
    )
}

// Card Title subcomponent
export function CardTitle({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return (
        <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
            {children}
        </h3>
    )
}

// Card Content subcomponent
export function CardContent({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={className}>
            {children}
        </div>
    )
}

// Card Footer subcomponent
export function CardFooter({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`border-t border-border pt-4 mt-4 ${className}`}>
            {children}
        </div>
    )
}
