import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { composeChecklist, generateAuthoredChecklists, loadRequirementSets } from '../sites/document/scripts/composePlattingChecklists.mjs';
import { fileURLToPath } from 'node:url';

const site = new URL('../sites/document/', import.meta.url);
const root = new URL('src/pages/office/checklists/platting/', site);
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const sets = await loadRequirementSets(fileURLToPath(new URL('requirements/', root)));
const county = await json('jurisdictions/orange-county.json');
const city = await json('jurisdictions/orlando.json');
const items = checklist => checklist.Sections.flatMap(section => section.items);
for (const profile of [county, city]) {
    const result = composeChecklist(profile, sets);
    assert.deepEqual(items(result).map(item => item.id), profile.include.flatMap(id => sets.get(id).Sections.flatMap(section => section.items.map(item => item.id))));
    assert(result.Meta.WIP);
    assert(!items(result).some(item => item.id.startsWith('orange-county-recording')));
    const changed = structuredClone(sets);
    changed.get('florida').Sections[0].items[0].statement = 'Shared change';
    assert.equal(items(composeChecklist(profile, changed))[0].statement, 'Shared change');
}
assert(!items(composeChecklist(city, sets)).some(item => item.id.startsWith('orange-county-unincorporated')));
assert.throws(() => composeChecklist({ ...county, include: [...county.include, 'missing'] }, sets), /Missing requirement set/);
assert.throws(() => composeChecklist({ ...county, include: [...county.include, 'florida'] }, sets), /duplicate requirement ID/);
const related = structuredClone(sets);
related.get('orlando').Sections[0].items[0].relatedRequirementId = 'missing';
assert.throws(() => composeChecklist(city, related), /Missing related requirement/);
related.get('orlando').Sections[0].items[0].relatedRequirementId = 'florida-001';
assert.doesNotThrow(() => composeChecklist(city, related));
const duplicateTitles = structuredClone(sets);
duplicateTitles.get('orlando').Sections[0].items[0].title = sets.get('florida').Sections[0].items[0].title;
assert.doesNotThrow(() => composeChecklist(city, duplicateTitles));
const paths = ['plat', 'platting/orange', 'platting/orange/orlando'];
await generateAuthoredChecklists(fileURLToPath(site));
const before = await Promise.all(paths.map(path => readFile(new URL(`public/checklists/${path}.json`, site), 'utf8')));
await generateAuthoredChecklists(fileURLToPath(site));
const after = await Promise.all(paths.map(path => readFile(new URL(`public/checklists/${path}.json`, site), 'utf8')));
assert.deepEqual(after, before);
console.log('Platting composition, applicability, validation, shared updates, and deterministic generation passed.');
