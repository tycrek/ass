
export class UserConfig {
	private config: UserConfiguration;
	public getConfig = () => this.config;

	constructor(config?: UserConfiguration) {
}
