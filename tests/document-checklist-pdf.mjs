import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createChecklistPdf, checklistPdfFilename } from "../sites/document/src/pages/office/checklists/createChecklistPdf.ts";

const output = new URL("../sites/document/dist/pdf-smoke/", import.meta.url);
await mkdir(output, { recursive: true });
for (const slug of ["topographic-survey", "alta-survey", "minor-plat"]) {
    const data = JSON.parse(await readFile(new URL(`../sites/document/public/checklists/${slug}.json`, import.meta.url), "utf8"));
    const items = data.Sections.flatMap(section => section.items);
    items[0].reason = "Control documentation needs review before release.";
    const pdf = createChecklistPdf({
        meta: data.Meta,
        sections: data.Sections,
        noEntries: [items[0].title],
        naEntries: [items[1].title],
        review: { reviewer: "Sample Reviewer", jobNumber: "26-1234", date: "2026-09-17", notes: "QA sample only.\nConfirm remaining exceptions before release." },
    });
    assert(pdf.getNumberOfPages() >= data.Sections.length + 1);
    await writeFile(new URL(`${slug}.pdf`, output), new Uint8Array(pdf.output("arraybuffer")));
    console.log(`${slug}: ${pdf.getNumberOfPages()} pages`);
}
const longText = "Long review text exercising wrapping and page boundaries. ".repeat(180);
const stress = createChecklistPdf({
    meta: { Title: "Long Content Checklist", WIP: true },
    sections: [{ title: "Extended Review", items: [
        { title: "Long denial", statement: "Verify all supporting information.", reason: longText, options: "YesNo" },
        { title: "Missing reason", statement: "No reason was entered.", options: "YesNo" },
        { title: "Blank reason", statement: "Whitespace should not create a denial label.", reason: "   ", options: "YesNo" },
        { title: "Final item", statement: "END OF CHECKLIST", options: "YesNo" },
    ] }],
    noEntries: ["Long denial", "Missing reason", "Blank reason"], naEntries: [],
    review: { reviewer: "Reviewer", jobNumber: "Stress", date: "", notes: longText },
});
await writeFile(new URL("long-content.pdf", output), new Uint8Array(stress.output("arraybuffer")));
assert(checklistPdfFilename("Tree / Survey", "26:1234").endsWith(".pdf"));
assert(!/[<>:"/\\|?*]/.test(checklistPdfFilename("Tree / Survey", "26:1234")));
console.log(`Long-content stress sample: ${stress.getNumberOfPages()} pages`);
