// =====================================================================================
//                                    PUBLIC FUNCTIONS
// =====================================================================================

/**
 * Function gets Field Translator from FieldTranslator.js - if file doesn't exist or function
 * is named something else, cancel import and display error.
 * 
 * Called by: MainController.js, CtrlRegistration.js, CtrlServices.js, CtrlAddAction.js
 * 
 * TODO: add field translator code to local store &/ or make it part of popup?
 * TODO: remove flag_getElemID
 * 
 * @param {string} type - type of translator to return: options = 'Required', 'Optional', 'Service', 'Action', 'All'
 * @param {boolean} flag_getElemID - true if caller wants elem ID, false if not (other option = spreadsheet column header)
 * @returns Field Translator object, or undefined
 */
function Utils_GetFieldTranslator( type, flag_getElemID ) {

	// all translators
	if (FT_getAllTranslator && type.toUpperCase() === 'ALL')
		return FT_getAllTranslator( flag_getElemID );

	// 'search' translator
	else if (FT_getSearchTranslator && type.toUpperCase() === 'SEARCH')
		return FT_getSearchTranslator( flag_getElemID );
	
	// required translator
	else if (FT_getRequiredTranslator && type.toUpperCase() === 'REQUIRED')
		return FT_getRequiredTranslator( flag_getElemID );

	// optional translator
	else if (FT_getOptionalTranslator && type.toUpperCase() === 'OPTIONAL')
		return FT_getOptionalTranslator( flag_getElemID );

	// action translator
	else if (FT_getActionTranslator && type.toUpperCase() === 'ACTION')
		return FT_getActionTranslator( flag_getElemID );

	// service translator
	else if (FT_getServiceTranslator && type.toUpperCase() === 'SERVICE')
		return FT_getServiceTranslator( flag_getElemID );

	// if Field Translator doesn't exist, can't add any clients, so cancel!
	else {
		var errorMessage = 'Field Translator [type="' + type 
			+ '"] not found! Cancelling import';

		// stop import and flag error message
		Utils_StopImport( errorMessage, function(response) {
			ThrowError({
				message: errorMessage,
				errMethods: ['mSwal', 'mConsole']
			});
		});

		return;
	}
}

/**
 * Function tells background.js to stop the auto import function via
 * action 'stopped_via_msg', and passes a message to background.js, then
 * the chrome runtime callback to caller
 * 
 * @param {string} message - message to pass to background.js
 * @param {function} callback - chrome runtime callback sent to caller. if not given,
 *                              defaults to console.error() fn
 */
function Utils_StopImport( message, callback ) {
	// take care of defaults
	if ( !message )
	message = 'stopping import for unknown reason';

	if ( !callback )
		callback = function(r) { 
			Utils_AddError(message);
		};

	// set action state to finished import state
	var mObj = {
		action: 'stopped_via_msg',
		message: message
	};

	// send message config (stop auto import) then display a message
	chrome.runtime.sendMessage(mObj, callback);
}

/**
 * Function skips current client being imported by completing the following steps:
 * 1) Adds skip error to stack
 * 2) resets action state to 'SEARCH_FOR_CLIENT'
 * 3) increments client index
 * 4) redirects to Advanced Search to import next client
 * 
 * @param {string} message - message to be added to stack
 * @param {number} ci - index of client being imported
 */
function Utils_SkipClient( message, ci ) {
	// handle unknown / string client index
	if (ci == undefined || typeof(ci) !== 'number')
		ci = '<Unknown>';
	else
		ci += 1; // -> add 1 for client #, not index
	
	// add client index to message to be helpful
	if (!message) message = '<Unspecified>';

	message = `Skipping Client #${ci}: ${message}`;

	// add error to stack, then navigate to advanced search page again
	Utils_AddError( message,
	function(response) {
		var mObj = {
			action: 'store_data_to_chrome_storage_local',
			dataObj: {
				'ACTION_STATE': 'SEARCH_FOR_CLIENT',
				'CLIENT_INDEX': '' // auto increment via background.js
			}
		};

		// saves action state, then redirects to advanced search
		chrome.runtime.sendMessage(mObj, function(response) {
			Utils_NavigateToTab( Utils_GetTabHref('AdvancedSearch') );
		});
	});
}

/**
 * Function navigates import to specific RIPS tab by clicking on the anchor with
 * specified href / URL
 * 
 * Called by: CtrlAdvancedSearch.js, MainController.js, CtrlServices
 * 
 * @param {string} tab_href - url piece that is contained within an anchor tag on the
 *                            left-hand navigation menu
 */
function Utils_NavigateToTab( tab_href ) {
	if ( tab_href !== undefined)
		$('a[href="' + tab_href + '"]')[0].click();
	else
		console.warn('Utils_NavigateToTab received invalid tab href');
}

/**
 * Function converts passed-in tab name to url piece that RIPS holds as a
 * location for each tab in navigation menu (left panel)
 * 
 * @param {string} tabName - name of tab you want url piece for 
 * @returns tab's href (location) - (or undefined if tabName is incorrect)
 */
function Utils_GetTabHref( tabName ) {
	// create map for tab name to url piece
	var map = {
		'Registration': 			'/Stars/Registration/Registration',
		'ClientBasicInformation': 	'/Stars/ClientDetails/ClientDetails',

		'AddAction': 				'/Stars/MatterAction/CreateNewAction',
		'Services': 				'/Stars/ClientDetails/ClientServicesList',
		// 'ViewActions': 		'/Stars/MatterAction/MatterActionsList', // not used

		'AdvancedSearch': 			'/Stars/SearchClientDetails/AdvancedSearch',
		'AdvancedSearch-Result': 	'/Stars/SearchClientDetails/ClientListSearchResult'
	};

	// get tab href from map
	var tab_href = map[tabName];

	// error if tabName is incorrect (or map is incorrect)
	if ( tab_href == undefined )
		console.error('tab name not defined in url map');
	
	// return tab href
	return tab_href;
}

/**
 * Function gets current page url (using jQuery) and returns it.
 * 
 * Called by: MainController.js
 * 
 * @returns gurrent page's url [as string]
 */
function Utils_GetPageURL() {
	return $(location).attr('href');
}

/**
 * Function takes a URL as an input and returns a 'url piece' as output. This output
 * is the last two slices of a URL (a slice is some text between '/' characters)
 * -> example: 'Registration/Registration'
 * 
 * If url doesn't have '/' characters, returns url
 * 
 * Called by: MainController.js, Utils.js
 * 
 * @param {string} url a full URL
 * @returns {string} 'urlslice1/urlslice2' - the final 2 slices of a url
 */
function Utils_GetUrlPiece( url ) {
	// convert input to a string and split it!
	var urlArr = String(url).split('/');
	var urlLen = urlArr.length;

	if (urlLen === 1)
		return url; 

	return urlArr[urlLen - 2] + '/' + urlArr[urlLen - 1];
}

/**
 * Function checks if a given piece of a URL is contained within the current page's
 * url string.  
 * 
 * Called By: CtrlAdvancedSearch.js
 * 
 * @param {string} urlPiece checks if this piece is within the current page url
 * @param {boolean} [throwErr=true] if true, throw error if urlPiece not found in url
 * @returns {boolean} true / false depending on if urlPiece is contained within current url
 */
function Utils_UrlContains(urlPiece, throwErr=true) {
	var url = Utils_GetPageURL();

	if (url.indexOf(urlPiece) === -1) {
		if (throwErr) {
			// error & quit if the import is not on the right page.
			ThrowError({
				message: urlPiece + ' not found on page: ' + url,
				errMethods: ['mConsole']
			});
		}
		return false;
	}

	return true;
}

/**
 * Function returns the description of the service for the given code
 * Purpose = for service controller to match to list of services on page
 * 
 * Called by: CtrlServices.js
 * 
 * @param {string} code - code of service (from Matters and Actions -> Matters) page
 * 						-> up to 6 characters long
 * @returns - string description of service, or undefined
 */
function Utils_GetServiceDescFromCode( code ) {
	// remove beginning and ending whitespace (spaces, \t, \n) from code
	code = code.trim();

	// set up translation mapping object
	var map = {										// id's below
		AEP:	'Adult Education Program',			// 65
		AFP: 	'PS Adults and Families Program',	// 56
		CEP: 	'Children\'s Education Program', 	// 64
		DA:		'PS Direct Assistance Program',		// 57 (note: NOT DAP!)
		DIER:	'PS Drop in and Emergency Response',		// 58
		EACB:	'Education Access and Capacity Building',	// 66
		GROUPS:	'PS Groups and Activities',			// 59
		MAN:	'Management',						// 67
		MED:	'PS Medical Access Program',		// 60
		MONT:	'Montessori Preschool',				// 63
		NONCLN:	'Non Client Time',					// 39
		OUT:	'Community Outreach',				// ???
		PDC:	'Professional Development Courses',	// 69
		PRO:	'RLAP Protection',					// 68
		RSD:	'RLAP RSD',							// 45
		RST:	'RLAP Resettlement', 				// 55
		UCY:	'PS Unaccompanied Children and Youth Program',	// 61
		UYBP:	'PS Unaccompanied Youth Bridging Program'		// 62
	};

	return map[code];
}

/**
 * Function returns a promise that gets resolved whenever a specified function
 * returns true. Caller passes in a function and possibly a number (time between
 * intervals)
 * 
 * @param {function} Fcondition - function / condition that must eventually return true
 * @param {object} params - array of parameters to pass to Fcondition
 * @param {number} [time=1000] - time between each interval call
 * @param {number} [iter=5] - number of iterations allowed before rejecting
 * @returns {object} - Promise  - resolve when Fcondition returns true
 * 								- reject if iterates more than iter variable
 */
function Utils_WaitForCondition( Fcondition, params, time = 1000, iter = 5 ) {
	return new Promise(function(resolve, reject) {
		var count = 0;
		
		var intervalID = setInterval(function() {
			// -> console logs may not work inside this function
			count++;
			
			// check if condition is true YET
			if ( Fcondition(params) ) {
				clearInterval(intervalID);
				resolve('condition passed');
			}

			// check if we've passed the desired amount of iterations on setInterval
			else if (count > iter) {
				clearInterval(intervalID);
				reject(`Condition <${Fcondition.name}> never returned true over ` +
					`${iter} checks, spaced by ${time}ms.`);
			}

		}, time);
	});
}

/**
 * Function turns setTimeout into promise function
 * 
 * @param {number} [waitTime=1000] - amount of time to wait in setTimeout
 * @returns promise to set timeout complete
 */
function Utils_WaitTime(waitTime=1000) {
	return new Promise( (resolve, reject) => {
		// after waiting specified time, call resolve
		setTimeout(resolve, waitTime);
	});
}

/**
 * Function inserts value into textbox / date fields using jQuery
 * OR if given 'id' corresponds to a select element, call special
 * insert function
 * 
 * Throw errors (Utils_AddError) will not occur in this function -> function
 * returns success / fail, so errors handled by caller
 * 
 * @param {any} value - string or number
 * @param {string} id - html id of element
 * @param {number} configParam  - (1,2) = methods for searching select elements
 * 								- (3)   = method for adding date element
 * @returns true if successfully found something and added it to form, false otherwise
 */
function  Utils_InsertValue(value, id, configParam) {
	let success = false,
		$elem = $('#' + id);

	// check if value or id are undefined
	if (!value || !id) {
		console.warn('Warning: value <' + value + '> or id <' + id +
			'> are undefined');
		success = false;
	}

	// if value exists, throw into field:
	else {
		// if id is for a select element, call special fn
		if ( $elem.is('select') ) {
			success = Utils_SetDropdownValue( value, id, configParam );
		}

		// else if id is for a checkbox (input[type="checkbox"]) element,
		// call special fn
		else if ( $elem.is('input[type="checkbox"]')  ) {
			success = Utils_SetCheckboxValue( value, id );
		}

		// if configParam is set to 3, use date fuction to validate and insert
		// date into form
		else if ( $elem.is('input') && configParam === 3 ) {
			success = Utils_SetDateValue( value, id );
		}

		// else, we don't need special function
		else {
			// if value starts with a '.', get rid of it (for dates):
			if (value[0] === '.')
				value = value.substr(1);
			
			if ($elem.length !== 1)
				success = false;
			
			else {
				$elem.val(value);
				success = true;
			}
		}
	}

	return success;
}

/**
 * Function inserts given date into form, and (if necessary) converts to necessary
 * format (DD/MM/YYYY)
 * 
 * @param {string} date - date of birth from client object
 * @param {string} elemID - element ID of date input box
 * @returns {boolean} - true / false if date is valid and was inserted successfully
 */
function Utils_SetDateValue( date, elemID ) {
	if (!date || !elemID) {
		Utils_AddError('Date data not found');
		return false;
	}

	// remove beginning '.' if present
	if (date[0] === '.') {
		date = date.substr(1);
	}

	// check if date is timestamp like: 7/31/2017  4:25:37 PM (service start date)
	// check for at least 1 space ' ' and at least 1 ':' to guess date is this fmt
	// -> if has ' ' and ':', take string before ' ' as date
	// -> Timestamps should all be converted to '02-Jan-2000' before import works!
	if (date.trim().indexOf(' ') !== -1 && date.indexOf(':') !== -1) {
		date = date.split(' ')[0];
	}
	
	var newDate,
		$elem = $('#' + elemID);

	// if date contains 3 '-' chars, assume format is like: '1-Mar-2017'
	if ( date.split('-').length === 3 ) {
		let dateArr = date.split('-');

		let d = parseInt( dateArr[0] );
		let m = Utils_GetMonthNumberFromName( dateArr[1] );
		let y = parseInt( dateArr[2] );

		// throw error & return invalid if month invalid
		if (!m || m === '') {
			Utils_AddError(`ERROR getting month # from month<${dateArr[1]}>!`);
			return false;
		}

		// Don't need to add beginning '0' because RIPS doesn't care
		newDate = '' + d + '/' + m + '/' + y;
	}

	// If date contains 3 '/' chars, valid if format is like: 'DD/MM/YYYY'
	// Not allowing format 'MM/DD/YYYY' b/c too difficult to allow both and avoid
	// 	inaccurate data
	else if ( date.split('/').length === 3 ) {
		let dateArr = date.split('/');

		let d = parseInt( dateArr[0] );
		let m = parseInt( dateArr[1] );
		let y = parseInt( dateArr[2] );

		if ( d < 1 || d > 31 ) {
			Utils_AddError(`<Date>: Day (${d}) out of range!`);
			return false;
		} else if ( m < 1 || m > 12 ) {
			Utils_AddError(`<Date>: Month (${m}) out of range!`);
			return false;
		} else if ( y < 1900 || y > ((new Date()).getUTCFullYear() + 1) ) {
			Utils_AddError(`<Date>: Year (${y}) out of range!`);
			return false;
		} else {
			newDate = '' + d + '/' + m + '/' + y;
		}
	}

	// format doesn't match above options, so invalid
	else {
		Utils_AddError('<Date>: Format is invalid');
		return false;
	}

	// insert new Date into form
	$elem.val(newDate);

	// return true b/c no errors were hit above, and date was inserted!
	return true;
	// return Utils_InsertValue( newDate, dobID );
}

/**
 * Function attempts to match a value to the inner text of all of the options in
 * a dropdown (select) element
 * 
 * If successful match is found, sets that option as 'selected' in dropdown
 * 
 * NOTE: only works for single-select dropdowns!
 * 
 * TODO: provide extra options for select dropdowns? is this possible? (probably not)
 * ex: male = "M" OR "male"
 * ex: sudan = "Sudan" OR "Sudanese"
 * 
 * @param {string} valToMatch - value to look for in dropdown (select) element
 * @param {string} elemID - html id of select element to search through
 * @param {number} [searchMethod=1] - 1 = by innerText (ex: lang, action)
 * 									- 2 = by elem 'value' property
 * @returns success (true / false) in finding the valToMatch variable
 */
function Utils_SetDropdownValue( valToMatch, elemID, searchMethod=1 ) {
	var found = false;

	// find select element (jQuery) and loop through each option element
	$('select#' + elemID + ' option').each(function(rowIndex, optionElem) {
		// get inner text (trimmed and uppercase) from current option element
		let optionText;
		
		// get text via innerText
		if (searchMethod === 1) {
			optionText = optionElem.innerText.trim().toUpperCase();
		}

		// get text via element value
		// Right now removing (.trim()) b/c this search method is used only for
		// service codes, which need the extra spaces to match values properly
		else if (searchMethod === 2) {
			optionText = optionElem.value.toUpperCase();
		}

		// search method doesn't exist, so quit with found = false still
		else {
			console.warn('Invalid searchMethod:', searchMethod);
			return false;
		}

		// if this text matches variable 'valToMatch':
		// 1) get option value,
		// 2) 'select' that value,
		// 3) change 'found' variable
		// 4) and break loop!
		if (optionText === valToMatch.toUpperCase()) {

			let optionVal = optionElem.value; // 1 - get id
			$('select#' + elemID).val( optionVal ).change(); // 2 - put val in dropdown
			found = true; // 3 - change variable
			return false; // 4 - break loop
		}
	});

	return found;
}

/**
 * Function checks or unchecks given checkbox html id to align with passed-in
 * desired value
 * 
 * @param {boolean} value - desired end state of checkbox
 * @param {string} elemID - html element id matching with input[type="checkbox"]
 * @returns {boolean} - true / false if successfully set checkbox value
 */
function Utils_SetCheckboxValue( value, elemID ) {
	var $elem = $('input#' + elemID);

	// if jQuery found 0 or multiple elements, not successful
	if ($elem.length !== 1)
		return false;

	var isChecked = $elem.is(':checked');

	// checkbox should be 'true' / checked
	if ( value ) {
		// do nothing because already checked
		if ( isChecked ) {}

		// else click it so it becomes checked
		else $elem.click();
	}

	// checkbox should be 'false' / unchecked
	else {
		// click so it becomes unchecked
		if ( isChecked ) $elem.click();

		// else do nothing because already unchecked
		else {}
	}

	return true;
}

/**
 * Function converts month names into month numbers. Month names can either
 * be 3 letters (Ex: Jan, Mar, Sep...)
 * or full names (Ex: January, March, September...)
 * 
 * @param {string} month - 3 letter month, or full month name
 * @returns month number (Jan = 1, Sep = 9, etc...)
 */
function Utils_GetMonthNumberFromName( month ) {
	let monthTransObj = {
		'JAN': 1,	'JANUARY': 	1,
		'FEB': 2,	'FEBRUARY': 2,
		'MAR': 3,	'MARCH': 	3,
		'APR': 4,	'APRIL': 	4,
		'MAY': 5,
		'JUN': 6,	'JUNE': 	6,
		'JUL': 7,	'JULY': 	7,
		'AUG': 8,	'AUGUST': 	8,
		'SEP': 9,	'SEPTEMBER': 9, 'SEPT': 9,
		'OCT': 10,	'OCTOBER': 	10,
		'NOV': 11,	'NOVEMBER': 11,
		'DEC': 12,	'DECEMBER': 12
	};

	return monthTransObj[ month.toUpperCase() ];
}

/**
 * Function takes an array of arrays returned from inserting values into forms.
 * 2D Array looks like this:
 * [
 * 		[ {boolean} - true / false if error, {string} - field name ],
 * 		[ (same as above) ], ...
 * ]
 * 
 * @param {object} fieldArr -2D array shaped as described above
 * @param {number} ci - client index of client being imported now
 * @returns {boolean} - true / false if fieldArr contains any errors
 */
function Utils_CheckErrors( fieldArr, ci ) {
	let allPass = true;

	/**
	 * Plan: 
	 * 1) loop through field containers (fieldArr)
	 * 2) In each container, check if first value [0] is true / false
	 *   - if true, it passed so move on.
	 *   - if false, it failed so build message, throw Utils_AddError with message
	 * 3) return true if all passed, false if any failed
	 */

	// 1) loop through fieldArr
	for (let i = 0; i < fieldArr.length; i++) {
		let fieldContainer = fieldArr[i];
		
		let fieldPass = fieldContainer[0];
		let fieldName = fieldContainer[1];

		// 2) check if field didn't pass
		if (!fieldPass) {
			allPass = false;

			// create error message
			let errMsg = `Field Invalid - Client #${ci + 1}` +
				` - Field: <${fieldName}>.`;

			Utils_AddError(errMsg);

			// Don't skip other fields - let all errors show up here
		}

		// field passed, so move on
		else {}
	}

	// 3) return final status - all pass or at least 1 failed
	return allPass;
}

/**
 * Function adds error to chrome store (handled by options.js)
 * 
 * @param {string} message - error message to send to options.js
 * @param {function} callback - (optional) callback function after error is thrown
 */
function Utils_AddError( message, callback ) {
	if (!message || message === '')
		message = 'Unspecified error!';

	// if no callback function was passed in, tell receiver there's no callback
	if (!callback)
		callback = function(r) { console.error('Error:', message); }

	let mObj = {
		action: 'catch_error',
		message: message
	};

	chrome.runtime.sendMessage(mObj, callback);
}

/**
 * Function determines which search action state should come after given action, based
 * on search settings from import page
 * 
 * Order of searches to run (based on unique-ness):
 * 1) StARS Number
 * 2) UNHCR Number
 * 3) Main Phone Number
 * 4) Other Phone Number
 * 5) Next Client - move to next client
 * 
 * @param {string} action - 'current' action state of import
 * @param {object} searchSettings - search settings (from options page)
 * @returns {string} - next action state, based off current state
 */
function Utils_GetNextSearchActionState(action, searchSettings) {
	let nextAction;
	let byUnhcr = searchSettings.byUnhcr,	byStarsNumber = searchSettings.byStarsNumber;
	let byPhone = searchSettings.byPhone,	byOtherPhone = searchSettings.byOtherPhone;

	// determine next client search state
	switch(action) {
		// From 'searchForDuplicates' - still on 'search' page.
		case 'SEARCH_FOR_CLIENT':
			// set next action by following search heirarchy
			if (byStarsNumber)	 	nextAction = 'SEARCH_FOR_CLIENT_STARS_NUMBER';
			else if (byUnhcr)		nextAction = 'SEARCH_FOR_CLIENT_UNHCR_NUMBER';
			else if (byPhone)		nextAction = 'SEARCH_FOR_CLIENT_PHONE';
			else if (byOtherPhone)	nextAction = 'SEARCH_FOR_CLIENT_OTHER_PHONE';
			else nextAction = 'NEXT_CLIENT';
			break;
		
		// From 'processSearchResults' - on 'search results' page.
		case 'ANALYZE_SEARCH_RESULTS_STARS_NUMBER':
			// set next action by following search heirarchy
			if (byUnhcr)			nextAction = 'SEARCH_FOR_CLIENT_UNHCR_NUMBER';
			else if (byPhone)		nextAction = 'SEARCH_FOR_CLIENT_PHONE';
			else if (byOtherPhone)	nextAction = 'SEARCH_FOR_CLIENT_OTHER_PHONE';
			else nextAction = 'NEXT_CLIENT';
			break;

		case 'ANALYZE_SEARCH_RESULTS_UNHCR_NUMBER':
			// set next action by following search heirarchy
			if (byPhone)		nextAction = 'SEARCH_FOR_CLIENT_PHONE';
			else if (byOtherPhone)	nextAction = 'SEARCH_FOR_CLIENT_OTHER_PHONE';
			else nextAction = 'NEXT_CLIENT';
			break;

		case 'ANALYZE_SEARCH_RESULTS_PHONE':
			// set next action by following search heirarchy
			if (byOtherPhone)	nextAction = 'SEARCH_FOR_CLIENT_OTHER_PHONE';
			else nextAction = 'NEXT_CLIENT';
			break;

		case 'ANALYZE_SEARCH_RESULTS_OTHER_PHONE':
			// set next action by following search heirarchy
			nextAction = 'NEXT_CLIENT';
			break;
		
		// default: // not needed - return undefined
	}

	return nextAction;
}

// =====================================================================================
//                                 UNUSED FUNCTIONS
// =====================================================================================

/**
 * Function finds a select element (from input select_selector) using jQuer, then
 * returns true if the select element has an option element selected, and
 * returns false if the select element has not been 'populated' / selected
 * 
 * UNUSED because it's easier to just check while looping through dropdowns...
 * for now
 * 
 * @param {object} selector_arr - single-element array with jQuery selector
 * 								  to locate desired select element
 * @returns {boolean} - if select element has a 'selected' option element
 */
function Utils_IsSelectElemPopulated( selector_arr ) {
	var select_selector = selector_arr[0];

	// if selector_arr has more than 1 element, console log warning (don't quit)
	if (selector_arr.length > 1)
		console.warn('Utils_IsSelectElemPopulated has too many elements in arg array');

	// check to make sure input is valid
	if ( !$(select_selector).is('select') ) {
		// select_selector is not a select element, so processing will fail! - quit
		// error should be thrown by calling function
		return false;
	}

	// get number of selected items out of given select element's selected options
	var selectedOptions = $( select_selector + ' option:selected');

	if ( selectedOptions.length === 0 ) {
		// select element doesn't have any option element selected yet
		return false;
	} else if ( selectedOptions.length === 1 && selectedOptions.val() ) {
		// select element has a selected element populated & it isn't ""
		return true;
	} else {
		console.warn('I think we would be here if more than one option is selected'
			+ ' which we DIDNT PREPARE FOR??');
	}
}