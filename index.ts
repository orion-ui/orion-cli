#!/usr/bin/env node
/* eslint-disable no-console */

import { cancel, intro, log, outro } from '@clack/prompts';
import { orionGradient } from './utils/tools';
import OrionCli from './utils/OrionCli';

(async () => {

	try {

		console.log();
		intro(orionGradient(`Orion UI - Another simple yet powerful UI framework`));
		await new OrionCli().initAsync();

	} catch (e) {

		if (typeof e === 'string') {
			cancel(e);
			console.log();
		} else {
			log.error('Aborted');
			// eslint-disable-next-line no-console
			console.error('\n', e, '\n');
		}
		process.exit(0);

	} finally {

		outro(orionGradient(`Thank you for using Orion CLI`));
		console.log();

	}

})();
