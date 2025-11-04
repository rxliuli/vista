import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig([
	{
		entries: [
			{
				input: 'src/',
				globOptions: {
					ignore: ['**/*.test.ts'],
				},
			},
		],
		declaration: true,
		clean: true,
	},
	{
		name: 'minified',
		entries: [
			{ input: 'src/cdn.ts', name: 'vista.min', declaration: false },
		],
		outDir: 'dist',
		rollup: {
			esbuild: {
				minify: true,
			},
		},
		clean: true,
	},
])
