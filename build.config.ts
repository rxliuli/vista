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
    name: 'iife',
    entries: [{ input: 'src/cdn.ts', name: 'index.iife', declaration: false }],
    outDir: 'dist',
    clean: true,
  },
])
