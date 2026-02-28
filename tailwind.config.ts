import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './sites/*/src/**/*.{js,ts,jsx,tsx}',
    './packages/**/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
      },
    },
  },
  plugins: [],
}

export default config
