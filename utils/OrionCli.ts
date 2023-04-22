import { isCancel, select } from '@clack/prompts';
import { checkCurrentFolderIsProjectAsync } from './tools';
import MakeProject from './MakeProject';
import MakeComponent from './MakeComponent';
import OrionConfig from './OrionConfig';
import OrionVolar from './OrionVolar';

const scriptOptions = [
	{
		value: 'make-component',
		label: `New component`,
		hint: `Create a new component using SetupService philosophy or not`,
	},
	/* {
		value: 'make-entity',
		label: `New entity`,
		hint: `Create a new {name}Entity`,
	}, */
	/* {
		value: 'make-service',
		label: `New service`,
		hint: `Create a new {name}Service`,
	}, */
	{
		value: 'orion-config',
		label: `Manage config`,
		hint: `Create or update Orion CLI config file`,
	},
	{
		value: 'orion-volar',
		label: `Volar intellisense`,
		hint: `Create definition file for Volar intellisense based on your prefix`,
	},
	{
		value: 'make-project',
		label: `New project`,
		hint: `Create a new project based on Orion UI`,
	},
] as const;


export default class OrionCli {
	projectName: string;
	projectFolder: string;
	projectPath: string;


	async initAsync () {
		const options = [...scriptOptions];
		const isAlreadyInProject = await checkCurrentFolderIsProjectAsync(false);

		if (!isAlreadyInProject) {
			// If not in a project, reorder options
			options.unshift(...options.splice(-1));
		}

		const targetScript = await select({
			message: 'Select what you want to do',
			options,
		}) as typeof scriptOptions[number]['value'];

		if (isCancel(targetScript)) {
			throw `Operation cancelled. The choice can be hard...`;
		}

		switch (targetScript) {
		case 'make-project':
			return await new MakeProject().initAsync();
		case 'make-component':
			return await new MakeComponent().initAsync();
		// case 'make-entity':
		// case 'make-service':
		case 'orion-volar':
			return await new OrionVolar().initAsync();
		case 'orion-config':
			return await new OrionConfig().initAsync();
		}
	}
}
