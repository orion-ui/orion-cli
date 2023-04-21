import * as fs from 'fs-extra';
import picocolors from 'picocolors';
import { CONFIG_FILE, DEFAULT_CONFIG, MAGICAST_GENERATE_OPTIONS,
	NamingStyle, OrionCliConfig, applyNamingStyleAsync, checkCurrentFolderIsProjectAsync, clackLog, makePath } from './tools';
import { cancel, confirm, group, isCancel, log, note, select } from '@clack/prompts';
import { loadFile, parseModule, writeFile } from 'magicast';

const namingStyleoptions: {value: NamingStyle, label: NamingStyle}[] = [
	{
		value: 'PascalCase',
		label: 'PascalCase',
	},
	{
		value: 'camelCase',
		label: 'camelCase',
	},
	{
		value: 'kebab-case',
		label: 'kebab-case',
	},
];


export default class OrionConfig {
	private privateConfig: OrionCliConfig = { ...DEFAULT_CONFIG };

	private get config () {
		return { ...this.privateConfig };
	}


	async initAsync () {
		await checkCurrentFolderIsProjectAsync();
		await this.checkConfigFileAsync(true);
		await this.renameFilesAndFoldersAsync();
	}

	async loadConfigAsync (path?: string) {
		path
			? await this.createConfigFileAsync(path)
			: await this.checkConfigFileAsync();

		return this.config;
	}

	private async checkConfigFileAsync (overwrite = false) {
		if (fs.existsSync(makePath(process.cwd(), CONFIG_FILE))) {
			const res = await loadFile(CONFIG_FILE);
			Object.assign(this.privateConfig, res.exports.default);

			if (overwrite) await this.createConfigFileAsync();
		} else {
			log.warn(`Warning: ${CONFIG_FILE} is missing, should I create it ?`);

			const createConfigFile = await confirm({ message: `Create config file?` }) as boolean;

			if (isCancel(createConfigFile) || !createConfigFile) {
				throw `Aborted: config file missing.`;
			} else {
				await this.createConfigFileAsync();
			}
		}
	}

	private async createConfigFileAsync (path = process.cwd()) {
		await this.setupConfigAsync();

		const mod = parseModule(`export default {}`);
		Object.assign(mod.exports.default, this.privateConfig);

		const { code } = mod.generate(MAGICAST_GENERATE_OPTIONS);
		await writeFile(mod.$ast, makePath(path, CONFIG_FILE), MAGICAST_GENERATE_OPTIONS);

		log.success(`Created ${CONFIG_FILE} with following content`);
		note(code);
	}

	private async setupConfigAsync () {
		const config = await group(
			{
				fileNamingStyle: () => select({
					message: `Select file naming style`,
					options: [...namingStyleoptions] as unknown as {value: void, label: string}[],
					initialValue: this.privateConfig.fileNamingStyle as unknown as void,
				}),
				folderNamingStyle: () => select({
					message: `Select folder naming style`,
					options: [...namingStyleoptions] as unknown as {value: void, label: string}[],
					initialValue: this.privateConfig.folderNamingStyle as unknown as void,
				}),
				useSetupService: () => confirm({
					message: `Use SetupService philosophy?`,
					initialValue: this.privateConfig.useSetupService,
				}),
			},
			{
				onCancel: () => {
					cancel('Operation cancelled.');
					process.exit(0);
				},
			},
		) as typeof this.privateConfig;

		Object.assign(this.privateConfig, config);
	}

	async renameFilesAndFoldersAsync () {
		log.info(picocolors.blue(`Should we rename files and folders based on your config?`));
		clackLog(`You may commit your changes before.`, 'yellow');
		const shouldContinue = await confirm({
			message: `Rename files and folders based on your config?`,
			initialValue: true,
		});

		if (isCancel(shouldContinue) || !shouldContinue) return;

		await applyNamingStyleAsync(this.config);
	}
}
