// ============================== PAGE CONTROLLER =======================
/**
 * Controller function for Advanced Search pages - decides what fields to hide
 * 
 * Called by: Run_AdvancedSearch [in MainContent.js]
 * 
 * @param {object} config 
 */
$(document).ready(() => {
	// hide Last RSD Update
	$('input#NruNo')[0].nextSibling.textContent = '';
	$('input#NruNo').next().hide();

	// hide country of origin
	$('select#TownBirthId').parent().parent().hide();

	// hide email address
	$('input#cd1LongField').parent().parent().hide();

	// hide rsd date and date of UNHCR registration
	$('input#RegDateFrom').parent().parent().parent().hide();

	// TODO: hide these too
	// unhcr appointment slip - CDIdentifier1
	// religion - CD_DROPDOWN1ID
	// address 1 - AddressLine1

	// hide Additional Filters (relative / contact search)
	$('h4:contains("Additional Filters")').hide().next().hide();

	// TODO: hide vulnerabilities?
	// $('h4:contains("Vulnerabilities")').hide();
});