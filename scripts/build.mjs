import * as esbuild from 'esbuild';

const config = {
	bundle: true,
	entryPoints: ['index.ts'],
	outfile: 'outfile.cjs',
	format: 'cjs',
	platform: 'node',
	target: 'node14',
};

if (process.argv.includes('--watch')) {
	const ctx = await esbuild.context(config);
	await ctx.watch();
} else {
	await esbuild.build(config);
}
