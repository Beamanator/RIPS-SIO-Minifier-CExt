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