import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
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
})
