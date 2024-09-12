import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import matter from "gray-matter";
import type { Plugin } from "vite";
import { z } from "zod";
import { printNode, zodToTs } from "zod-to-ts";

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

/**
 * A function to define a collection of frontmatter entries,
 * helps with TypeSafety.
 */
export function defineCollection<T extends Record<string, any>>(
  collection: FrontmatterCollectionConfig<T>,
) {
  return collection;
}

export type DefineCollection = typeof defineCollection;

export type FrontmatterCollectionConfigFn = (args: {
  collect: DefineCollection;
}) => FrontmatterCollectionConfig[];

export type FrontMatterCollectionPluginConfig = {
  /**
   * The collections to generate
   * @example
   * ```ts
   * collections: [
   *   defineCollection({
   *     name: "blogEntries",
   *     include: './app/routes/_frontend+/blog/**\/*.mdx',
   *     schema: BlogPostCollectionSchema,
   *   }),
   * ]
   */
  collections: FrontmatterCollectionConfig[];
  /**
   * The path to generate the types file
   * @default "frontmatter-collection.d.ts" at the root of the project
   */
  typesPath?: string;
  /**
   * Generate a declaration file for the virtual module. (Set to
   * false if you want to handle it yourself)
   * @default true
   */
  generateDTS?: boolean;
  /**
   * Enable debug mode, to see parsed frontmatter
   */
  debug?: boolean;
};

export function frontmatterCollectionPlugin({
  collections,
  typesPath,
  generateDTS = true,
  debug = false,
}: FrontMatterCollectionPluginConfig): Plugin {
  const virtualModuleId = "virtual:frontmatter-collection";
  const resolvedVirtualModuleId = (id: string) => "\0" + id;
  let virtualModuleExports: string;

  function collectFrontmatterEntries(collection: FrontmatterCollectionConfig) {
    if (!collection.schema && !collection.parseFrontMatter) {
      throw new Error(
        `You must provide a schema or a parseFrontMatter function for the collection ${collection.name}`,
      );
    }
    const globsafe = (s: string) => s.replace(/\\/g, "/");

    const allFiles = globSync(globsafe(collection.include), {
      ignore: collection.ignore,
    });

    let entries = [];
    for (const file of allFiles) {
      const { data } = matter(readFileSync(file, "utf-8"));
      const frontmatter: {
        [key: string]: any;
        filePath: string;
      } = {
        filePath: file,
        ...data,
      };
      if (debug) console.log(file, frontmatter);
      if (collection.schema) {
        try {
          const entry = collection.schema.parse(frontmatter);
          entries.push(entry);
        } catch (error) {
          if (error instanceof Error) {
            console.error(
              `❌ Error parsing frontmatter in ${file}`,
              error.message,
            );
          } else {
            console.error(`❌ Error parsing frontmatter in ${file}`, error);
          }
        }
      } else if (collection.parseFrontMatter) {
        try {
          const entry = collection.parseFrontMatter(frontmatter);
          entries.push(entry);
        } catch (error) {
          if (error instanceof Error) {
            console.error(
              `❌ Error parsing frontmatter in ${file}`,
              error.message,
            );
          } else {
            console.error(`❌ Error parsing frontmatter in ${file}`, error);
          }
        }
      }
    }
    if (collection.sort) {
      entries = entries.sort(collection.sort);
    }
    console.log(
      `🗂️ Collected ${entries.length}/${allFiles.length} entries for ${collection.name} `,
    );
    return entries;
  }

  function refreshVirtualModuleContent() {
    let exportedEntries: string[] = [];
    for (const collection of collections) {
      const entries = collectFrontmatterEntries(collection);
      exportedEntries.push(
        `export const ${collection.name} = ${JSON.stringify(entries)};`,
      );
    }

    virtualModuleExports = exportedEntries.join("\n");
    return virtualModuleExports;
  }

  return {
    name: "vite-plugin-frontmatter-collection",
    configResolved(resolvedConfig) {
      if (!generateDTS) return;
      let ambientDeclarations: string[] = [];
      for (const collection of collections) {
        if (collection.schema) {
          const { node } = zodToTs(collection.schema, collection.name);
          ambientDeclarations.push(
            `export const ${collection.name}: ${printNode(node)}[];`,
          );
        }
      }
      const ambiantDeclarationsString = `// This file is auto-generated. Do not edit manually.
declare module "virtual:frontmatter-collection" {
${ambientDeclarations.join("\n")}
}
`;
      const declarationFullPath = path.join(
        resolvedConfig.root,
        typesPath ? typesPath : "frontmatter-collection.d.ts",
      );
      writeFileSync(declarationFullPath, ambiantDeclarationsString);
    },
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId(virtualModuleId);
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId(virtualModuleId)) {
        return refreshVirtualModuleContent();
      }
    },
    handleHotUpdate({ server, file, modules }) {
      if (!file.endsWith(".mdx")) {
        return modules;
      }
      const virtualModule = server.moduleGraph.getModuleById(
        resolvedVirtualModuleId(virtualModuleId),
      );
      if (virtualModule) {
        server.moduleGraph.invalidateModule(virtualModule);
      }
      return modules;
    },
  };
}
