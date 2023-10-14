import { SlInput, SlButton } from '@shoelace-style/shoelace';

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
		const errorReset = (message: string) => (Elements.submitButton.disabled = false, alert(message));
		if (Elements.usernameInput.value == null || Elements.usernameInput.value === '')
			return errorReset('Username is required!');
		if (Elements.passwordInput.value == null || Elements.passwordInput.value === '')
			return errorReset('Password is required!');

		alert(`Attempting to login user [${Elements.usernameInput.value}]`);
		Elements.submitButton.disabled = false;
	});
});
