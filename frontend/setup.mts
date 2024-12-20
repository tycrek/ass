import { SlInput, SlButton, SlTab } from '@shoelace-style/shoelace';
import { IdType, UserConfiguration } from 'ass';

const genericErrorAlert = () => alert('An error occured, please check the console for details');
const errAlert = (logTitle: string, err: any, stream: 'error' | 'warn' = 'error') => (console[stream](logTitle, err), genericErrorAlert());
const errReset = (message: string, element: SlButton) => (element.disabled = false, alert(message));
const genericRateLimit = (config: object, category: string, submitButton: SlButton, requests: SlInput, time: SlInput) => {
	if ((requests.value || time.value) != '') {
		if (requests.value == '') {
			errReset(`No count for ${category} rate limit`, submitButton);
			return true; // this should probably be false but this lets us chain this until we see an error
		}

		if (time.value == '') {
			errReset(`No time for ${category} rate limit`, submitButton);
			return true;
		}

		(config as any)[category] = {
			requests: parseInt(requests.value),
			duration: parseInt(time.value),
		};
	}

	return false;
};

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

		jsonTab: document.querySelector('#json-tab') as SlTab,

		mySqlTab: document.querySelector('#mysql-tab') as SlTab,
		mySqlHost: document.querySelector('#mysql-host') as SlInput,
		mySqlPort: document.querySelector('#mysql-port') as SlInput,
		mySqlUser: document.querySelector('#mysql-user') as SlInput,
		mySqlPassword: document.querySelector('#mysql-password') as SlInput,
		mySqlDatabase: document.querySelector('#mysql-database') as SlInput,

		pgsqlTab: document.querySelector('#pgsql-tab') as SlTab,
		pgsqlHost: document.querySelector('#pgsql-host') as SlInput,
		pgsqlPort: document.querySelector('#pgsql-port') as SlInput,
		pgsqlUser: document.querySelector('#pgsql-user') as SlInput,
		pgsqlPassword: document.querySelector('#pgsql-password') as SlInput,
		pgsqlDatabase: document.querySelector('#pgsql-database') as SlInput,

		userUsername: document.querySelector('#user-username') as SlInput,
		userPassword: document.querySelector('#user-password') as SlInput,

		ratelimitLoginRequests: document.querySelector('#ratelimit-login-requests') as SlInput,
		ratelimitLoginTime: document.querySelector('#ratelimit-login-time') as SlInput,
		ratelimitApiRequests: document.querySelector('#ratelimit-api-requests') as SlInput,
		ratelimitApiTime: document.querySelector('#ratelimit-api-time') as SlInput,
		ratelimitUploadRequests: document.querySelector('#ratelimit-upload-requests') as SlInput,
		ratelimitUploadTime: document.querySelector('#ratelimit-upload-time') as SlInput,

		submitButton: document.querySelector('#submit') as SlButton,
	};

	// * Setup button click handler
	Elements.submitButton.addEventListener('click', async () => {
		Elements.submitButton.disabled = true;

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

		// Append database to config, if specified
		if (Elements.jsonTab.active) {
			config.database = {
				kind: 'json'
			};
		} else if (Elements.mySqlTab.active) {
			if (Elements.mySqlHost.value != null && Elements.mySqlHost.value != '') {
				config.database = {
					kind: 'mysql',
					options: {
						host: Elements.mySqlHost.value,
						port: parseInt(Elements.mySqlPort.value),
						user: Elements.mySqlUser.value,
						password: Elements.mySqlPassword.value,
						database: Elements.mySqlDatabase.value
					}
				};
			}
		} else if (Elements.pgsqlTab.active) {
			if (Elements.pgsqlHost.value != null && Elements.pgsqlHost.value != '') {
				config.database = {
					kind: 'postgres',
					options: {
						host: Elements.pgsqlHost.value,
						port: parseInt(Elements.pgsqlPort.value),
						user: Elements.pgsqlUser.value,
						password: Elements.pgsqlPassword.value,
						database: Elements.pgsqlDatabase.value
					}
				};
			}
		}

		// append rate limit config, if specified
		if ((
			Elements.ratelimitLoginRequests.value
			|| Elements.ratelimitLoginTime.value
			|| Elements.ratelimitUploadRequests.value
			|| Elements.ratelimitUploadTime.value
			|| Elements.ratelimitApiRequests.value
			|| Elements.ratelimitApiTime.value) != ''
		) {
			if (!config.rateLimit) config.rateLimit = {};

			if (
				genericRateLimit(config.rateLimit, 'login', Elements.submitButton, Elements.ratelimitLoginRequests, Elements.ratelimitLoginTime)
				|| genericRateLimit(config.rateLimit, 'api', Elements.submitButton, Elements.ratelimitApiRequests, Elements.ratelimitApiTime)
				|| genericRateLimit(config.rateLimit, 'upload', Elements.submitButton, Elements.ratelimitUploadRequests, Elements.ratelimitUploadTime)
			) {
				return;
			}
		}

		// ! Make sure the admin user fields are set
		if (Elements.userUsername.value == null || Elements.userUsername.value === '')
			return errReset('Admin username is required!', Elements.submitButton);
		if (Elements.userPassword.value == null || Elements.userPassword.value === '')
			return errReset('Admin password is required!', Elements.submitButton);

		// Do setup
		fetch('/api/setup', {
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

				// Create first user (YES I KNOW THIS NESTING IS GROSS)
				else return fetch('/api/user', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						username: Elements.userUsername.value,
						password: Elements.userPassword.value,
						admin: true
					})
				}).then((res) => res.json())
					.then((data: {
						success: boolean,
						message: string
					}) => {
						if (data.success) window.location.href = '/admin';
						else alert(data.message);
					});
			})
			.catch((err) => errAlert('POST to /api/setup failed!', err))
			.finally(() => Elements.submitButton.disabled = false);
	});
});
