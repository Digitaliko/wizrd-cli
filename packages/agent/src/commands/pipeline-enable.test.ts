import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectEnableContext } from "./pipeline-enable";

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "wizrd-pipeline-enable-"));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

const fakeGh = (opts: {
  defaultBranch: string;
  nameWithOwner: string;
  hasSecret: boolean;
}) => ({
  repoView: async () => ({
    nameWithOwner: opts.nameWithOwner,
    defaultBranchRef: { name: opts.defaultBranch },
  }),
  secretExists: async (_name: string) => opts.hasSecret,
});

test("detects docs/ when present", async () => {
  mkdirSync(join(workdir, "docs"));
  const ctx = await detectEnableContext({
    cwd: workdir,
    gh: fakeGh({ defaultBranch: "main", nameWithOwner: "Test/repo", hasSecret: true }),
  });
  expect(ctx.docsRoot).toBe("docs");
  expect(ctx.defaultBranch).toBe("main");
  expect(ctx.repo).toBe("Test/repo");
  expect(ctx.secretPresent).toBe(true);
});

test("prefers knowledge-base/ if docs missing", async () => {
  mkdirSync(join(workdir, "knowledge-base"));
  const ctx = await detectEnableContext({
    cwd: workdir,
    gh: fakeGh({ defaultBranch: "main", nameWithOwner: "Test/repo", hasSecret: true }),
  });
  expect(ctx.docsRoot).toBe("knowledge-base");
});

test("defaults docsRoot to 'docs' when nothing exists", async () => {
  const ctx = await detectEnableContext({
    cwd: workdir,
    gh: fakeGh({ defaultBranch: "main", nameWithOwner: "Test/repo", hasSecret: false }),
  });
  expect(ctx.docsRoot).toBe("docs");
  expect(ctx.secretPresent).toBe(false);
});

test("reads level from CLAUDE.md when present", async () => {
  writeFileSync(join(workdir, "CLAUDE.md"), "# Test\n\n## Wizrd Level: L2\n\nstuff\n");
  const ctx = await detectEnableContext({
    cwd: workdir,
    gh: fakeGh({ defaultBranch: "main", nameWithOwner: "Test/repo", hasSecret: true }),
  });
  expect(ctx.level).toBe("L2");
});

test("falls back to L2 when CLAUDE.md missing", async () => {
  const ctx = await detectEnableContext({
    cwd: workdir,
    gh: fakeGh({ defaultBranch: "main", nameWithOwner: "Test/repo", hasSecret: true }),
  });
  expect(ctx.level).toBe("L2");
});

test("reads L1 from CLAUDE.md", async () => {
  writeFileSync(join(workdir, "CLAUDE.md"), "## Wizrd Level: L1\n");
  const ctx = await detectEnableContext({
    cwd: workdir,
    gh: fakeGh({ defaultBranch: "main", nameWithOwner: "Test/repo", hasSecret: false }),
  });
  expect(ctx.level).toBe("L1");
});
