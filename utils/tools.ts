import { camel, dash, pascal, sleep } from 'radash';
import { spinner } from '@clack/prompts';
import { GenerateOptions } from 'magicast';
import * as fs from 'fs-extra';
import path from 'node:path';
import gradient from 'gradient-string';
import picocolors from 'picocolors';

export type NamingStyle = 'PascalCase' | 'camelCase' | 'kebab-case'

export const CONFIG_FILE = 'orion.config.ts';
export const COMPONENTS_PATH = './src/components/';
export const SETUP_SERVICE_PATH = './src/setup/';
export const BASE_SETUP_SERVICE = 'BaseSetupService';
export const SHIMS_ORION = 'shims-orion.d.ts';
export const MAGICAST_GENERATE_OPTIONS: GenerateOptions = {
	quote: 'single',
	useTabs: true,
	tabWidth: 2,
};

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
	await sleep(1000);
	spin.stop(endMessage);
};

export const checkCurrentFolderIsProjectAsync = async (throwError = true) => {
	const packageJsonExists = fs.existsSync(makePath(process.cwd(), 'package.json'));
	if (throwError && !packageJsonExists) {
		throw `Error: it seems that you're not in your project folder. No package.json detected.`;
	} else if (!throwError) {
		return packageJsonExists;
	}
};

export const formatString = (str: string, format: NamingStyle) => {
	switch (format) {
	case 'PascalCase': return pascal(str.replace(/([A-Z])/g, ' $1'));
	case 'camelCase': return camel(str);
	case 'kebab-case': return dash(str);
	}
};
