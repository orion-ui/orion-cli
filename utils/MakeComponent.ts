import * as fs from 'fs-extra';
import { cancel, confirm, group, isCancel, log, text } from '@clack/prompts';
import { BASE_SETUP_SERVICE, COMPONENTS_PATH, SETUP_SERVICE_PATH, checkCurrentFolderIsProjectAsync, formatString, makePath, relativePath } from './tools';
import OrionConfig from './OrionConfig';
import OrionRequired from './OrionRequired';

export default class MakeComponent {
	config: InstanceType<typeof OrionConfig>['config'];
	required: OrionRequired;
	componentName: string;
	componentPath: string;

	private get componentFullPath () {
		return makePath(
			COMPONENTS_PATH,
			...this.componentPath
				.replace(COMPONENTS_PATH, '')
				.split('/')
				.map(x => formatString(x, this.config.folderNamingStyle)),
		);
	}

	private get componentFileFullPath () {
		return makePath(this.componentFullPath, `${formatString(this.componentName, this.config.fileNamingStyle)}.vue`);
	}

	private get componentRelativePath () {
		return relativePath(this.componentFullPath).replace(/src\/components\/?/, '');
	}

	private get componentFileRelativePath () {
		return relativePath(this.componentFileFullPath).replace(/src\/components\/?/, '');
	}

	private get setupServiceName () {
		return `${formatString(this.componentName, 'PascalCase')}SetupService`;
	}

	private get setupServiceFullPath () {
		return makePath(
			SETUP_SERVICE_PATH,
			...this.componentPath
				.replace(COMPONENTS_PATH, '')
				.split('/')
				.map(x => formatString(x, this.config.folderNamingStyle)),
		);
	}

	private get setupServiceFileFullPath () {
		return makePath(this.setupServiceFullPath, `${formatString(this.setupServiceName, this.config.fileNamingStyle)}.ts`);
	}

	private get setupServiceRelativePath () {
		return relativePath(this.setupServiceFullPath).replace(/src\/setup\/?/, '');
	}

	private get setupServiceFileRelativePath () {
		return relativePath(this.setupServiceFileFullPath).replace(/src\/setup\/?/, '');
	}


	async initAsync () {
		await checkCurrentFolderIsProjectAsync();

		this.config = await new OrionConfig().loadConfigAsync();
		this.required = await new OrionRequired();

		await this.promptComponentNameAsync();
		await this.writeComponentFileAsync();
	}


	private async promptComponentNameAsync () {
		const res = await group(
			{
				componentName: () => text({
					message: `What's the name of the component?`,
					validate (value) {
						if (!value?.trim().length) return `Component's name is required`;
					},
				}),
				componentPath: () => text({
					message: `What's the path?`,
					initialValue: COMPONENTS_PATH,
					validate (value) {
						if (!value?.trim().length) return `Component's name is required`;
						if (!/^\.\/src\/components/.test(value)) return `Path should be in ./src/components folder`;
					},
				}),
			},
			{
				onCancel: () => {
					cancel('Operation cancelled.');
					process.exit(0);
				},
			},
		) as {componentName: string, componentPath: string};

		this.componentName = res.componentName;
		this.componentPath = res.componentPath;
	}

	private async writeComponentFileAsync () {
		let withSetupService = this.config.useSetupService;

		if (withSetupService) {
			const confirmSetupService = await confirm({
				message: `Create SetupService for the component?`,
				initialValue: true,
			}) as boolean;

			if (isCancel(confirmSetupService)) {
				withSetupService = this.config.useSetupService;
			} else {
				withSetupService = confirmSetupService;
			}
		}

		if (fs.existsSync(this.componentFileFullPath)) {
			log.error(`Aborted: Component file already exists`);
		} else {
			const vueTemplate = withSetupService
				? await fs.readFile(makePath(__dirname, 'template/components', 'SetupServiceComponent.vue.template'), { encoding: 'utf-8' })
				: await fs.readFile(makePath(__dirname, 'template/components', 'Component.vue.template'), { encoding: 'utf-8' });

			const vueFileContent = vueTemplate
				.replace(/{ComponentName}/g, formatString(this.componentName, 'PascalCase'))
				.replace(/{Folder}/g, this.componentRelativePath)
				.replace(/{SetupServicePath}/g, this.setupServiceFileRelativePath.replace(/\.ts$/, ''));

			await fs.mkdir(this.componentFullPath, { recursive: true });
			await fs.writeFile(this.componentFileFullPath, vueFileContent, { encoding: 'utf-8' });
			log.success(`${COMPONENTS_PATH}${this.componentFileRelativePath} created`);
			// note(vueFileContent);
		}

		if (withSetupService) {
			await this.writeSetupServiceFileAsync();
		}
	}

	private async writeSetupServiceFileAsync () {
		if (fs.existsSync(this.setupServiceFileFullPath)) {
			log.error(`Aborted: SetupService file already exists`);
		} else {
			const setupServiceTemplate = await fs.readFile(makePath(__dirname, 'template/services', 'SetupService.ts.template'), { encoding: 'utf-8' });
			const setupServiceFileContent = setupServiceTemplate
				.replace(/{ServiceName}/g, this.setupServiceName)
				.replace(/{ServiceAbstract}/g, ' ')
				.replace(/{BaseServiceName}/g, BASE_SETUP_SERVICE)
				.replace(/{BaseServicePath}/g, this.required.baseSetupServiceFileRelativePath.replace(/\.ts$/, ''));

			await fs.mkdir(this.setupServiceFullPath, { recursive: true });
			await fs.writeFile(this.setupServiceFileFullPath, setupServiceFileContent, { encoding: 'utf-8' });
			log.success(`${SETUP_SERVICE_PATH}${this.setupServiceFileRelativePath} created`);
			// note(setupServiceFileContent);
		}

		await this.required.checkBaseSetupServiceFileAsync();
		await this.required.checkOrionShimsFileAsync();
	}
}
