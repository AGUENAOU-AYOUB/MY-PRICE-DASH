/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{ts,tsx}",
        "./lib/**/*.{ts,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: "#ff6f61",     // Azor orange
                    dark: "#e85c4f"
                }
            },
            fontFamily: {
                sans: ["Inter", "ui-sans-serif", "system-ui"]
            },
            boxShadow: {
                card: "0 4px 12px rgba(0,0,0,.08)"
            }
        },
    },
    plugins: [],
}
