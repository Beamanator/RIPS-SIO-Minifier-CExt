// ============================== PAGE CONTROLLER =======================
/**
 * Controller function for Add Actions page - decides what t odo based off of
 * passed in config object
 * 
 * Called by: Run_CtrlAddAction [in MainContent.js]
 * 
 * @param {object} config 
 */
function AddAction_Controller( config ) {
	var action = config.action;
	var clientIndex = config.clientIndex;
	var clientData = config.clientData;

	switch(action) {
		// Add action data :)
		case 'CLIENT_ADD_ACTION_DATA':
			startAddActionData(clientIndex, clientData);
			break;

		// Action not handled by controller!
		default:
			console.error('Unhandled action found in CtrlAddAction.js:', action);
	}
}

// ============================== MAIN FUNCTIONS =======================

/**
 * Function populates the "service" dropdown based off serviceCode, then calls
 * function that adds action data
 * 
 * @param {number} ci - index of specific client being imported
 * @param {object} clientData - all client data
 */
function startAddActionData( ci, clientData ) {
	var client = clientData[ci];

	// first get Field translator for service data
	var FTa = Utils_GetFieldTranslator( 'Action' );
	if (!FTa) return; // let Utils handle everything - and quit!

	// next have to set service dropdown, so get service code.
	var serviceCode = client['SERVICE CODE'];

	// translate service code into service description:
	var serviceDesc = Utils_GetServiceDescFromCode( serviceCode );

	// set service dropdown to service (using service code)
	var matchFound = Utils_CheckErrors([
		[ Utils_InsertValue( serviceDesc, FTa['SERVICE CODE'], 1 ), 'SERVICE CODE' ]
	], ci);

	// if no matches, error and skip client. Skip b/c client data and service
	// 	were already added - no more steps to take
	if ( !matchFound ) {
		var errorMessage = 'No match found in Services dropdown - service'
			+ ' code may not be accurate. Skipping client.';
		
		// skip to importing next client
		Utils_SkipClient(errorMessage, ci);
		return;
	}

	// load action list from service dropdown - call RIPS code
	else {
		location.href="javascript:updateDdlActiontype();";
	}

	// wait until Actions select box is populated before continuing
	Utils_WaitForCondition(
		Utils_IsSelectElemPopulated, ['select#ddlActions'], 1000, 6
	)
	.then(function(successMessage) {
		// action dropdown has been populated by RIPS function! now move on
		setActionDropdown( client, ci ); 
	})
	.catch(function(errorMessage) {
		// action not found after setting service dropdown -> internet must
		// not be doing well, so skip client.
		// Note: if service is new, it's possible RIPS admin needs to
		// add necessary actions to the service
		Utils_SkipClient(errorMessage, ci);
	});
}

/**
 * Function puts action data into form, then clicks 'save' if no errors.
 * saving redirect page to "View Actions"
 * 
 * @param {object} client - client object
 * @param {number} ci - index of specific client being imported
 * @returns - only returns early if an error is found
 */
function setActionDropdown( client, ci ) {
	// first get Field translator for action data
	var FTa = Utils_GetFieldTranslator( 'Action' );
	if (!FTa) return; // let Utils handle everything - and quit!

	// get action data from client data object
	var actionName = client['ACTION NAME'];

	// var actionDate = client['ACTION DATE']; // TODO: deal with date stuff
	var actionCaseworker = client['ACTION CASEWORKER'];
	var actionNotes = client['ACTION NOTES'];

	// find and insert action into dropdown
	var foundMatch = Utils_CheckErrors([
		[ Utils_InsertValue( actionName, FTa['ACTION NAME'], 1 ), 'ACTION NAME' ]
	], ci);

	// if action is not found, skip client
	if ( !foundMatch ) {
		var errorMessage = 'No match found in Action dropdown '
			`- action name <${actionName}> may not be accurate.`;

		// Skip importing this client
		Utils_SkipClient(errorMessage, ci);
		return;
	}

	// TODO: add date data - id: DATE_OF_ACT

	// add Attendance Notes information:
	if ( actionNotes ) {
		$('iframe')
			.contents()
			.find('body')
			.append(`<p>${actionNotes}</p>`);
	}

	// --- add caseworker in, if defined in client data ---
	if ( actionCaseworker ) {		
		// try to find & select caseworker
		let caseworkerFound = Utils_CheckErrors([ 
			[ Utils_InsertValue( actionCaseworker, FTa['ACTION CASEWORKER'], 1),
				'ACTION CASEWORKER']
		], ci);

		// if no caseworker was found, skip client
		if (!caseworkerFound) {
			var errorMessage = 'Could not find caseworker from ' +
				`given value "${actionCaseworker}".`;

			Utils_SkipClient(errorMessage, ci);
			return;
		}
	}

	// if we're still here, all import should have gone smoothly. Save action.
	clickSave();
}

/**
 * Function slightly extrapolates the workflow for clicking save (2 ways this
 * can be called)
 * 
 * Function tells import we're ready to search for the next client, then clicks
 * save automatically! - clicking save redirects to "View Actions" page
 * 
 */
function clickSave() {
	// store action state, then click 'save'
	var mObj = {
		action: 'store_data_to_chrome_storage_local',
		dataObj: {
			'ACTION_STATE': 'NEXT_CLIENT_REDIRECT'
		}
	};
	
	// saves action state, then click save
	chrome.runtime.sendMessage(mObj, function(response) {
		// click 'save' button after a brief timeout -> redirects to "View Actions"
		$('input[value="Save"]').click();
	});
}