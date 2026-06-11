import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type FilterKind = "assignee" | "label" | "none";

export interface PipelineInitOptions {
  cwd: string;
  filterKind: FilterKind;
  filterValue: string;
  baseBranch: string;
  /** Path doc-gardening is allowed to edit. Default 'docs'. */
  docsRoot?: string;
  force?: boolean;
}

const TEMPLATES_DIR = join(import.meta.dir, "..", "..", "templates", "pipeline");

export async function runPipelineInit(opts: PipelineInitOptions): Promise<{ path: string }> {
  const outDir = join(opts.cwd, ".github", "workflows");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "wizrd-pipeline.yml");

  if (existsSync(outPath) && !opts.force) {
    throw new Error(`${outPath} already exists; pass force: true to overwrite`);
  }

  const templatePath = join(TEMPLATES_DIR, "wizrd-pipeline.yml");
  const tpl = readFileSync(templatePath, "utf-8");

  const rendered = tpl
    .replaceAll("__FILTER_KIND__", opts.filterKind)
    .replaceAll("__FILTER_VALUE__", opts.filterValue)
    .replaceAll("__BASE_BRANCH__", opts.baseBranch)
    .replaceAll("__DOCS_ROOT__", opts.docsRoot ?? "docs");

  writeFileSync(outPath, rendered, "utf-8");
  return { path: outPath };
}
