import { SlInput, SlButton } from '@shoelace-style/shoelace';
import { IdType, UserConfiguration } from 'ass';

const genericErrorAlert = () => alert('An error occured, please check the console for details');
const errAlert = (logTitle: string, err: any, stream: 'error' | 'warn' = 'error') => (console[stream](logTitle, err), genericErrorAlert());

// * Wait for the document to be ready
document.addEventListener('DOMContentLoaded', () => {

	const Elements = {
		dirInput: document.querySelector('#uploads-dir') as SlInput,
		idTypeInput: document.querySelector('#uploads-idtype') as SlInput,
		idSizeInput: document.querySelector('#uploads-idsize') as SlInput,
		gfySizeInput: document.querySelector('#uploads-gfysize') as SlInput,
		fileSizeInput: document.querySelector('#uploads-filesize') as SlInput,

		s3endpoint: document.querySelector('#s3-endpoint') as SlInput,
		s3bucket: document.querySelector('#s3-bucket') as SlInput,
		s3accessKey: document.querySelector('#s3-accessKey') as SlInput,
		s3secretKey: document.querySelector('#s3-secretKey') as SlInput,
		s3region: document.querySelector('#s3-region') as SlInput,

		submitButton: document.querySelector('#submit') as SlButton,
	};

	// * Setup button click handler
	Elements.submitButton.addEventListener('click', async () => {

		const config: UserConfiguration = {
			uploadsDir: Elements.dirInput.value,
			idType: Elements.idTypeInput.value as IdType,
			idSize: parseInt(Elements.idSizeInput.value),
			gfySize: parseInt(Elements.gfySizeInput.value),
			maximumFileSize: parseInt(Elements.fileSizeInput.value),
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
