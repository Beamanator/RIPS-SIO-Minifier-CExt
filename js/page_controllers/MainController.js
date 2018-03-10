// console.log('loading maincontent.js');

/*
=================================== CONSTANTS AREA =======================================
*/
/**
 * Function returns a config object for handling specific functions to be called, based
 * off a page URL and an action.
 * 
 * @returns config object in this format:
 * {
 * 		'URL_Piece1': 'URL_ControllerFn1',
 * 		'URL_Piece2': 'URL_ControllerFn2'
 * }
 */
function getPageControllerFunctions() {
	return {
		// Advanced Search ctrl
		'SearchClientDetails/AdvancedSearch': 'Run_CtrlAdvancedSearch',
		'SearchClientDetails/ClientListSearchResult': 'Run_CtrlAdvancedSearch',

		// Registration / CBI ctrls
		'Registration/Registration': 'Run_CtrlRegistration',
		'ClientDetails/ClientDetails': 'Run_CtrlClientBasicInformation',

		// Service ctrl
		'ClientDetails/ClientServicesList': 'Run_CtrlServices',
		'MatterAction/CreateNewServices': 'Run_CtrlServices',

		// New / View Action ctrls
		'MatterAction/CreateNewAction': 'Run_CtrlAddAction',
		'MatterAction/MatterActionsList': 'Run_CtrlViewActions'
	}
}

//================================ DOCUMENT FUNCTIONS ======================================
$(document).ready(function(){
	var pageURL = Utils_GetPageURL();

	getImportConfig()
	.then(function(importConfig) {
		// responses should come back in the same order, so:
		var action = importConfig.action;

		console.log('ACTION:', action);

		// if action indicates we're not ready to automatically continue, quit
		if (action === "WAITING" || action === "" || action === undefined) {
			console.log('Action state <' + action + '> indicates time to wait :)');
			return;
		}

		// get url piece string from current page's url
		var urlPiece = Utils_GetUrlPiece( pageURL );

		// get controller function name from config object
		var ctrlFuncName = getPageControllerFunctions()[urlPiece];

		// get controller function from window (actual functions in other files)
		var ctrlFunc = window[ctrlFuncName];

		// call controller function, if exists
		if (ctrlFunc)
			ctrlFunc( importConfig );
		else {
			console.error('Controller function for <' + urlPiece + '> is not defined');
		}
	})
	.catch(err => {
		console.error(err);
	});
});

/*
================================== CHROME LISTENERS ======================================
*/

// Listener tracks any changes to local storage in chrome console 
// From here: https://developer.chrome.com/extensions/storage
chrome.storage.onChanged.addListener(function(changes, namespace) {
	// console.log('storage changes', changes);
	for (key in changes) {
		var storageChange = changes[key];

		console.log('Storage key "%s" in namespace "%s" changed. ' +
			'Old value was "%s", new value is "%s".',
			key,
			namespace,
			storageChange.oldValue,
			storageChange.newValue
		);
	}
});

// console.log('setting up main-controller message listener');
// Listener for messages from background.js
chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
	console.log('heard message in MainContent.js!');
	// Kick things off via request.message in MainContent.js!
	switch( request.message ) {
		// case "clear_client_data":
		// 	clearClientData(); // Clears student data
		// 	break;

		// case will be hit ONLY when "Import Clients" button is clicked from popup
		case "begin_client_import":
			// first action is 'SEARCH_FOR_CLIENT'
			BeginClientImport();
			break;

		default:
			ThrowError({
				message: 'Message not handled in MainContent.js: ' + request.message,
				errMethods: ['mConsole']
			});
	}
});

// ======================= PAGE-SPECIFIC CONTROLLER CALLS ===========================
// run controller code in CtrlAdvancedSearch.js
function Run_CtrlAdvancedSearch( config ) {
	if (AdvancedSearch_Controller)
		AdvancedSearch_Controller( config );
}

// run controller code in CtrlRegistration.js
function Run_CtrlRegistration( config ) {
	if (Registration_Controller)
		Registration_Controller( config );
}

// run controller code in CtrlClientBasicInformation.js
function Run_CtrlClientBasicInformation( config ) {
	if (ClientBasicInformation_Controller)
		ClientBasicInformation_Controller( config );
}

// run controller code in CtrlServices.js
function Run_CtrlServices( config ) {
	if (Services_Controller)
		Services_Controller( config );
}

// run controller code in CtrlAddAction.js
function Run_CtrlAddAction( config ) {
	if (AddAction_Controller)
		AddAction_Controller( config );
}

// run controller code in CtrlViewActions.js
function Run_CtrlViewActions( config ) {
	if (ViewActions_Controller)
		ViewActions_Controller( config );
}

// ======================================= OTHER FUNCTIONS ========================================

/**
 * Function is called when "Import Clients" is hit, so figure out where to go now
 * based on url. If we're not on Advanced Search page, get there. Otherwise, let 
 * Run_CtrlAdvancedSearch figure out what to do
 * 
 */
function BeginClientImport() {
	// find out if we're on the right starting page
	if ( Utils_UrlContains( Utils_GetTabHref('AdvancedSearch'), false) ) {
		// get import config, then pass to controller
		getImportConfig()
		.then(function( config ) {
			Run_CtrlAdvancedSearch( config );
		});
	}
	
	// else, we're not on AdvancedSearch, so navigate there
	else {
		Utils_NavigateToTab( Utils_GetTabHref('AdvancedSearch') );
	}
}

// ======================================= PUBLIC FUNCTIONS ========================================

/**
 * Function will decide the next step to take AFTER client has been created (or found)
 * - if SERVICE_CODE is found in client data, go to services page.
 * - else, go back to advanced search page and to next client.
 * 
 * Called by: ClientBasicInformation.js
 * 
 * TODO: because this function moves the user to another page AFTER visiting CBI,
 * need to handle the dependent / vuln empty swal popup.
 * -> If error shows up, warn user in settings page.
 * 
 * @param {number} clientIndex - index of client in all client data
 * @param {object} clientData - all client data
 */
function MainContent_DoNextStep(clientIndex, clientData) {
	var client = clientData[clientIndex];

	// get field translator
	var FTs = Utils_GetFieldTranslator( 'Service' );
	if (!FTs) return; // basically quit doing anything else!

	// 2) get service code column from spreadsheet data
	// (service code is only required field for any service or action entering)
	var serviceCode = client['SERVICE CODE'];

	// 3.A) if there is no service code, go back to advanced search page to process
	// next client.
	if (!serviceCode) {
		// store next action state before redirecting to Advanced Search
		var mObj2 = {
			action: 'store_data_to_chrome_storage_local',
			dataObj: {
				'ACTION_STATE': 'SEARCH_FOR_CLIENT',
				'CLIENT_INDEX': '' // auto increment
			}
		};
	
		// saves action state, then redirects to advanced search
		chrome.runtime.sendMessage(mObj2, function(response) {
			Utils_NavigateToTab( Utils_GetTabHref( 'AdvancedSearch' ));

			// Check for dep / vuln popup
			dismissSwal();
		});
	}

	// 3.B) if there is a service code, set action state and redirect to
	// services page to figure out what data to add
	else {
		var mObj2 = {
			action: 'store_data_to_chrome_storage_local',
			dataObj: {
				'ACTION_STATE': 'CHECK_CLIENT_SERVICES'
			}
		};
	
		// after saving action state, redirect to services page
		chrome.runtime.sendMessage(mObj2, function(response) {
			Utils_NavigateToTab( Utils_GetTabHref( 'Services' ));

			// Check for dep / vuln popup
			dismissSwal();
		});
	}
}

/**
 * Function waits to check if alert visible, then clicks 'confirm' button
 * 
 */
function dismissSwal() {
	// wait for 500ms, then dismiss alert if it exists
	Utils_WaitTime(1200)
	.then(function() {
		let $alert = $('.sweet-alert');

		// check if alert is visible
		if ( $alert.hasClass('visible') ) {
			// click 'ok'
			$alert.find('button.confirm').click();
		}
		
		// else, alert isn't visible so do nothing - page should redirect anyway
	});
}

/**
 * Function gets configuration data needed for import, including:
 * Action state ('ACTION_STATE')
 * Client index ('CLIENT_INDEX')
 * Client data ('CLIENT_DATA')
 * Import settings ('IMPORT_SETTINGS')
 * -> more details on each can be found in background.js
 * 
 * @returns Promise to import config data
 */
function getImportConfig() {
	return new Promise( (resolve, reject) => {
		// setup config obj for background.js
		var mObj = {
			action: 'get_data_from_chrome_storage_local',
			keysObj: {
				'ACTION_STATE': '',
				'CLIENT_INDEX': '',
				'CLIENT_DATA': '',
				'IMPORT_SETTINGS': ''
			}
		};

		chrome.runtime.sendMessage(mObj, function(data) {
			let dataSize = Object.keys(data).length;
			if (dataSize === 0)
				reject('No import config found - quitting');
			else if (dataSize < 4)
				reject('Something went wrong getting import config');
			else {
				let config = {
					action: 		data.ACTION_STATE,
					clientIndex: 	data.CLIENT_INDEX,
					clientData: 	data.CLIENT_DATA,
					importSettings: data.IMPORT_SETTINGS
				};

				resolve(config);
			}
		});
	});
}