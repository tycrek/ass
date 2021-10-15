module.exports = {
	mode: 'jit',
	separator: '_',
	darkMode: 'class',
	plugins: [
		//require('tailwindcss-textshadow')
	],
	purge: {
		enabled: false,
		content: ['./views/**/*.pug']
	},
	theme: {
		extend: {
			colors: {
				'border': '#323232'
			}
		}
	}
};