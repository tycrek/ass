const primary = '#FD842D';
const primaryDim = '#B64D02';
module.exports = {
	separator: '_',
	darkMode: 'class',
	plugins: [
		//require('tailwindcss-textshadow')
	],
	content: ['./views/**/*.pug'],
	theme: {
		extend: {
			fontFamily: {
				main: ['"Josefin Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
			},
			backgroundColor: {
				'primary': primary,
				'body': '#212121',
			},
			colors: {
				'content-bg': '#151515',
				'primary': primary,
				'primary-dim': primaryDim,
				'primary-dark': '#793301',
				'link-hover': '#FD710D',
				'link-active': '#DE5E02',
				'text-primary': '#BDBDBD',
			},
			borderColor: {
				'primary-dim': primaryDim
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
