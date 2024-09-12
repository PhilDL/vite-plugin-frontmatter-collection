# vite-plugin-frontmatter-collection

Parse the frontmatter of your collection of MD(X) files, and make it accessible through a fully type-safe virtual module. With Zod schemas, HMR, auto-generated ambient types declaration, and more...

## Features

- 🗂️ Parse your collection of MD(X) files and create virtual module of the frontmatter data
- ✨ Zod schema validation and auto generation of a d.ts file for the virtual module.
- 🦾 Enforce the schema on the frontmatter data of your content while editing!
- 🔥 Hot module reload when the content frontmatter change.

## Usage

Install

```bash
npm i vite-plugin-frontmatter-collection -D
# pnpm add vite-plugin-restart -D
```

Add it to `vite.config.js`

```ts
// vite.config.js
import { defineConfig } from "vite";
import { z } from "zod";

import {
  defineCollection,
  frontmatterCollectionPlugin,
} from "vite-plugin-frontmatter-collection";

import { FormationCollectionSchema } from "./app/content-collections-schemas";

export default defineConfig({
  plugins: [
    frontmatterCollectionPlugin({
      typesPath: "./types/frontmatter-collection.d.ts",
      collections: [
        defineCollection({
          name: "blogEntries",
          include: "./app/routes/_frontend+/blog/**/*.mdx",
          schema: z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            author: z.string(),
            date: z.date(),
            category: z.string().optional(),
            filePath: z.string(),
          }),
          sort: (a, b) => {
            const aTime = new Date(a.date ?? "").getTime();
            const bTime = new Date(b.date ?? "").getTime();
            return aTime > bTime ? -1 : aTime === bTime ? 0 : 1;
          },
        }),
        defineCollection({
          name: "formationsEntries",
          include: "./app/routes/_frontend+/formations/**/*.mdx",
          // imported zod schema
          schema: FormationCollectionSchema,
        }),
      ],
    }),
  ],
});

```

Now you can import the collection in your code

```ts
import { blogEntries, formationsEntries } from "virtual:frontmatter-collection";
```

With default options, you have types that are auto-generated from the schemas and collection names you provided.

```ts
// This file is auto-generated. Do not edit manually.
declare module "virtual:frontmatter-collection" {
export const blogEntries: {
  title?: string | undefined;
  description?: string | undefined;
  author: string;
  date: Date;
  category?: string | undefined;
  filePath: string;
}[];
export const formationsEntries: {
  meta: {
      [x: string]: string;
  }[];
  handle?: any | undefined;
  headers?: {
      [x: string]: string;
  } | undefined;
  date: Date;
  image: string;
  thumbnail: string;
  tags?: string[] | undefined;
  title?: string | undefined;
  description?: string | undefined;
  level?: number;
  durationHours: number;
  durationDays: number;
  price: number;
  nextStartDate?: Date | undefined;
  groupSize?: string | undefined;
  filePath: string;
}[];
}
```

If the `.d.ts` file is generated in the `types` folder at the root of your project, make sure that the folder si parsed by your `tsconfig.json`:`

```json
{
  "include": [
    "types/**/*",
    //...
  /...
```

## Plugin Options

```ts
export type FrontMatterCollectionPluginConfig = {
  typesPath?: string;
  generateDTS?: boolean;
  debug?: boolean;
  collections: FrontmatterCollectionConfig[];
};
```

- `typesPath` (optionnal) Path to the generated types file.
- `generateDTS` (optionnal, default=`true`) Generate the `.d.ts` file for the virtual module. Deactivate to handle the create the ambient declaration file yourself.
- `debug` (optionnal, default=`false`) Enable debug logs that show you the parsed content.
- `collections` (required) Array of collection definitions.

### `collection` definition:

- `name` (required) The name of the collection, will also be the name of the export.
- `include` (required) A glob pattern to match the files to include.

You have the choice between giving a `schema` or a `parseFrontMatter` function to parse the frontmatter of the included files into the desired shape.

- `schema` (optionnal) A zod schema to validate the frontmatter data.
- `parseFrontMatter` (optionnal) A function to parse the frontmatter of the included files into the desired shape.

A Zod `schema` will auto-generate the `.d.ts` module declaration file, but if instead you give it a `parseFrontMatter` function, you will have to manually create the types.

There is also some utilities to sort and filter the results before export.

- `sort` (optionnal) An optionnal function to sort the collection.
- `filter` (optionnal) An optional filter function to filter the collection.

To have typesafety in the `sort` and `filter` function you should define the collection object with the `defineCollection` helper.

#### `collection` api

````ts
export type FrontmatterCollectionConfig<T = any> = {
  /**
   * The name of the collection, will also be the name of the export
   */
  name: string;
  /**
   * A glob pattern to match the files to include
   */
  include: string;
  /**
   * Instead of a zod schema, you can provide a function to parse
   * the frontmatter of the included files into the desired shape.
   * You will not get automatic generation of the virtual module declaration file.
   *
   * @param fm - The frontmatter object
   * @returns The parsed frontmatter
   * @example
   * ```ts
   * parseFrontMatter: (fm) => {
   *   return {
   *     title: fm.attributes.meta.find((m) => m.title)?.title ?? "",
   *     description: fm.attributes.meta.find((m) => m.name === "description")?.content ?? "",
   *     date: fm.attributes.date,
   *   };
   * }
   * ```
   */
  parseFrontMatter?: (fm: { [key: string]: any; filePath: string }) => T;
  /**
   * A Zod schema to validate the frontmatter, this provides automatic
   * generation of the virtual module declaration file.
   *
   * @example
   * ```ts
   * schema: z.object({
   *  title: z.string().optional(),
   *  description: z.string().optional(),
   *  author: z.string(),
   *  date: z.date(),
   *  filePath: z.string(),
   * })
   */
  schema?: z.ZodSchema<T>;
  /**
   * An optionnal function to sort the collection
   * @param a - The first item to compare
   * @param b - The second item to compare
   * @returns A number indicating the sort order
   * @example
   * ```ts
   * sort: (a, b) => {
   *   const aTime = new Date(a.date ?? "").getTime();
   *   const bTime = new Date(b.date ?? "").getTime();
   *   return aTime > bTime ? -1 : aTime === bTime ? 0 : 1;
   * }
   * ```
   */
  sort?: (a: T, b: T) => number;
  /**
   * An optional filter function to filter the collection
   * @param a - The item to filter
   * @returns A boolean indicating if the item should be included
   * @example
   * ```ts
   * filter: (a) => a.published
   * ```
   */
  filter?: (a: T) => boolean;
  /**
   * An optional glob pattern to ignore files
   */
  ignore?: string | string[];
};
````

## Motivation

I wanted an easy way to import my posts collection, make sure I don't forget any attributes and hot module reload while I edit MDX content.

## License

MIT License © 2024 [L'ATTENTION Philippe](https://github.com/PhilDL)
