module.exports = {
	root: true,

	env: { node: true },

	parser: '@typescript-eslint/parser',

	parserOptions: { ecmaVersion: 'latest' },

	plugins: [
		'@typescript-eslint',
	],

	extends: [
		'prettier',
		'plugin:@typescript-eslint/recommended',
		'plugin:@orion.ui/orion/scriptonly',
	],
};
