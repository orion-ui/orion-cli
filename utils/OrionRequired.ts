import * as fs from 'fs-extra';
import { BASE_SETUP_SERVICE, SETUP_SERVICE_PATH, SHIMS_ORION, formatString, makePath, relativePath } from './tools';
import OrionConfig from './OrionConfig';
import { log } from '@clack/prompts';

export default class OrionRequired {
	config: InstanceType<typeof OrionConfig>['config'];

	get baseSetupServiceFileFullPath () {
		return makePath(SETUP_SERVICE_PATH, `${formatString(BASE_SETUP_SERVICE, this.config.fileNamingStyle)}.ts`);
	}

	get baseSetupServiceFileRelativePath () {
		return relativePath(this.baseSetupServiceFileFullPath).replace(/src\/setup\/?/, '');
	}


	constructor () {
		this.initAsync();
	}


	async initAsync () {
		this.config = await new OrionConfig().loadConfigAsync();
	}

	async checkBaseSetupServiceFileAsync () {
		if (!fs.existsSync(this.baseSetupServiceFileFullPath)) {
			await fs.copy(
				makePath(__dirname, 'template', 'services', `${BASE_SETUP_SERVICE}.ts.template`),
				this.baseSetupServiceFileFullPath,
			);

			log.success(`${SETUP_SERVICE_PATH}${this.baseSetupServiceFileRelativePath} created`);
		}
	}

	async checkOrionShimsFileAsync () {
		const orionShimsFileFullPath = makePath('./src', SHIMS_ORION);

		if (!fs.existsSync(orionShimsFileFullPath)) {
			await fs.copy(
				makePath(__dirname, 'template', 'shims-orion.d.ts.template'),
				orionShimsFileFullPath,
			);

			log.success(`./src/${SHIMS_ORION} created`);
		}
	}
}
