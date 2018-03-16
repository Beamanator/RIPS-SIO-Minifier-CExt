// ============================== PAGE CONTROLLER =======================
/**
 * Controller function for Registration.js - decides what fields to hide
 * 
 * Called by: Run_Registration [in MainContent.js]
 * 
 * @param {object} config 
 */
$(document).ready(() => {
	// Required fields that shouldn't be hidden:
	// First name, surname
	// DOB, Gender, Nationality, Preferred language
	// Phone #, UNHCR #

	// TODO: maybe bring back 'Neighborhood' dropdown?
	$('input#LNRU_NO')
		.parent().parent().parent().hide();
	$('input#CDDateRegisteredLabel')
		.parent().parent().parent().hide();

	$('select#LCOUNTRYOFORIGIN').parent().parent().hide();
	$('select#LETHNICORIGIN').parent().parent().hide();
	$('select#LSECONDLANGUAGE').parent().parent().hide();
	$('select#LMARITALSTATUS').parent().parent().hide();
	
	$('input#LADDRESS1').parent().parent().hide();

	$('input#CDLongField1').parent().parent().hide();
	$('input#CDAdrTelLabel').parent().parent().hide();
		
	
	$('input#IsCBLabel1')
		.parent().parent().parent().hide();
	
	$('select#Dropdown1')
		.parent().parent().parent().parent().hide();
	
	$('input#CDDateEntryCountryLabel')
		.parent().parent().parent().parent().hide();
	
	$('select#REG_TEAM')
		.parent().parent().parent().parent().hide();

});