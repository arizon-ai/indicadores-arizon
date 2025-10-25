tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                blue: {
                    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
                    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
                    800: '#1e40af', 900: '#1e3a8a'
                },
                light: {
                    bg: '#f3f4f6',
                    card: '#ffffff',
                    border: '#e5e7eb',
                    text_primary: '#111827',
                    text_secondary: '#374151',
                    text_label: '#6b7280',
                },
                context: {
                    positive: '#059669',
                    negative: '#dc2626',
                }
            }
        }
    }
};