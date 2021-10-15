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
			fontFamily: {
				main: ['"Josefin Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
			},
			backgroundColor: {
				'body': '#212121',
			},
			colors: {
				'content-bg': '#151515',
				'primary': '#FD842D',
				'primary-dim': '#B64D02',
				'primary-dark': '#793301',
				'link-hover': '#FD710D',
				'link-active': '#DE5E02',
				'text-primary': '#BDBDBD',
			},
			borderColor: {
				'primary-dim': '#B64D02'
			},
			maxHeight: {
				'half-port': '50vh'
			},
			borderRadius: {
				'24': '24px'
			},
			fontSize: {
				'footer': '0.9rem'
			}
		}
	}
};
