// ============================== PAGE CONTROLLER =======================
/**
 * Controller function for Registration.js - decides what to do based off of
 * passed in config.
 * 
 * Called by: Run_Registration [in MainContent.js]
 * 
 * @param {object} config 
 */
function Registration_Controller( config ) {
	var action = config.action;
	var clientIndex = config.clientIndex;
	var clientData = config.clientData;

	switch(action) {
		// Enter client UNHCR and press 'search'
		case 'REGISTER_NEW_CLIENT':
			registerNewClient(clientIndex, clientData);
			break;

		// Action not handled by Registration.js!
		default:
			console.error('Unhandled action found in Registration.js:', action);
	}
}

// ============================== MAIN FUNCTIONS =============================

/**
 * Main function to run for registering new clients - gets client data (and index)
 * in preparation for adding to Registration page
 * 
 * @param {number} clientIndex - index of client in all client data
 * @param {object} clientData - all client data
 */
function registerNewClient(clientIndex, clientData) {
	if (clientIndex == undefined) clientIndex = 0;

	var client = clientData[clientIndex];

	// TODO: pass in FB config here (future)
	var success = insertRequiredClientDetails(client, clientIndex);

	if (success) {
		// next check if there is more data to save in CBI
		var mObj = {
			action: 'store_data_to_chrome_storage_local',
			dataObj: {
				'ACTION_STATE': 'CHECK_CLIENT_BASIC_DATA'
			}
		};

		// save action state in local storage
		chrome.runtime.sendMessage(mObj, function(response) {
			// Deciding what to do next is not needed because page automatically
			// redirects to CBI, which is where do-next is calculated
			// HOWEVER, at this point, if a field has been skipped OR a field
			// is invalid (decided by RIPS Validation Extension), a swal popup
			// (sweet alert) may show up. Now we will check for it and skip client
			// if it exists.
			checkForSwal()
			
			// success => no fatal error found
			.then(function(success) {
				// Here we click the 'save button'
				// -> redirects to Client Basic Information if data valid
				$('input[value="Save"].newField').click();

				// check again for Swal
				checkForSwal()
				.then(function(success) {
					// this condition should never be reached because this means
					// no swal occured. In this case, page will redirect to
					// CBI if no swal occurs
				})
				.catch(function(errMsg) {
					// error, skip client.
					Utils_SkipClient(errMsg, clientIndex);
				});;
			})

			// error => fatal error found! Skip client
			.catch(function(errMsg) {
				Utils_SkipClient(errMsg, clientIndex);
			});
		});
	}
	
	// data was not added successfully, so skip client
	else {
		let msg = 'Unsuccessful insertion of client data on Registration page.';

		// Note: specific error is thrown in insertRequiredClientDetails
		console.error(msg);

		// add error to stack and navigate back to Advanced Search to import next
		Utils_SkipClient(msg, clientIndex);
	}
}

/**
 * Function adds all available client details (in client object) onto registration page
 * (clicking save is done elsewhere)
 * 
 * @param {object} client - client object to import
 * @param {number} ci - index of specific client being imported
 * @returns {boolean} - true if successful (no internal errors), false if unsuccessful
 */
function insertRequiredClientDetails(client, ci) {
	// =============== get FieldTranslator ================
	var FTr = Utils_GetFieldTranslator( 'Required' );

	// if FT wasn't found, return false (quit).
	if (!FTr) {
		Utils_AddError('"Required" Field Translator not found');
		return false;
	}

	let f_n; // shortener for field_name variables

	let pass = Utils_CheckErrors([
		// === Add Required fields to form ===
		[ NameInsert( client, FTr ), 'NAME' ],
		
		[ Utils_InsertValue( client[ f_n='UNHCR NUMBER' ],	FTr[f_n] ), f_n ],
		[ Utils_InsertValue( client[ f_n='PHONE NUMBER' ],	FTr[f_n] ), f_n ],

		// Date:
		[ Utils_InsertValue( client[ f_n='DATE OF BIRTH' ], FTr[f_n], 3 ), f_n ],

		// Dropdowns:
		[ Utils_InsertValue( client[ f_n='GENDER' ], 		FTr[f_n] ), f_n ],
		[ NationalityInsert( client[ f_n='NATIONALITY' ],	FTr, ci  ), f_n ],
		[ LanguageInsert( client[ f_n='MAIN LANGUAGE' ],	FTr, ci  ), f_n ]
	], ci);

	return pass;
}

// ========================= DATA INTERPRETERS ========================

/**
 * Function strips a full name into first & last, then adds to form
 * First name = Name 1
 * Last name = Name 2 - End
 * 
 * @param {string} fullName - client's full name that needs to be parsed
 * @param {string} firstNameID - element ID of first name
 * @param {string} lastNameID - element ID of last name
 * @returns {number} 1 if fullName doesn't exist (error)
 */
function fullNameInsert( fullName, firstNameID, lastNameID ) {
	if (!fullName) return false;

	// new version
	var firstName = fullName.substr(0, fullName.indexOf(" "));
	var lastName = fullName.substr(fullName.indexOf(" ") + 1);

	// old version:
	// var firstName = fullName.substr(0, fullName.lastIndexOf(" "));
	// var lastName = fullName.substr(fullName.lastIndexOf(" ") + 1);

	// TODO: don't user checkErrors b/c that one throws errors too!
	let pass = (
		Utils_InsertValue( firstName, firstNameID ) &&
		Utils_InsertValue( lastName, lastNameID )
	);

	return pass;
}

/**
 * Function attempts to insert a name into RIPS - using either full-name logic
 * or first & last name logic.
 * 
 * @param {object} client - client data object being imported into RIPS
 * @param {object} FTr - required field translator from FieldTranslator.js
 * @returns {boolean} - true / false if inserts succeeded
 */
function NameInsert(client, FTr) {
	if (!client || !FTr) return false;

	let pass = true;

	// if client name comes from ONE column ('FULL NAME')
	if (client['FULL NAME']) {
		// Logic if one column contains full name
		pass = fullNameInsert( client['FULL NAME'],
							FTr['FIRST NAME'], FTr['LAST NAME'] );
	}

	// else, name comes from multiple columns ('FIRST / LAST NAME')
	else {
		let f_n; // shortener for field_name variables

		pass = (
			Utils_InsertValue( client[f_n='FIRST NAME'], FTr[f_n] ) &&
			Utils_InsertValue( client[f_n='LAST NAME'],  FTr[f_n] )
		);
	}

	return pass;
}

/**
 * Function inserts client's language data into RIPS form. Primary goal is to store
 * main language, but if user has main and seconary language data in the cell
 * (separated by a comma), enters both into form.
 * 
 * @param {string} langValue - language(s) that client speaks (only 2 get saved)
 * @param {object} FTr - Field Translator object for Required data
 * @param {number} ci - index of client being imported
 * @returns {boolean} - true/false success of insert(s)
 */
function LanguageInsert(langValue, FTr, ci) {
	// check if langValue has comma in it -> if yes, have to insert second lang into
	// 'Second Language" dropdown.
	if (langValue.indexOf(',') !== -1) {
		let langArr = langValue.split(',');

		let lang1 = langArr[0].trim();
		let lang2 = langArr[1].trim();

		// throw warning error if more than 2 languages were found in column
		if (langArr.length > 2) {
			let errMessage = 'Client #' + (ci + 1) + ' - Warning: Only 2 of ' +
				langArr.length + ' languages from "' + langValue + '" will be saved.';

			Utils_AddError( errMessage );
		}

		// return overall success of adding both languages to client
		return (
			Utils_InsertValue( lang1, FTr['MAIN LANGUAGE'] ) &&
			Utils_InsertValue( lang2, FTr['SECOND LANGUAGE'] )
		);
	}

	// if no comma, only 1 language so just insert it straight away.
	else {
		return Utils_InsertValue( langValue, FTr['MAIN LANGUAGE'] );
	}
}

/**
 * Function inserts client's nationality data into RIPS form. Primary goal is to
 * split away the real nationality from possible supporting data in parentheses.
 * This function is necessary for Fedena imports since many Fedena nationalities
 * have extra data in parens that won't match dropdowns in RIPS.
 * 
 * @param {string} natValue - nationality of client (from import spreadsheet)
 * @param {object} FTr - Field Translator object for required data
 * @param {number} ci - index of client being imported
 * @returns {boolean} - true/false success of insert
 */
function NationalityInsert(natValue, FTr, ci) {
	let nationality = '';

	// Check if there is a paren in the nationality value
	if (natValue.split('(').length > 1) {
		// get first part of nationality, before ()'s.
		let newNat = natValue.split('(')[0].trim();

		// if newNat is invalid, throw error and return false!
		if (newNat.length < 2) {
			let err = `Client #${ci + 1} - Nationality "${natValue$}"` +
				' doesn\'t have proper format before the parens "()".';
			
			Utils_AddError( err );
			return false;
		}
	}

	// no paren, so natValue should be exact nationality desired
	else
		nationality = natValue;

	// insert nationality into html form, return success of insert
	return Utils_InsertValue( nationality, FTr['NATIONALITY'] );
}

// ============================== OTHER INTERNAL ================================

/**
 * Function checks for a swal error on the Registration page (after slight delay)
 * just in case validation extension threw up a warning after inputting data.
 * 
 * @param {number} [time=1000] - amount of time to wait before checking for swal
 * @returns - Promise which gets resolved if no fatal error, rejected if fatal found
 */
function checkForSwal(time=1000) {
	return new Promise( function(resolve, reject) {
		// After set amount of time, look for swal error
		setTimeout( function() {
			let $alert = $('.sweet-alert');

			// if alert is visible, skip to next client
			if ( $alert.hasClass('visible') ) {
				// now that we know that alert is visible, get error text and
				// skip to next client.
				let sweetAlertHeader = $alert.children('h2').text(),
					sweetAlertText = $alert.children('p').text();

				// If text "warning" is found at the beginning of the swal error
				// header, don't skip client - it's just a warning error
				if (sweetAlertHeader.toUpperCase().indexOf('WARNING') === 0) {
					// don't log error
					resolve('success');
				}
				
				// warning popped up, without 'warning' text, so call it fatal
				else {
					let msg = 'Error occured when registering client: ' + sweetAlertText;

					reject(msg);
				}
			}

			// if alert isn't visible, don't do anything special
			else {
				resolve('success');
			}
		}, time);
	});
}