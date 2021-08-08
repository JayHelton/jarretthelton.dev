module.exports = {
  darkMode: 'class',
  purge: {
    mode: "all",
    content: ["./**/*.html"],
    options: {
      whitelist: [],
    },
  },
  theme: {
    container: {
      center: true,
    },
     extend: {
      typography(theme) {
        return {
          DEFAULT: {
            css: {
              color: theme("colors.gray.300"),
              '[class~="lead"]': { color: theme("colors.gray.400") },
              a: { color: theme("colors.gray.100") },
              strong: { color: theme("colors.gray.100") },
              code: { color: theme("colors.pink.700") },
              "ul > li::before": { backgroundColor: theme("colors.pink.700") },
              "ol > li::before": { color: theme("colors.pink.700") },
              hr: { borderColor: theme("colors.pink.700") },
              blockquote: {
                color: theme("colors.gray.100"),
                borderLeftColor: theme("colors.pink.700"),
              },
              h1: { color: theme("colors.gray.100") },
              h2: { color: theme("colors.gray.100") },
              h3: { color: theme("colors.gray.100") },
              h4: { color: theme("colors.gray.100") },
              thead: {
                color: theme("colors.gray.100"),
                borderBottomColor: theme("colors.gray.700"),
              },
              "tbody tr": { borderBottomColor: theme("colors.gray.800") },
            },
          },
        };
      },
    },
  },
  variants: {
  },
  plugins: [require("@tailwindcss/typography")],
};
