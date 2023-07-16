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

		mySqlHost: document.querySelector('#mysql-host') as SlInput,
		mySqlUser: document.querySelector('#mysql-user') as SlInput,
		mySqlPassword: document.querySelector('#mysql-password') as SlInput,
		mySqlDatabase: document.querySelector('#mysql-database') as SlInput,

		submitButton: document.querySelector('#submit') as SlButton,
	};

	// * Setup button click handler
	Elements.submitButton.addEventListener('click', async () => {

		// Base configuration values
		const config: UserConfiguration = {
			uploadsDir: Elements.dirInput.value,
			idType: Elements.idTypeInput.value as IdType,
			idSize: parseInt(Elements.idSizeInput.value),
			gfySize: parseInt(Elements.gfySizeInput.value),
			maximumFileSize: parseInt(Elements.fileSizeInput.value),
		};

		// Append S3 to config, if specified
		if (Elements.s3endpoint.value != null && Elements.s3endpoint.value !== '') {
			config.s3 = {
				endpoint: Elements.s3endpoint.value,
				bucket: Elements.s3bucket.value,
				credentials: {
					accessKey: Elements.s3accessKey.value,
					secretKey: Elements.s3secretKey.value
				}
			};

			// Also append region, if it was provided
			if (Elements.s3region.value != null && Elements.s3region.value !== '')
				config.s3.region = Elements.s3region.value;
		}

		// Append MySQL to config, if specified
		if (Elements.mySqlHost.value != null && Elements.mySqlHost.value !== '') {
			if (!config.sql) config.sql = {};
			config.sql.mySql = {
				host: Elements.mySqlHost.value,
				user: Elements.mySqlUser.value,
				password: Elements.mySqlPassword.value,
				database: Elements.mySqlDatabase.value
			};
		}

		// Do setup
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
