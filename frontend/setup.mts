import { SlInput, SlButton } from '@shoelace-style/shoelace';
import { IdType, UserConfiguration } from 'ass';

const genericErrorAlert = () => alert('An error occured, please check the console for details');
const errAlert = (logTitle: string, err: any, stream: 'error' | 'warn' = 'error') => (console[stream](logTitle, err), genericErrorAlert());

// * Wait for the document to be ready
document.addEventListener('DOMContentLoaded', () => {

	const dirInputElm = document.querySelector('#dir') as SlInput;
	const idTypeInputElm = document.querySelector('#idtype') as SlInput;
	const idSizeInputElm = document.querySelector('#idsize') as SlInput;
	const gfySizeInputElm = document.querySelector('#gfysize') as SlInput;
	const fileSizeInputElm = document.querySelector('#filesize') as SlInput;
	const submitButtonElm = document.querySelector('#submit') as SlButton;

	// * Setup button click handler
	submitButtonElm.addEventListener('click', async () => {

		const config: UserConfiguration = {
			uploadsDir: dirInputElm.value,
			idType: idTypeInputElm.value as IdType,
			idSize: parseInt(idSizeInputElm.value),
			gfySize: parseInt(gfySizeInputElm.value),
			maximumFileSize: parseInt(fileSizeInputElm.value),
		};

		fetch('/setup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(config)
		})
			.then((res) => res.json())
			.then((data: {
				success: boolean,
				message: string
			}) => {
				if (!data.success) alert(data.message);
				else alert('good?');
			})
			.catch((err) => errAlert('POST to /setup failed!', err));
	});
});
