import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPipelineInit } from "./pipeline-init";

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "wizrd-pipeline-init-"));
  mkdirSync(join(workdir, ".github", "workflows"), { recursive: true });
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

test("writes wizrd-pipeline.yml referencing every stage composite", async () => {
  await runPipelineInit({
    cwd: workdir,
    filterKind: "assignee",
    filterValue: "Fr33dom91",
    baseBranch: "main",
  });

  const out = join(workdir, ".github", "workflows", "wizrd-pipeline.yml");
  expect(existsSync(out)).toBe(true);

  const content = readFileSync(out, "utf-8");

  expect(content).toContain("Digitaliko/wizrd-cli/.github/workflows/wizrd-tagger.yml@v1");
  for (const stage of ["triage", "plan", "implement", "review", "fix", "verify", "doc-gardening"]) {
    expect(content).toContain(`wizrd-stage-${stage}.yml@v1`);
  }
  expect(content).toContain("filter_kind: assignee");
  expect(content).toContain("filter_value: 'Fr33dom91'");
  expect(content).toContain("base_branch: main");
  expect(content).toContain("docs_root: docs");
});

test("uses default docsRoot 'docs' when not provided", async () => {
  await runPipelineInit({
    cwd: workdir,
    filterKind: "none",
    filterValue: "",
    baseBranch: "main",
  });
  const content = readFileSync(join(workdir, ".github", "workflows", "wizrd-pipeline.yml"), "utf-8");
  expect(content).toContain("docs_root: docs");
});

test("supports docsRoot override (e.g. knowledge-base for L1)", async () => {
  await runPipelineInit({
    cwd: workdir,
    filterKind: "none",
    filterValue: "",
    baseBranch: "main",
    docsRoot: "knowledge-base",
  });
  const content = readFileSync(join(workdir, ".github", "workflows", "wizrd-pipeline.yml"), "utf-8");
  expect(content).toContain("docs_root: knowledge-base");
});

test("refuses to overwrite an existing wizrd-pipeline.yml without force", async () => {
  const out = join(workdir, ".github", "workflows", "wizrd-pipeline.yml");
  writeFileSync(out, "existing\n", "utf-8");

  await expect(
    runPipelineInit({
      cwd: workdir,
      filterKind: "none",
      filterValue: "",
      baseBranch: "main",
    }),
  ).rejects.toThrow(/already exists/);
});

test("overwrites when force: true", async () => {
  const out = join(workdir, ".github", "workflows", "wizrd-pipeline.yml");
  writeFileSync(out, "existing\n", "utf-8");

  await runPipelineInit({
    cwd: workdir,
    filterKind: "none",
    filterValue: "",
    baseBranch: "main",
    force: true,
  });

  const content = readFileSync(out, "utf-8");
  expect(content).toContain("Wizrd Pipeline");
});
