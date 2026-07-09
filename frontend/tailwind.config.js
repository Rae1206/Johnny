/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta de marca (única fuente de color de la app).
        brand: {
          teal: '#587b7f', // primario / acciones
          ink: '#1e2019', // más oscuro / sidebar / texto fuerte
          forest: '#394032', // oscuro / hover / texto secundario
          sage: '#8dab7f', // medio / bordes / acentos
          lime: '#cfee9e', // claro / fondos / resaltados
        },
      },
    },
  },
  plugins: [],
};
