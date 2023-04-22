import * as fs from 'fs-extra';
import { isCancel, log, text } from '@clack/prompts';
import { inOrionRepoAsync, makePath, relativePath } from './tools';
import { pascal } from 'radash';
import picocolors from 'picocolors';

export default class OrionVolar {
	prefix: string;

	async initAsync () {
		await this.promptPrefixAsync();
		await this.writeFileAsync();
	}

	private async promptPrefixAsync () {
		const promptedPrefix = await text({
			message: `Enter the prefix for Orion components?`,
			placeholder: `Need 1 letter min.`,
			initialValue: 'o',
			validate (value) {
				if (value.length === 0) return `Value is required!`;
			},
		});

		if (isCancel(promptedPrefix)) throw `Operation cancelled.`;

		this.prefix = pascal(promptedPrefix);
	}

	private async writeFileAsync () {
		const inOrion = await inOrionRepoAsync();

		const outputPath = makePath(
			inOrion ? 'sandbox' : 'src',
			'orion-volar.d.ts',
		);

		const packagesFolderPath = inOrion
			? makePath('packages')
			: makePath('node_modules/@orion.ui/orion/dist/types/packages');

		const packages = (await fs.readdir(packagesFolderPath, { withFileTypes: true }))
			.filter(x => x.isDirectory() && x.name !== 'Shared')
			.map(x => x.name);

		let content = await fs.readFile(makePath(__dirname, 'template/orion-volar.d.ts.template'), { encoding: 'utf-8' });

		content = content.replace(/{types}/gm, packages.map((x) => {
			if (inOrion) {
				return `${this.prefix}${x}: typeof import('packages/index')['Orion${x}'];`;
			} else {
				return `${this.prefix}${x}: typeof import('@orion.ui/orion/dist/types/packages')['Orion${x}'];`;
			}
		}).join('\n\t\t'));

		await fs.writeFile(outputPath, content, { encoding: 'utf-8' });

		log.success(picocolors.green(`${relativePath(outputPath)} created`));
	}
}
