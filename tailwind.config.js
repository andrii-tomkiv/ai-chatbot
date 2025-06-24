/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surrogates (GC) colors
        gc: {
          'light-background': '#faeff0',
          'dark-background': '#4f163b',
          'header': '#7a1444',
          'action': '#be1e68',
          'action-darken': '#be1e68',
          'action-lighten': '#e16ba6',
          'radial-center': '#691f50',
          'modal-background': '#4f163b',
          'action-red': '#f05569',
          'purple': '#914e7a',
        },
        // Egg donor (ED) colors
        ed: {
          'light-background': '#eefbfa',
          'dark-background': '#083030',
          'header': '#12514c',
          'action': '#1a7b74',
          'radial-center': '#0b4442',
          'action-lighten': '#0da5a5',
          'action-darken': '#0d2a2a',
        },
        // Intended Parents (IP) colors
        ip: {
          'light-background': '#faf9f9',
          'dark-background': '#3e4152',
          'header': '#717487',
          'action': '#846f45',
          'light-text': '#cead6b',
          'light-text-lighten': '#f4e4c3',
          'radial-center': '#4c5067',
        },
        // Conab Colors
        conab: {
          'light-background': '#fdf6f4',
          'dark-background': '#013141',
          'header': '#063b50',
          'header-darken': '#062a32',
          'action': '#be1e68',
          'action-lighten': '#cf307a',
          'dark-blue': '#001b24',
          'middle-blue': '#004a63',
          'modal-background': '#004a63',
          'green': '#4D9544',
        },
      },
    },
  },
  plugins: [],
} 