This tool is designed to quickly generate a lot closure report for an entire site. The following is a step by step guide to prepare your site for this tool.
The first step is to ensure all your parcels are closed and mathematically close. You also need to ensure lot numbers and tract identification is setup correctly.
![Civil 3D toolspace image for refernece](/documents/closureReportGenerator/images/toolspace_image.png "Civil 3D toolspace image for reference")

---
**For lots and tracts**, it does not matter what label style is assigned. That is not transferred to the report.

Specifically, the following requirements are needed to ensure smooth translation during the generating process.
### Lot Requirements
- Each parcel's **Name** should be in the format **Standard : #**. The tool will automatically translate to Lot #. The number assigned to the lot will translate.
- Each parcel's **Description** should be left empty.

![Lot properties table from Civil 3D](/documents/closureReportGenerator/images/lot_properties.png "Lot properties table from Civil 3D")

---

### Tract Requirements
- Each parcel's **Name** should be in the format **TRACT #**. This is how the tool differentiates between lots and tracts.
- Each parcel's **Description** should be be filled with the purpose of the tract ("private road", "alley", "stormwater management", etc).

![Lot properties table from Civil 3D](/documents/closureReportGenerator/images/tract_properties.png "Tract properties table from Civil 3D")

---

When you are ready to export the data to create a report, expand *Sites* and right-click your site (most times, it is **Site 1**). You will see an option to **Export Analysis...**

![Context menu for Site showing export option](/documents/closureReportGenerator/images/export_step_1.png)

Clicking that option will open the export window. Make sure the following settings are applied:

- **Destination File**: Select a location you can quickly access the file. We will not need to keep this on the server or in the project.
- **Analysis Type**: Ensure **Mapcheck Analysis** is selected. *Enable mapcheck across chord* should remain checked.
- All other options should be unchecked.

![Export Window for analysis](/documents/closureReportGenerator/images/export_step_2.png)

Once you have the txt file available, you are good to proceed to step 2.