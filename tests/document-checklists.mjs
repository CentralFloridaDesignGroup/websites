import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const added = ['topographic-survey', 'tree-survey', 'wetland-survey', 'legal-sketch-description', 'lot-combination', 'lot-split', 'plat', 'minor-plat'];
const guide = await readJson('sites/document/src/pages/SectionRef.json');
const links = guide.Sections.find(section => section.name === 'Checklists').links;
const paths = links.map(link => link.path);
assert.equal(new Set(paths).size, paths.length, 'Duplicate navigation target');

for (const slug of ['boundary-survey', 'alta-survey', ...added]) {
    assert(paths.includes(`/checklists/${slug}`), `Missing navigation: ${slug}`);
}

for (const link of links) {
    assert.match(link.path, /^\/checklists\/[a-z]+(?:-[a-z]+)*$/);
    const slug = link.path.split('/').at(-1);
    const document = await readJson(`sites/document/public/checklists/${slug}.json`);
    assert.equal(typeof document.Meta.Title, 'string');
    assert(document.Meta.Title.trim());
    assert(document.Meta.Category.trim());
    assert.equal(typeof document.Meta.WIP, 'boolean');
    assert(document.Sections.length > 0, `${slug}: empty checklist`);
    const titles = new Set();
    for (const section of document.Sections) {
        assert(section.title.trim());
        assert(section.items.length > 0, `${slug}: empty section`);
        for (const item of section.items) {
            // Older ALTA entries omit references; require them on the new drafts.
            const fields = ['title', 'statement', ...(added.includes(slug) || item.code !== undefined ? ['code'] : [])];
            for (const field of fields) {
                assert.equal(typeof item[field], 'string', `${slug}: invalid ${field}`);
                assert(item[field].trim(), `${slug}: empty ${field}`);
            }
            assert(['YesNo', 'YesNoN/A'].includes(item.options), `${slug}: invalid answer options`);
            assert(!titles.has(item.title), `${slug}: duplicate title ${item.title}`);
            titles.add(item.title);
        }
    }
    if (added.includes(slug)) {
        assert.equal(document.Meta.WIP, true, `${slug}: expected draft`);
        assert.equal(document.Meta.Title, link.name);
        assert(document.Sections.flatMap(section => section.items).some(item => item.code === 'QA review'));
        assert(document.Sections.flatMap(section => section.items).some(item => item.code === 'Local requirements—verify'));
    }
    console.log(`${slug}: ${document.Sections.length} sections, ${titles.size} unique items`);
}

// Optional served-route verification: node tests/document-checklists.mjs http://localhost:5200
if (process.argv[2]) {
    const base = new URL(process.argv[2]);
    for (const slug of added) {
        for (const prefix of ['/checklists/', '/office/checklists/']) {
            const response = await fetch(new URL(`${prefix}${slug}`, base));
            assert(response.ok, `${slug}: route returned ${response.status}`);
            assert((await response.text()).includes('id="root"'), `${slug}: missing app shell`);
        }
        const response = await fetch(new URL(`/checklists/${slug}.json`, base));
        assert(response.ok, `${slug}: JSON returned ${response.status}`);
        assert.deepEqual(await response.json(), await readJson(`sites/document/public/checklists/${slug}.json`));
    }
    console.log('Both route aliases and JSON responses passed for all eight drafts.');
}
