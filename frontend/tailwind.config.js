/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#22c55e', // Verde vibrante
                    light: '#4ade80',
                    dark: '#16a34a',
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                },
                secondary: {
                    DEFAULT: '#84cc16', // Lima/amarelo-verde
                    light: '#a3e635',
                    dark: '#65a30d',
                },
                accent: {
                    DEFAULT: '#facc15', // Amarelo
                    light: '#fde047',
                    dark: '#eab308',
                },
                danger: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6',
                surface: {
                    DEFAULT: '#ffffff',
                    hover: '#f0fdf4', // Verde bem claro
                },
                background: '#f0fdf4', // Fundo com tom verde suave
                border: '#bbf7d0',
                text: {
                    primary: '#14532d', // Verde escuro
                    secondary: '#166534',
                    disabled: '#86efac',
                },
                status: {
                    open: '#22c55e',
                    closed: '#ef4444',
                    busy: '#f59e0b',
                },
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '8px',
            },
            boxShadow: {
                'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
                'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
                'green': '0 4px 20px rgba(34, 197, 94, 0.25)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
            animation: {
                fadeIn: 'fadeIn 0.15s ease-out',
                slideIn: 'slideIn 0.2s ease-out',
                float: 'float 3s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}
