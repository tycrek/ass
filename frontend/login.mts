import { SlInput, SlButton } from '@shoelace-style/shoelace';

const genericErrorAlert = () => alert('An error occured, please check the console for details');
const errAlert = (logTitle: string, err: any, stream: 'error' | 'warn' = 'error') => (console[stream](logTitle, err), genericErrorAlert());
const errReset = (message: string, element: SlButton) => (element.disabled = false, alert(message));

// * Wait for the document to be ready
document.addEventListener('DOMContentLoaded', () => {

	const Elements = {
		usernameInput: document.querySelector('#login-username') as SlInput,
		passwordInput: document.querySelector('#login-password') as SlInput,
		submitButton: document.querySelector('#login-submit') as SlButton
	};

	// * Login button click handler
	Elements.submitButton.addEventListener('click', async () => {
		Elements.submitButton.disabled = true;

		// Make sure fields are filled
		if (Elements.usernameInput.value == null || Elements.usernameInput.value === '')
			return errReset('Username is required!', Elements.submitButton);
		if (Elements.passwordInput.value == null || Elements.passwordInput.value === '')
			return errReset('Password is required!', Elements.submitButton);

		fetch('/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				username: Elements.usernameInput.value,
				password: Elements.passwordInput.value
			})
		})
			.then((res) => res.json())
			.then((data: {
				success: boolean,
				message: string,
				meta: { redirectTo: string }
			}) => {
				if (!data.success) alert(data.message);
				else window.location.href = data.meta.redirectTo;
			})
			.catch((err) => errAlert('POST to /api/login failed!', err))
			.finally(() => Elements.submitButton.disabled = false);
	});
});
