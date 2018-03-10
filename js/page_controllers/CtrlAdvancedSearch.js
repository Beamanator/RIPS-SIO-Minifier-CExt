// ============================== PAGE CONTROLLER =======================
/**
 * Controller function for Advanced Search pages - decides what to do based off of
 * passed in config object.
 * 
 * Called by: Run_AdvancedSearch [in MainContent.js]
 * 
 * @param {object} config 
 */
function AdvancedSearch_Controller( config ) {
	var action = config.action;
	var clientIndex = config.clientIndex;
	var clientData = config.clientData;

	var importSettings = config.importSettings;
	
	switch(action) {
		// Enter client data and press 'search'
		case 'SEARCH_FOR_CLIENT':
		case 'SEARCH_FOR_CLIENT_UNHCR_NUMBER':
		case 'SEARCH_FOR_CLIENT_PHONE':
		case 'SEARCH_FOR_CLIENT_OTHER_PHONE':
		case 'SEARCH_FOR_CLIENT_STARS_NUMBER':
			kickoffSearch(clientIndex, clientData, importSettings, action);
			break;

		// Analyze search results - depending on search result,
		// redirect to next search criteria
		case 'ANALYZE_SEARCH_RESULTS_UNHCR_NUMBER':
		case 'ANALYZE_SEARCH_RESULTS_PHONE':
		case 'ANALYZE_SEARCH_RESULTS_OTHER_PHONE':
		case 'ANALYZE_SEARCH_RESULTS_STARS_NUMBER':
			processSearchResults(clientIndex, clientData, importSettings, action);
			break;

		// Action not handled by AdvancedSearch.js!
		default:
			let err = 'Unhandled action found in AdvancedSearch.js: ' + action;

			// stop import and flag error message
			Utils_StopImport( err, function(response) {
				ThrowError({
					message: err,
					errMethods: ['mConsole']
				});
			});
	}
}

// ============================== MAIN FUNCTIONS =======================

/**
 * Function gets client index and data, sticks client data in related checkbox
 * (depending on action), and then clicks "search".
 * 
 * Before the click, set action state to the appropriate next step
 * - 'ANALYZE_SEARCH_RESULTS_*'
 * 
 * @param {number} clientIndex - index of client in all client data
 * @param {object} clientData - all client data
 * @param {object} importSettings - configurable import settings from options page
 * @param {string} action - import's ACTION_STATE - for which search to do
 */
function kickoffSearch(clientIndex, clientData, importSettings, action) {
	// check if client index is out of range of client data array [done!]
	if ( clientIndex >= clientData.length ) {
		let msg = `(jk) - Import Finished! Check errors above :)`;

		// stop import and show finished message
		Utils_StopImport( msg, function(response) {
			ThrowError({
				message: msg,
				errMethods: ['mConsole']
			});
		});
		return;
	}

	// now get UNHCR number & put it in #HoRefNo
	var client = clientData[clientIndex];
	var FTs = Utils_GetFieldTranslator( 'Search' );
	if (!FTs)
		return; // error handling in Utils function

	// if all search settings are unchecked, quit import before beginning
	let searchSettings = importSettings.searchSettings;
	if (!searchSettings.byUnhcr && !searchSettings.byStarsNumber 
	&& !searchSettings.byPhone && !searchSettings.byOtherPhone) {
		let msg = 'Need to check at least one search type checkbox :)';

		// stop import and throw error
		Utils_StopImport(msg, function(res) {
			ThrowError({
				message: msg,
				errMethods: ['mAlert', 'mConsole']
			});
		});
		return;
	}

	// change action to next search action state
	if (action === 'SEARCH_FOR_CLIENT') {
		action = Utils_GetNextSearchActionState(action, searchSettings);
	}

	let valueCode, nextActionState;

	// get valueCode and next action depending on action / value to insert
	switch(action) {
		case 'SEARCH_FOR_CLIENT_UNHCR_NUMBER':
			valueCode = 'UNHCR NUMBER';
			nextActionState = 'ANALYZE_SEARCH_RESULTS_UNHCR_NUMBER';
			break;

		case 'SEARCH_FOR_CLIENT_PHONE':
			valueCode = 'MAIN PHONE';
			nextActionState = 'ANALYZE_SEARCH_RESULTS_PHONE';
			break;
		
		case 'SEARCH_FOR_CLIENT_OTHER_PHONE':
			valueCode = 'OTHER PHONE';
			nextActionState = 'ANALYZE_SEARCH_RESULTS_OTHER_PHONE';
			break;
		
		case 'SEARCH_FOR_CLIENT_STARS_NUMBER':
			valueCode = 'STARS NUMBER';
			nextActionState = 'ANALYZE_SEARCH_RESULTS_STARS_NUMBER';
			break;

		// if all other searches are done, skip to next client
		case 'NEXT_CLIENT':
			Utils_SkipClient('Done searching for this client. Start next.',
				clientIndex);
			break;
		
		default:
			let err = `SOMETHING MIGHT BE WRONG - action<${action}>`;

			// stop import and flag error message
			Utils_StopImport( err, function(response) {
				ThrowError({
					message: err,
					errMethods: ['mConsole']
				});
			});
	}

	if (!valueCode) return; // err handled above in 'default'
	if (action === 'NEXT_CLIENT') return; // client skipping code above

	// check to make sure search value exists. If not, fail!
	if ( !client[valueCode] ) {
		let err = `Search value <${valueCode}> is undefined` +
			` <${client[valueCode]}> - search failed.`;

		// skip client if any search type is undefined
		// TODO: skip search type, but not entire client
		Utils_SkipClient(err, clientIndex);

		// quit search function early
		return;
	}

	// put value into necessary textbox
	let f_n = valueCode; // (field_name)
	let pass = Utils_CheckErrors([
		[ Utils_InsertValue(client[f_n], FTs[f_n]), f_n ]
	], clientIndex);

	// insert passed - continue import by searching for clients
	if (pass) {
		// store next action state before clicking 'search'
		let mObj = {
			action: 'store_data_to_chrome_storage_local',
			dataObj: {
				'ACTION_STATE': nextActionState
			}
		};

		// send message obj, then click 'search' (refreshes page)
		chrome.runtime.sendMessage(mObj, function(response) {
			$('input[value="Search"]').click();
		});
	}
	
	// no pass -> skip client with warning
	else {
		// NOTE: We should never get here! Other warnings / errors above should
		// 	be enough to handle everything.
		let err = `Somehow something went wrong with Utils_InsertValue! Check ` +
			`errors on import page.`;

		Utils_SkipClient(err, clientIndex);
	}
}

/**
 * Function is called after Search button has been clicked - analyze new state of
 * the page.
 * 
 * @param {number} clientIndex - index of client in all client data
 * @param {object} clientData - all client data
 * @param {object} importSettings - configurable import settings from options page
 * @param {string} action - see above
 */
function processSearchResults(clientIndex, clientData, importSettings, action) {
	let searchSettings = importSettings.searchSettings;

	// First check if the window is at the Advanced Search page in RIPS
	if ( !Utils_UrlContains( Utils_GetTabHref('AdvancedSearch-Result'))) {

		// Not on search results page, check if on Advanced Search page,
		// -> just to be cautious.
		if ( Utils_UrlContains( Utils_GetTabHref('AdvancedSearch'))) {
			// timeout wait is 1 second (1000 ms)
			let waitTime = 1000;

			// After a bit of time, then check for presence of popup on page
			Utils_WaitTime(waitTime)
			.then(function() {
				let $alert = $('.sweet-alert');

				if ( $alert.hasClass('visible') ) {
					// alert was generated, meaning there were either 0 clients found
					// or > 100 results
					let sweetAlertText = $alert.children('p').text();
					
					// Aug 7 2017, these are possible popup texts:
					let mNoResults = 'There are 0 result have been found.',
						mManyResults = "Search results more than 100";

					// dismiss popup - not necessary
					// $('button.confirm').click();

					// 0 results! No error, decide if we need to create client
					if (sweetAlertText === mNoResults) {
						decideNextStep(importSettings, clientIndex, action);
						return;
					}

					// > 100 results! Search next option or skip client
					if (sweetAlertText === mManyResults) {
						// get next action to do
						let nextAction = Utils_GetNextSearchActionState(action, searchSettings);
						
						// skip client - due to not finding client from import data
						if (nextAction === 'NEXT_CLIENT') {
							Utils_SkipClient('Data not specific enough to find client.',
								clientIndex);
						}
						
						// else, start new search w/ next action
						else {
							// add msg here about > 100 results! Then do next search type
							let msg = `Action<${nextAction}> not specific enough` +
								' to find unique client account.';
								
							Utils_AddError(msg, function() {
								navigateToAdvancedSearch(nextAction);
							});
						}
					}

					// WHAT HAPPENED??? Somehow there is a popup but the text
					// isn't handled here, so we must error and skip client!
					// -> don't do other searches, just error since this is weird
					else {
						let msg = 'Error! Unhandled popup text found on search page:'+
							`"${sweetAlertText}", with action:<${action}>`;

						Utils_SkipClient(msg, clientIndex);
					}
				}
				
				// No alert is visible, but we're on the 'AdvancedSearch' page, so
				// obviously we missed something.
				else {
					// Note: as of August 7, 2017
					// - Popups occur when > 100 results AND when 0 results, so
					// - there shouldn't be any situation when popup doesn't occur
					// - and URL is still .../AdvancedSearch
					// BUT just in case, decide what to do now
					decideNextStep(importSettings, clientIndex, action);
				}
			});

		// Apparently page isn't 'AdvancedSearch' or 'AdvancedSearch-Result', so
		// not sure where we are anymore... throw an error and stop import please :)
		} else {
			let errMessage = 'Moved from Advanced Search page too abruptly :(\n' +
				'It is recommended to clear data & start over';

			Utils_StopImport( errMessage, function(response) {
				ThrowError({
					message: errMessage,
					errMethods: ['mConsole', 'mAlert']
				});
			});
		}
	}

	// page IS 'AdvancedSearch-Results' -> There ARE results :)
	else {
		// get client variables
		let client = clientData[clientIndex];
		let clientImportNames = getClientImportNames({
			firstName: client['FIRST NAME'],
			lastName: client['LAST NAME'],
			fullName: client['FULL NAME']
		});
		let clientUnhcrNo = client['UNHCR NUMBER'];

		// if names object didn't return correctly, throw error and skip client
		if (Object.keys(clientImportNames).length === 0) {
			// error will (probs) be same for all clients, so stop import
			let errMessage = `Somehow found a weird mix of first name ` +
				`<${clientFirstName}>, last name <${clientLastName}>, ` +
				`and full name <${clientFullName}> data from import. Quitting.`;

			Utils_StopImport( errMessage, function(response) {
				ThrowError({
					message: errMessage,
					errMethods: ['mConsole', 'mAlert']
				});
			});
			return;
		}

		// get row data
		let resultRows = $('.table.table-striped.grid-table')
			.find('tr.grid-row');
		let rowsToSearch = [];

		// properties of each row (in HTML "data-name" attribute):
		let rowHtmlData = {
			Stars_No: 			"NRU_NO",
			Unhcr_No: 			"HO_REF_NO",
			First_Name: 		"ForeName",
			Last_Name: 			"SurName",
			Caseworker: 		"CASEWORKER",
			Nationality: 		"NATIONALITY",
			Country_Of_Origin: 	"TownBirthDesc"
		};
		
		// for every row element, push name data to array
		for (let i = 0; i < resultRows.length; i++) {
			let $this = $(resultRows[i]);

			// get data from search results
			let rowStarsNo =
				$this.find(`td[data-name="${rowHtmlData.Stars_No}"]`).text();
			let rowFirstName =
				$this.find(`td[data-name="${rowHtmlData.First_Name}"]`).text();
			let rowLastName =
				$this.find(`td[data-name="${rowHtmlData.Last_Name}"]`).text();
			let rowUnhcrNo =
				$this.find(`td[data-name="${rowHtmlData.Unhcr_No}"]`).text();

			// instead of matching here, just get names (push to array)
			// 	then use fuse.js to search through names after loop
			rowsToSearch.push({
				'resultIndex': i,
				starsNo: rowStarsNo,
				firstName: rowFirstName,
				lastName: rowLastName,
				elem: $this
			});
		}

		// get matching settings from import settings
		let matchSettings = importSettings.matchSettings;
		let matchFirst = matchSettings.matchFirst,
			matchLast = matchSettings.matchLast;
			
		let matches = [];

		let result_firstName = [],
			result_lastName = [];

		// get first name search results if import settings say so
		if (matchFirst) {
			let fuseConfig = {
				searchKeys: ['firstName'],
				maxPatternLength: clientImportNames.firstName.length,
				identifier: 'resultIndex'
			};

			result_firstName = fuzzySearch(
				fuseConfig,
				rowsToSearch,
				clientImportNames.firstName
			);
		}

		// get last name search results if import settings say so
		if (matchLast) {
			let fuseConfig = {
				searchKeys: ['lastName'],
				maxPatternLength: clientImportNames.lastName.length,
				identifier: 'resultIndex',
				distance: 100
			};

			result_lastName = fuzzySearch(
				fuseConfig,
				rowsToSearch,
				clientImportNames.lastName
			);
		}

		// if we didn't search first AND last names, just say all results
		// 	are matches and move on
		if (matchFirst && matchLast) {
			// loop through search results of first name for now
			for (let i = 0; i < result_firstName.length; i++) {
				let f_resultIndex = result_firstName[i].item;

				// try to find same resultIndex in result_lastName
				for (let lNameResult of result_lastName) {
					let l_resultIndex = lNameResult.item;

					// if indices match, add matching row to matches array
					if (l_resultIndex === f_resultIndex) {
						matches.push(rowsToSearch[f_resultIndex]);
						break;
					}
				}
			}
		}
		
		// match first name only
		else if (matchFirst && matchLast === false) {
			for (let fNameResult of result_firstName) {
				matches.push(rowsToSearch[fNameResult.item]);
			}
		}
		
		// match last name only
		else if (matchFirst === false && matchLast) {
			for (let lNameResult of result_lastName) {
				matches.push(rowsToSearch[lNameResult.item]);
			}
		}
		
		// only here if matchFirst & matchLast are false (shouldn't be possible)
		else {
			// throw error & quit
			var errorMessage = `Import Settings bugged! matchFirst <${matchFirst}>` +
				` and matchLast <${matchLast}> are false or undefined somehow!`;

			// stop import and flag error message
			Utils_StopImport( errorMessage, function(response) {
				ThrowError({
					message: errorMessage,
					errMethods: ['mSwal', 'mConsole']
				});
			});
			return;
		}

		// Check length of matchedRows array, decide next step from there
		if (matches.length > 1) {
			let msg = `Duplicate matching clients found [action=${action}]:`;

			// loop through matches, pull out StARS numbers for error
			for (let rowMatch of matches) {
				msg += ` [StARS #${rowMatch.starsNo}]`;
			}

			// get next action to perform
			let nextAction = Utils_GetNextSearchActionState(action, searchSettings);

			// skip client & add msg to error stack
			if (nextAction === 'NEXT_CLIENT') {
				Utils_SkipClient(msg, clientIndex);
			}

			// add msg to error stack & perform next search type
			else {
				Utils_AddError(msg, function() {
					navigateToAdvancedSearch(nextAction);
				});
			}
		}
		
		// 1 exact match -> this is our client!
		else if (matches.length === 1) {
			// click the client row:
			matches[0].elem.click();

			// Client is already available, redirect to Client Basic Information
			// to check if extra client data needs to be saved
			var mObj = {
				action: 'store_data_to_chrome_storage_local',
				dataObj: {
					'ACTION_STATE': 'CHECK_CLIENT_BASIC_DATA'
				}
			};

			// once action state is stored, navigate to CBI (there decide what to do)
			chrome.runtime.sendMessage(mObj, function(response) {
				Utils_NavigateToTab( Utils_GetTabHref('ClientBasicInformation') );
			});
		}
		
		// no name matches, but unhcr # matched something. next decide if we
		// 	need to create client or move on
		else {
			// new logic: did name matching algorithm above - if no name match,
			// 	probably a relative, so client creation allowed
			decideNextStep(importSettings, clientIndex, action);

			// old logic: skip client here.
			// Utils_SkipClient('Found client with matching UNHCR, but not matching name. ' +
			// 	'Needs human intervention.', clientIndex);
		}
	}
	// NOTE: as of March 15, 2017 - I haven't seen any alerts on this page recently
	// NOTE: as of August 7, 2017 - Popups occur when > 100 results AND when 0 results
}

// ===================== INTERNAL FUNCTIONS ========================

/**
 * Function gathers and returns first and last names of client in an object. If
 * the client only has one column - full name, names are split into first and last,
 * then returned.
 * 
 * @param {object} clientNamesObj - object of client name strings (keys: firstName, lastName - all, fullName)
 * @returns {object} - object with client name strings (keys: firstName, lastName)
 * 					- returns empty object if some data found in first / last AND full names
 */
function getClientImportNames(clientNamesObj) {
	let names = {};

	let client1st = clientNamesObj.firstName,
		client2nd = clientNamesObj.lastName,
		clientFull = clientNamesObj.fullName;

	// first and last name columns exist
	if (client1st && client2nd) {
		names.firstName = client1st;
		names.lastName = client2nd;
	}
	
	// full name column exists
	else if (clientFull && (!client1st && !client2nd)) {
		names.firstName = clientFull.split(' ')[0];
		names.lastName = clientFull.substr(
			clientFull.indexOf(' ') + 1
		);
	}

	// some weird combination of first / last / full name columns exists
	// else {} -> do nothing.

	// object of client names (first / last)
	return names;
}

/**
 * Function gets import setting "createNew" and decides if we should:
 * - try searching with new data item or
 * - create client in registration page or
 * - skip registration & try next client
 * Note: createNew is boolean
 * 
 * @param {object} importSettings - see above
 * @param {number} ci - client Index (see above)
 * @param {string} action - see above
 */
function decideNextStep(importSettings, ci, action) {
	// if settings don't exist, stop import!
	if (!importSettings || !importSettings.otherSettings ||
		!importSettings.otherSettings.createNew === undefined) {

		var errorMessage = 'Import Settings <createNew> not found! ' +
			'Cancelling import.';

		// stop import and flag error message
		Utils_StopImport( errorMessage, function(response) {
			ThrowError({
				message: errorMessage,
				errMethods: ['mSwal', 'mConsole']
			});
		});
	}

	// otherwise, get settings and decide what to do
	else {
		let createNewClient = importSettings.otherSettings.createNew;
		let nextAction = Utils_GetNextSearchActionState(action,
			importSettings.searchSettings);

		// no more searches left, so use client creation logic
		if (nextAction === 'NEXT_CLIENT') {
			// nav to registration or skip client, depending on '.createNew'
			if (createNewClient) {
				navigateToRegistration();
			} else {
				let msg = 'No matches - Settings are set to skip client creation.';
				Utils_SkipClient(msg, ci);
			}
		}

		// do next search!
		else {
			// no need to send message to error stack right?
			navigateToAdvancedSearch(nextAction);
		}
	}
}

/**
 * Function checks & returns if row and client unhcr number are matches
 * Note: not case specific
 * 
 * @param {string} rowUnhcr - unhcr # from search result row
 * @param {string} clientUnhcr - unhcr # from client data
 * @returns {boolean} - true if match, false if not match
 */
function matchUnhcr(rowUnhcr, clientUnhcr) {
	return rowUnhcr.toUpperCase() === clientUnhcr.toUpperCase();
}

/**
 * Function extrapolates registration page navigation
 * 
 */
function navigateToRegistration() {
	var mObj = {
		action: 'store_data_to_chrome_storage_local',
		dataObj: {'ACTION_STATE': 'REGISTER_NEW_CLIENT'}
	};
	
	// once data returns, navigate to registration page
	chrome.runtime.sendMessage(mObj, function(response) {
		Utils_NavigateToTab( Utils_GetTabHref('Registration') );
	});
}

/**
 * Function extrapolates advanced search page navigation
 * Useful for instances where we want to move to next search method, without
 * incrementing client #
 * 
 * @param {string} nextAction - next action in action state
 */
function navigateToAdvancedSearch(nextAction) {
	let mObj = {
		action: 'store_data_to_chrome_storage_local',
		dataObj: {'ACTION_STATE': nextAction}
	};

	// once data returns, navigate to advanced search page
	chrome.runtime.sendMessage(mObj, function(response) {
		Utils_NavigateToTab( Utils_GetTabHref('AdvancedSearch') );
	});
}


/**
 * Function sets basic fuse settings for project. Settings for fuse can be found here:
 * http://fusejs.io/
 * Note: fuse = fuzzy text searching
 * Note2: maxPatternLength & keys are necessary for successful searches
 * 
 * threshold: (0 = perfect match, 1.0 = no match at all)
 * id: if present, only returned data has this key (not original search values)
 * location: where in the string the search is looking for a match
 * distance: if 0, match should occur right at the 'location' for a match
 * 
 * @param {object} config - a few config items for settings
 * @returns {object} - basic fuse settings. Caller needs to configure 'keys' to search
 */
function getBasicFuseSettings(config) {
	let searchKeys = config.searchKeys || [];
	let maxPatternLength = config.maxPatternLength || 32;
	let identifier = config.identifier; // can be undefined
	let distance = config.distance || 0;

	let settings = {
		keys: searchKeys,
		shouldSort: true,
		id: identifier,
		includeScore: true,
		threshold: 0.3,
		location: 0,
		distance: distance,
		maxPatternLength: maxPatternLength + 3
	};

	return settings;
}

/**
 * Function performs Fuse (fuzzy) search and returns results
 * 
 * Note: Fuse results should look like this:
 * 	[
 * 		{
 * 			"item": 0, (id / identifier of search objects)
 * 			"score": 0.25 (how well this item matched)
 * 		},
 * 		{...}
 * 	]
 * 
 * @param {object} config - config for getting basic fuse settings
 * @param {object} itemsToSearch - array of items to search through
 * @param {string} searchText - string to search for in itemsToSearch
 * @returns {object} - search results array of objects
 */
function fuzzySearch(config, itemsToSearch, searchText) {
	// get Fuse search options
	let options = getBasicFuseSettings(config);
	
	// set up Fuse object
	let fuse = new Fuse(itemsToSearch, options);

	// perform search, return results
	return fuse.search(searchText);
}