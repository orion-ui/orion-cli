import * as fs from 'fs-extra';
import { camel, dash, pascal, sleep } from 'radash';
import { log, spinner } from '@clack/prompts';
import { GenerateOptions } from 'magicast';
import { Colors, Formatter } from 'picocolors/types';
import path from 'node:path';
import gradient from 'gradient-string';
import picocolors from 'picocolors';

const importStatementRegex = /(?<prefix>^import (.*) from ['"])(?<toClean>([\w@\.\/-]*)(setup-service|SetupService|\.vue))(?<suffix>['"];?$)/gm;

export type NamingStyle = 'PascalCase' | 'camelCase' | 'kebab-case'
export type OrionCliConfig = {
	fileNamingStyle: NamingStyle;
	folderNamingStyle: NamingStyle;
	useSetupService: boolean;
}

export const DEFAULT_CONFIG: OrionCliConfig = {
	fileNamingStyle: 'PascalCase',
	folderNamingStyle: 'kebab-case',
	useSetupService: true,
};
export const CONFIG_FILE = 'orion.config.ts';
export const COMPONENTS_PATH = './src/components/';
export const SETUP_SERVICE_PATH = './src/setup/';
export const BASE_SETUP_SERVICE = 'BaseSetupService.ts';
export const SHIMS_ORION = 'shims-orion.d.ts';
export const MAGICAST_GENERATE_OPTIONS: GenerateOptions = {
	quote: 'single',
	useTabs: true,
	tabWidth: 2,
};


export const isVerbose = () => process.argv.includes('--verbose');
export const isDryRun = () => process.argv.includes('--dry-run');


export const orionGradient = (str: string) => {
	return process.stdout.isTTY && process.stdout.getColorDepth() > 8
		? gradient([
			'rgb(165, 118, 249)',
			'rgb(219, 179, 237)',
		])(str)
		: picocolors.magenta(str);
};

export const makePath = (...target: string[]) => {
	return path.resolve(process.cwd(), ...target);
};

export const relativePath = (rawPath: string) => {
	return rawPath.replace(process.cwd(), '').replace(/^\//, '');
};

export const useSpinnerAsync = async (startMessage: string, callback: () => Promise<void>, endMessage: string) => {
	const spin = spinner();
	spin.start(startMessage);
	await callback();
	await sleep(600);
	spin.stop(endMessage);
};

export const checkCurrentFolderIsProjectAsync = async (throwError = true) => {
	const packageJsonExists = fs.existsSync(makePath(process.cwd(), 'package.json'));
	const srcFolderExists = fs.existsSync(makePath(process.cwd(), 'src'));
	if (throwError && !packageJsonExists) {
		throw `Error: it seems that you're not in your project folder. No package.json detected.`;
	} else if (throwError && !srcFolderExists) {
		throw `Error: it seems that you're not in your project folder. No "src" folder detected.`;
	} else if (!throwError) {
		return packageJsonExists && srcFolderExists;
	}
};

export const formatString = (str: string, format: NamingStyle) => {
	const extensionRegEx = new RegExp(/\.[a-z]{2,}$/);
	const extension = str.match(extensionRegEx)?.[0] ?? '';
	const strToFormat = str.replace(extensionRegEx, '');

	switch (format) {
	case 'PascalCase': return pascal(strToFormat.replace(/([A-Z])/g, ' $1')) + extension;
	case 'camelCase': return camel(strToFormat) + extension;
	case 'kebab-case': return dash(strToFormat) + extension;
	}
};

export const applyNamingStyleAsync = async (config: OrionCliConfig) => {
	await checkCurrentFolderIsProjectAsync();

	// #region Files and Folders
	const renameRecap: {
		entry: fs.Dirent
		oldPath: string
		newPath: string
	}[] = [];

	async function scanFilesAndFoldersRecursivelyAsync (path: string) {
		path = makePath(path);
		const entries = await fs.readdir(path, { withFileTypes: true });

		for await (const entry of entries) {
			const oldName = entry.name;
			const oldPath = makePath(path, oldName);
			let newName: string;

			if (entry.isFile()) {
				newName = formatString(oldName, config.fileNamingStyle);
			} else if (entry.isDirectory()) {
				newName = formatString(oldName, config.folderNamingStyle);
				await scanFilesAndFoldersRecursivelyAsync(oldPath);
			}

			const newPath = makePath(path, newName);

			renameRecap.push({
				entry,
				oldPath,
				newPath,
			});
		}
	}

	await useSpinnerAsync(
		`Renaming files and folders`,
		async () => {
			await scanFilesAndFoldersRecursivelyAsync('src/components');

			config.useSetupService
				? await scanFilesAndFoldersRecursivelyAsync('src/setup')
				: await scanFilesAndFoldersRecursivelyAsync('src/views');

			renameRecap
				.sort((a, b) => b.oldPath.localeCompare(a.oldPath))
				.sort((a, b) => b.oldPath.match(/\//g).length - a.oldPath.match(/\//g).length)
				.sort((a, b) => (b.entry.isFile() ? 1 : 0) - (a.entry.isFile() ? 1 : 0));


			await Promise.all(
				renameRecap
					.filter(x => x.oldPath !== x.newPath)
					.map(async x => await fs.rename(x.oldPath, x.newPath)),
			);

			await sleep(600);
		},
		`Files and folders renamed based on your config`,
	);
	// #endregion


	// #region Import statements
	const importStatementsRecap: string[] = [];

	async function scanImportStatementsRecursivelyAsync (path: string) {
		path = makePath(path);
		const entries = await fs.readdir(path, { withFileTypes: true });

		for await (const entry of entries) {
			const entryPath = makePath(path, entry.name);

			if (entry.isFile()) {
				const fileContent = await fs.readFile(entryPath, { encoding: 'utf-8' });
				const newFileContent = fileContent
					.split('\n')
					.map(line => sanitizeImportStatement(line, config))
					.join('\n');

				await fs.writeFile(entryPath, newFileContent, { encoding: 'utf-8' });

				importStatementsRecap.push(entryPath);
			} else if (entry.isDirectory()) {
				await scanImportStatementsRecursivelyAsync(entryPath);
			}
		}
	}

	await useSpinnerAsync(
		`Scanning import statements...`,
		async () => {
			await scanImportStatementsRecursivelyAsync('src/components');

			config.useSetupService
				? await scanImportStatementsRecursivelyAsync('src/setup')
				: await scanImportStatementsRecursivelyAsync('src/views');

			await sleep(600);
		},
		`Import statements updated`,
	);

	/* log.message();
	importStatementsRecap.forEach((x) => {
		const isVue = /\.vue$/.test(x);
		const isTs = /\.ts$/.test(x);

		if (isVue) {
			clackLog(x, 'green');
		} else if (isTs) {
			clackLog(x, 'blue');
		} else {
			clackLog(x, 'magenta');
		}
	}); */
	// #endregion


	// #region Router
	const routerFilePath = makePath('src', 'router', 'index.ts');
	const routerFileContent = await fs.readFile(routerFilePath, { encoding: 'utf-8' });
	const importRegex = /(?<prefix>import\('@\/components\/)(?<content>.*)(?<suffix>\.vue'\))/;

	const newFileContent = routerFileContent
		.split('\n')
		.map((x) => {
			if (importRegex.test(x)) {
				const currentFullPath = x.match(importRegex).groups.content;
				const splitCurrentFullPath = currentFullPath.split('/');
				const newFolderPath = splitCurrentFullPath.slice(0, -1).map(x => formatString(x, config.folderNamingStyle));
				const newFileName = splitCurrentFullPath.slice(-1).map(x => formatString(x, config.fileNamingStyle));
				return x.replace(importRegex, `$<prefix>${[...newFolderPath, ...newFileName].join('/')}$<suffix>`);
			}
			return x;
		})
		.join('\n');

	await fs.writeFile(routerFilePath, newFileContent, { encoding: 'utf-8' });
	// #endregion
};

function sanitizeImportStatement (str: string, config: OrionCliConfig) {
	let resultStr = str;

	for (const match of str.matchAll(importStatementRegex)) {
		if (match.groups) {
			const importBase = match.groups.toClean.match(/(@\/(setup|components)\/)|(\.{1,2}\/)/)[0];
			const sanitizedImport = match.groups.toClean
				.replace(/@\/(setup|components)\//, '')
				.replace(/\.{1,2}\//, '')
				.split('/')
				.map((x, i, arr) => i === (arr.length - 1)
					? formatString(x, config.fileNamingStyle)
					: formatString(x, config.folderNamingStyle),
				)
				.join('/');

			resultStr = match.groups.prefix + importBase + sanitizedImport + match.groups.suffix;
		}
	}

	return resultStr;
}

export const clackLog = (message: string, color: keyof Colors = 'white') => {
	// eslint-disable-next-line no-console
	console.log(picocolors.gray('│ '), (picocolors[color] as Formatter)(message));
};

export const inOrionRepoAsync = async () => {
	try {
		const pack = await fs.readFile(makePath('package.json'), { encoding: 'utf-8' });
		return JSON.parse(pack).name === '@orion.ui/orion';
	} catch (e) {
		log.error(e);
		throw `🚨 Are you in your project root folder?`;
	}
};
