// ==================== FIELD TRANSLATOR FILE =======================

/**
 * Purpose of this function is to set an easy place to translate fields from the input
 * textarea (on the popup) into the output format needed in Registration (and
 * CBI and Service / Action pages).
 * 
 * 'ALL' -> returns all translators in one object
 * 
 * @param {boolean} [flag_getElemID=true] - flag to determine if functions get column headers or element ids
 * @returns field translator object with specific key : value pairs to map generic field
 * names to spreadsheet column titles
 */
function FT_getAllTranslator(flag_getElemID=true) {
	// if flag_getElemID is true, get item 0 (id) from arrays, else get item 1
	// (column name)
	// var item = flag_getElemID ? 0 : 1;

	// NOT sure when this will be needed yet
	// -> Can only be used on CBI if we want Vulnerabilities
}

function FT_getSearchTranslator() {
	return {
		'MAIN PHONE': 	'mobile',
		'OTHER PHONE': 	'telephone',
		'STARS NUMBER':	'NruNo',
		'UNHCR NUMBER': 'HoRefNo'
	};
}

function FT_getRequiredTranslator(flag_getElemID=true) {
	// same comment as above fn
	var item = flag_getElemID ? 0 : 1;

	return {
		// ====================== REQUIRED FIELDS: =====================
		"FIRST NAME": 	'LFIRSTNAME',
		"LAST NAME": 	'LSURNAME',
		// "FULL NAME":	'NO ELEM ID! HANDLED SEPARATELY IN NAMEINSERT()!',
		
		"DATE OF BIRTH":	'LDATEOFBIRTH',
		"GENDER": 			'LGENDER',
		"NATIONALITY":		'LNATIONALITY',

		"MAIN LANGUAGE":	'LMAINLANGUAGE',
		"PHONE NUMBER": 	'CDAdrMobileLabel',
		"UNHCR NUMBER": 	'UNHCRIdentifier',

		// ONLY USED WHEN MULTIPLE LANGUAGES IN MAIN LANGUAGE COLUMN!
		"SECOND LANGUAGE": 		'LSECONDLANGUAGE' // MATCH PAIR IN OPTIONAL TRANSLATOR
	};
}

function FT_getServiceTranslator() {
	return {
		// ====================== SERVICES: ======================
		"SERVICE CODE":			'lscCodeValue', // REQUIRED!
		"SERVICE CASEWORKER": 	'CASEWORKERID',
		"SERVICE START DATE": 	'DATE_OF_MATTER_START'
	};
}

function FT_getActionTranslator() {
	return {
		// ====================== ACTIONS: ======================
		"ACTION NAME":			'ddlActions', // REQUIRED!,
		"ACTION CASEWORKER":	'CASEWORKERID',
		// "ACTION NOTES":		'NO ELEM ID! HANDLE SEPARATELY!',
		// "ACTION CODE":		"Action Code", // skipping, see footnote A
		// TODO: probably not ready yet?
		// "ACTION DATE":			"elementID"

		// User doesn't need to enter this column, it's just used as an element
		// id translator for Add Action page
		"SERVICE CODE": 		'ddlServices'
	};
}

// gets optional client data translation (for client basic information page)
function FT_getOptionalTranslator() {

	return appendHiddenCBITranslators({
		// ====================== OPTIONAL FIELDS: ======================
		
		// ====== TEXTBOXES: ======

		// omit names, main phone, unhcr (required)
		"ADDRESS1": 			'LADDRESS1',
		"ADDRESS2":				'LADDRESS2',
		"OTHER PHONE NUMBER": 	'CDAdrTelLabel',
		"EMAIL ADDRESS": 		'CDLongField1',
		// other information
		"APPOINTMENT SLIP NUMBER":	'CDIdentifier1',
		"CARITAS NUMBER":		'CDIdentifier2',
		"IOM NUMBER": 			'CDIdentifier4',
		"CRS NUMBER":			'CDIdentifier3',
		"STARS STUDENT NUMBER":	'CDIdentifier6',
		"MSF NUMBER":			'CDIdentifier5',
		
		// ====== CHECKBOXES: ======
		"CARE": 		'IsCBLabel1',
		"CRS": 			'IsCBLabel2',
		"EFRRA/ACSFT": 	'IsCBLabel3',
		"IOM":			'IsCBLabel4',
		"MSF":			'IsCBLabel5',
		"PSTIC":		'IsCBLabel6',
		"REFUGE EGYPT":	'IsCBLabel7',
		"SAVE THE CHILDREN":	'IsCBLabel8',
		"UNICEF/TDH": 			'IsCBLabel9',
		"OTHER SERVICE PROVIDER":	'IsCBLabel10',
		// Vulnerability checkboxes in separate function! (appendHiddenCBITranslators)

		// ====== DROPDOWNS: ======

		// Background:
		"COUNTRY OF ORIGIN": 	'LCOUNTRYOFORIGIN',
		"ETHNIC ORIGIN": 		'LETHNICORIGIN',
		"SECOND LANGUAGE": 		'LSECONDLANGUAGE', // MATCH PAIR IN REQUIRED TRANSLATOR
		"MARITAL STATUS": 		'LMARITALSTATUS',
		// other information
		"RELIGION":				'Dropdown1',
		"UNHCR STATUS":			'Dropdown2',
		"SOURCE OF REFERRAL": 	'Dropdown3',
		"CITY OF ORIGIN": 		'Dropdown4',
		"VILLAGE OF ORIGIN":    'Dropdown4',
		"EMPLOYMENT STATUS": 	'Dropdown5',
		"NEIGHBORHOOD": 		'Dropdown6',
		"HIGHEST EDUCATION": 	'Dropdown7',
		"LAST RSD UPDATE":		'LPRIORITY',
		
		// ====== DATES: ======

		"DATE OF ARRIVAL IN EGYPT": 	'CDDateEntryCountryLabel',
		"DATE OF UNHCR REGISTRATION": 	'CDDateRegisteredLabel',
		"RSD DATE": 					'LRSDDATE'
	});
}

/**
 * Function adds hidden data translators to passed-in object,
 * IFF current page (at time of call) is Client Basic Information
 * 
 * Translators added for:
 * - Dependents (textboxes)
 * - Urgent Notes (textbox)
 * - Important Information (textbox)
 * - Vulnerabilities (textbox + checkboxes)
 * 
 * Doesn't explicitly return new object because object itself was changed
 * 
 * @param {object} obj - object that will get dependent and vuln translator
 * @param {boolean} override - override need for page to be CBI
 */
function appendHiddenCBITranslators( obj ) {
	// make sure caller is on 'ClientDetails/ClientDetails' page (CBI)
	if ( Utils_GetUrlPiece(Utils_GetPageURL()) !==
		Utils_GetUrlPiece( Utils_GetTabHref('ClientBasicInformation')) ) {
			return obj;
	}

	// ====== append dependent translator ======:
	obj["FAMILY SIZE"] = 			'CDDependentStatsLabel1';
	obj["UNHCR CASE SIZE"] = 		'CDDependentStatsLabel2'; // RLAP ONLY
	obj["DIRECT BENEFICIARIES"] =	'CDDependentStatsLabel3'; // PS ONLY
	obj["INDIRECT BENEFICIARIES"] =	'CDDependentStatsLabel4'; // PS ONLY

	// ====== append urgent notes translator ======:
	obj["URGENT NOTES"]	= 'ClntPanic_PANIC_NOTES';

	// ====== append important information translator ======:
	obj["IMPORTANT INFORMATION"] = "LIMPORTANTINFO";

	// ====== append vulnerability translator ======:
	// vulnerability notes textbox:
	obj["VULNERABILITY NOTES"] = 'DescNotes';

	// vulnerability checkboxes:
	// create array of vulnerability names from html
	var vulnLabelArray = $('form#postClntVulSubmit').find('label');

	// loop through vulnerability label elements to get name of
	// vulnerability & the 'for' attribute -> the element id of
	// the checkboxes
	$.each(vulnLabelArray, function( i, elem ) {
		// get vulnerability name and element ID
		var vulnName = elem.innerText;
		var elemId = elem.getAttribute('for');
		
		// put name and id key: value pair into obj
		obj[vulnName] = elemId;
	});

	// even though passed-in object was changed, still need to return it.
	return obj;
}

/**
 * Function makes all object 'name' values uppercase (in a key: value pair)
 * Reason: to make it easier to compare to other values later
 * 
 * TODO: probably update based on new object forms!
 * 
 * @param {object} obj - passed in object will be field translator object
 * @returns - passed in object, with values uppercased
 */
function uppercaseObjectValues(obj) {
	for (var property in obj) {
	    if (obj.hasOwnProperty(property)) {
	        // uppercase all of an object's 2nd value's 1st val's strings
	        obj[property][1][0] = obj[property][1][0].toUpperCase();
	    }
	}

	return obj;

	// TODO: below is old uppercasing function for standard obj
	// for (var property in obj) {
	//     if (obj.hasOwnProperty(property)) {
	//         // uppercase all of an object's values
	//         obj[property] = obj[property].toUpperCase();
	//     }
	// }

	// return obj;
}

/**
 * Footnote Comments:
 * 
 * A) Action Code - skipping the need for an action code in favor of easability.
 *    -> if this was required, users would have to search for action ids or ask
 *    -> RIPS db admin for codes. Now that this is commented out, they can just
 *    -> enter the exact action name. New possible issue is entering the action
 *    -> incorrectly (spelled wrong).
 * 
 */