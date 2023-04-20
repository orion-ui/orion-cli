import { isCancel, select } from '@clack/prompts';
import MakeProject from './MakeProject';
import MakeComponent from './MakeComponent';
import OrionConfig from './OrionConfig';
import { checkCurrentFolderIsProjectAsync } from './tools';

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
		value: 'create-config',
		label: `Manage config`,
		hint: `Create or update Orion CLI config file`,
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
		case 'create-config':
			return await new OrionConfig().initAsync();
		}
	}
}
