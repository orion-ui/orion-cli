import * as fs from 'fs-extra';
import { isCancel, log, text, confirm } from '@clack/prompts';
import { dash } from 'radash';
import { DEFAULT_CONFIG, applyNamingStyleAsync, checkCurrentFolderIsProjectAsync, clackLog, isVerbose, makePath, relativePath, useSpinnerAsync } from './tools';
import OrionConfig from './OrionConfig';
import picocolors from 'picocolors';

export default class MakeProject {
	config: InstanceType<typeof OrionConfig>['config'];
	projectName: string;
	projectFolder: string;
	projectPath: string;


	async initAsync () {
		await this.checkCurrentFolderAsync();
		await this.setProjectNameAsync();
		await this.createProjectFolderAsync();
		await this.setOrionCliConfigAsync();
		await this.copyTemplateFilesAsync();
		await this.displayNextStepsAsync();
	}


	private async checkCurrentFolderAsync () {
		if (await checkCurrentFolderIsProjectAsync(false)) {
			const shouldContinue = await confirm({
				message: `You are already in a project, continue the process?`,
				initialValue: false,
			});

			if (isCancel(shouldContinue)) throw 'Operation cancelled';
			if (!shouldContinue) throw 'Aborted: already in a project folder';
		}
	}

	private async setProjectNameAsync () {
		this.projectName = await text({
			message: `What's the name of your project?`,
			placeholder: `Project name`,
			validate (value) {
				if (!value.trim().length) {
					return `You need to specify a name for your package`;
				}
			},
		}) as string;

		if (isCancel(this.projectName)) throw `Operation cancelled`;

		this.projectFolder = dash(this.projectName);
		this.projectPath = makePath(this.projectFolder);

		log.info(`Ok let's create the ${picocolors.bgBlue(` ${this.projectName} `)} project`);
	}

	private async createProjectFolderAsync () {
		if (fs.existsSync(this.projectPath)) {
			log.warn(`${picocolors.yellow(this.projectPath)} already exists...`);
			const shouldContinue = await confirm({
				message: `Should we replace it?`,
				initialValue: false,
			});

			if (isCancel(shouldContinue)) throw `Operation cancelled`;

			if (!shouldContinue) {
				throw `The target path already exists and won't be replaced`;
			} else {
				await fs.remove(this.projectPath);
			}
		}

		await useSpinnerAsync(
			`Creating project folder`,
			() => fs.mkdir(this.projectPath),
			`${picocolors.blue(this.projectPath)} folder created`,
		);
	}

	private async setOrionCliConfigAsync () {
		this.config = await new OrionConfig().loadConfigAsync(this.projectPath);
	}

	private async copyTemplateFilesAsync () {
		// copyFilter for local development
		const copyFilter = (src) => {
			const exclude = [
				/\.git$/,
				/\.DS_Store/,
			];

			for (const regex of exclude) {
				if (regex.test(src)) return false;
			}

			return true;
		};

		await useSpinnerAsync(
			`Copying template files`,
			async () => {
				this.config.useSetupService
					? await fs.copy(`${__dirname}/__template-setup-service__`, this.projectPath, { filter: copyFilter })
					: await fs.copy(`${__dirname}/__template-classic__`, this.projectPath, { filter: copyFilter });
			},
			`Project scaffolded in ${picocolors.blue(this.projectPath)}`,
		);

		if (this.config.fileNamingStyle !== DEFAULT_CONFIG.fileNamingStyle || this.config.folderNamingStyle !== DEFAULT_CONFIG.folderNamingStyle) {
			process.chdir(this.projectFolder);
			await applyNamingStyleAsync(this.config);
			process.chdir('../');
		}

		if (isVerbose()) {
			const files = [];
			const readdirRecursive = (path: string = this.projectFolder) => {
				fs.readdirSync(path, { withFileTypes: true }).forEach((x) => {
					if (x.isFile()) {
						files.push(`${relativePath(path)}/${x.name}`);
					} else {
						readdirRecursive(makePath(path, x.name));
					}
				});
			};

			readdirRecursive();

			log.message();
			files.forEach((x) => {
				const isVue = /\.vue$/.test(x);
				const isTs = /\.ts$/.test(x);

				if (isVue) {
					clackLog(x, 'green');
				} else if (isTs) {
					clackLog(x, 'blue');
				} else {
					clackLog(x, 'white');
				}
			});
		}
	}

	private async displayNextStepsAsync () {
		log.success(`Your project is ready!\nNext Steps:`);
		log.message([
			`cd ${this.projectFolder}`,
			`npm install`,
			`npm run dev`,
		].map(x => picocolors.green(x)).join('\n'));
	}
}
