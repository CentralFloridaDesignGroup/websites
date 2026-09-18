import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export function composeChecklist(profile, sets) {
  if (
    !Array.isArray(profile.include) ||
    !["florida", "white-point"].every((id) => profile.include.includes(id))
  ) {
    throw new Error(`${profile.id}: Florida and White Point sets are required`);
  }
  const ids = new Set();
  const sections = profile.include.flatMap((id) => {
    const set = sets.get(id);
    if (!set) throw new Error(`Missing requirement set: ${id}`);
    return structuredClone(set.Sections);
  });
  for (const item of sections.flatMap((section) => section.items)) {
    if (!item.id || ids.has(item.id))
      throw new Error(`Missing or duplicate requirement ID: ${item.id}`);
    ids.add(item.id);
    for (const field of ["title", "statement", "code"]) {
      if (typeof item[field] !== "string" || !item[field].trim())
        throw new Error(`${item.id}: invalid ${field}`);
    }
    if (!["YesNo", "YesNoN/A"].includes(item.options))
      throw new Error(`${item.id}: invalid options`);
    if (
      !item.source?.label ||
      !["draft", "reviewed"].includes(item.reviewStatus)
    )
      throw new Error(`${item.id}: missing source/review status`);
    if (
      item.reviewStatus === "reviewed" &&
      !/^\d{4}-\d{2}-\d{2}$/.test(item.reviewedAt ?? "")
    )
      throw new Error(`${item.id}: reviewed date required`);
    if (item.source.url && !/^https?:\/\//.test(item.source.url))
      throw new Error(`${item.id}: invalid source URL`);
  }
  for (const item of sections.flatMap((section) => section.items)) {
    if (item.relatedRequirementId && !ids.has(item.relatedRequirementId))
      throw new Error(
        `Missing related requirement: ${item.relatedRequirementId}`,
      );
  }
  return {
    Meta: {
      ...profile.Meta,
      WIP:
        profile.Meta.WIP ||
        sections.some((section) =>
          section.items.some((item) => item.reviewStatus !== "reviewed"),
        ),
    },
    Sections: sections,
  };
}

// Folder names organize authoring files; profiles reference only each set's ID.
export async function loadRequirementSets(directory) {
  const sets = new Map();
  async function visit(folder) {
    const entries = await readdir(folder, { withFileTypes: true });
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const set = JSON.parse(await readFile(path, "utf8"));
        if (sets.has(set.id))
          throw new Error(`Duplicate requirement set: ${set.id}`);
        sets.set(set.id, set);
      }
    }
  }
  await visit(directory);
  return sets;
}

export async function generateAuthoredChecklists(siteDirectory) {
  const root = join(siteDirectory, "src/pages/office/checklists/platting");
  const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
  const sets = await loadRequirementSets(join(root, "requirements"));
  const profiles = [
    {
      id: "plat",
      output: "plat",
      Meta: {
        Title: "Plat Checklist",
        Category: "Land Development",
        WIP: true,
      },
      include: ["florida", "white-point"],
    },
  ];
  for (const file of (await readdir(join(root, "jurisdictions")))
    .filter((file) => file.endsWith(".json"))
    .sort()) {
    profiles.push(await readJson(join(root, "jurisdictions", file)));
  }
  const outputs = new Set();
  // Validate every profile before writing any output.
  const generated = profiles.map((profile) => {
    if (
      !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(profile.output) ||
      outputs.has(profile.output)
    )
      throw new Error(`Invalid or duplicate output: ${profile.output}`);
    outputs.add(profile.output);
    return [profile.output, composeChecklist(profile, sets)];
  });
  for (const [output, checklist] of generated) {
    const path = join(siteDirectory, "public/checklists", `${output}.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(checklist, null, 4)}\n`);
  }
  console.log(`Generated ${generated.length} authored checklists offline.`);
}
