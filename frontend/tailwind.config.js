export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    fontFamily: { sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'] },
    colors: {
      bone: '#F5F5F1', paper: '#FBFBF9', ink: '#22262A', mute: '#6B7177', line: '#DCDCD5',
      moss: { DEFAULT: '#4F7458', dark: '#3B5943', soft: '#E4ECE5' },
      amber: { DEFAULT: '#B7791F', soft: '#F5EBD6' },
      clay: { DEFAULT: '#A6462E', soft: '#F3E0DA' },
    } } },
  plugins: [],
}
