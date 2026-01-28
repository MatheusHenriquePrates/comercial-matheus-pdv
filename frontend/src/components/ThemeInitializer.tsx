import { useEffect } from 'react'
import { useThemeStore } from '../store/useThemeStore'

/**
 * ThemeInitializer - Ensures theme is properly applied on app mount
 * This component should be rendered once at the root level
 */
export function ThemeInitializer() {
    const { theme } = useThemeStore()

    useEffect(() => {
        // Force initial theme application
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(theme)

        console.log('[ThemeInitializer] Applied theme:', theme)
    }, [theme])

    return null
}
