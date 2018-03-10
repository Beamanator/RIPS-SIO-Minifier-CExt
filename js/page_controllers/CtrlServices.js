// ============================== PAGE CONTROLLER =======================
/**
 * Controller function for Services pages - decides what to do based off of
 * passed in config object.
 * 
 * Process:
 * 1) Get current client's service code from input (it should exist)
 * 2) Gets matching service description
 * 3) Looks for service description on "services" list page
 * 4.A) - redirects to add new if doesn't exist
 * 4.B) - reopens (if needed) then redirects to Action controller if does exist
 * 
 * Called by: Run_CtrlServices [in MainContent.js]
 * 
 * @param {object} config 
 */
function Services_Controller( config ) {
	var action = config.action;
	var clientIndex = config.clientIndex;
	var clientData = config.clientData;

	switch(action) {
		// check client services - decide if new or reopen is needed
		case 'CHECK_CLIENT_SERVICES':
			startServiceSearch(clientIndex, clientData);
			break;

		// new service needed - add it!
		case 'CLIENT_ADD_SERVICE':
			addNewService(clientIndex, clientData);
			break;

		// redirect to add action page
		case 'CLIENT_ADD_ACTION_DATA':
			addActionRedirect();
			break;

		// service was added, but no action data needed - redirect to advanced search
		case 'CLIENT_SKIP_ACTION_DATA':
			importNextClientRedirect();
			break;

		// Action not handled by controller!
		default:
			console.error('Unhandled action found in CtrlServices.js:', action);
	}
}

// ============================== MAIN FUNCTIONS =======================

/**
 * Function begins the search for:
 * 1) if a service needs to be added to the client, and
 * 2) if the service already exists, and
 * 3) if the service already exists and needs to be reopened
 * 
 * @param {number} clientIndex - index of client in all client data
 * @param {object} clientData - all client data
 */
function startServiceSearch(clientIndex, clientData) {
	var client = clientData[clientIndex];

	// get service code from client object
	var serviceCode = client['SERVICE CODE'];

	// get service description from map - to match with table
	var serviceDesc = Utils_GetServiceDescFromCode( serviceCode );

	// get action name for later
	var actionName = client['ACTION NAME'];

	// if service description doesn't exist, id didn't match mapping
	if (!serviceDesc) {
		let errorMessage = `Service code <${serviceCode}> doesn\'t match any service.` +
			' see documentation here: https://github.com/Beamanator/RIPS-Auto-Impo' +
			'rt-CExt#fields-available-for-services-page-and-example-data';
	
		Utils_SkipClient(errorMessage, clientIndex);
	}
	
	// serviceDesc exists, so try to find it in the services list
	else {
		searchServiceInTable( serviceDesc, actionName );
	}
	
	// console.log('commented out real useful code below [in file]:');
}

/**
 * Function attempts to match a given service description with descriptions
 * shown in the "services" table on Service page.
 * 
 * If service is found, decide if it needs to be reopened
 * Else, redirect to page to add service
 * 
 * @param {string} serviceDesc - description of service to match to table descriptions
 * @param {string} actionName - indicator for where to go next (add action / advanced search)
 */
function searchServiceInTable( serviceDesc, actionName ) {
	var needsService = true;
	
	// Loop through each row and column of the services table:
	$('table.webGrid tbody tr').each(function(rowIndex) {
		var $serviceRow = $(this);

		// get array of cells in current service row
		var cellList = $serviceRow.find('td');

		// service description is only thing that uniquely describes service on page.
		var isLive = $serviceRow.find('input[type="checkbox"]').is(':checked');
		var rowServiceDescription = cellList[2].innerHTML;

		// check if serviceDesc matches this row
		if (rowServiceDescription.toUpperCase() === serviceDesc.toUpperCase()) {
			
			// no need to add new service if live already
			if (isLive)
				needsService = false;
			
			/*
				If service found but not live: do nothing
					-> needsService stays true, so adds service
					-> still exits loop (via return false)
					-> removing reOpenService($serviceRow); (see Footnote A)
			*/

			return false; // -> break loop
		}

		// return true; -> same as 'continue' in jquery loop
	});

	// serviceDesc wasn't found in table or service is closed (so let's open it!)
	if (needsService) {
		var mObj = {
			action: 'store_data_to_chrome_storage_local',
			dataObj: {
				'ACTION_STATE': 'CLIENT_ADD_SERVICE'
			}
		};
		
		// update action state then click 'new' button
		// -> this will redirect to page to add a new service
		chrome.runtime.sendMessage(mObj, function(response) {
			$('input#NewServices').click();
		});
	}
	
	// service is found and live already, so 1st check if action name exists
	// -> if it does, change action state then go to CreateNewAction
	// -> if not, change action state then go to advanced Search
	else {
		// if actionName exists, set action state and redirect to Add Action page
		if ( actionName ) {
			// goal = store action state, then redirect
			var mObj = {
				action: 'store_data_to_chrome_storage_local',
				dataObj: {
					'ACTION_STATE': 'CLIENT_ADD_ACTION_DATA'
				}
			};

			// saves action state, then redirects to add action page
			chrome.runtime.sendMessage(mObj, function(response) {
				addActionRedirect();
			});
		}

		// if actionName doesn't exist / is empty, skip and go to advanced search
		else
			importNextClientRedirect();
	}
}

/**
 * Function adds a new service and caseworker (if needed) to client, updates
 * ACTION_STATE, then clicks save
 * 
 * @param {number} clientIndex - index of client in all client data
 * @param {object} clientData - all client data
 */
function addNewService(clientIndex, clientData) {
	var client = clientData[clientIndex];

	// get service field translator
	var FTs = Utils_GetFieldTranslator( 'Service' );
	if (!FTs) return; // let Utils handle everything - and quit!

	// get service data from client object
	var serviceCode = client['SERVICE CODE'].toUpperCase();
	var serviceStart = client['SERVICE START DATE'];
	var serviceCaseworker = client['SERVICE CASEWORKER'];

	// get actionName for future reference
	var actionName = client['ACTION NAME'];

	// get 6-character code (fill with spaces on right)
	var fullServiceCode = fillServiceCode( serviceCode, ' ' );

	// set service dropdown to service (using service code)
	var serviceFound = Utils_CheckErrors([
		[ Utils_InsertValue( fullServiceCode, FTs['SERVICE CODE'], 2 ), 'SERVICE CODE']
	], clientIndex);

	// if match wasn't found, break import and error
	if ( !serviceFound ) {
		var errorMessage = 'No match found in Service Description dropdown - '
			+ `service code <${serviceCode}> may not be accurate`;
	
		// skip client
		Utils_SkipClient(errorMessage, clientIndex);
		return;
	}

	// ======== Service Start Date ========
	// Add service start date
	if ( serviceStart ) {
		let dateDateSuccess = Utils_CheckErrors([
			[ Utils_InsertValue( serviceStart, FTs['SERVICE START DATE'], 3 ),
				'SERVICE START DATE' ]
		], clientIndex);

		// check success
		if (!dateDateSuccess) {
			var errMsg = 'Could not properly save service start date. ' +
				`Please check date: <${serviceStart}> for formatting issues.`;

			// skip client
			Utils_SkipClient(errMsg, clientIndex);
			return;
		}
	}

	// ======== Caseworker ==========
	// --- add caseworker in, if defined in client data ---
	// Note: Caseworker automatically set as logged-in user! [hopefully]
	if ( serviceCaseworker ) {
		let caseworkerFound = Utils_CheckErrors([
			[ Utils_InsertValue( serviceCaseworker, FTs['SERVICE CASEWORKER'], 1 ),
				'SERVICE CASEWORKER']
		], clientIndex);

		// check success
		if (!caseworkerFound) {
			var errMsg = 'Could not find service caseworker from given value ' +
				`"${serviceCaseworker}" - skipping client`;

			// skip client
			Utils_SkipClient(errMsg, clientIndex);
			return;
		}
	}

	// next = just save!
	// TODO: make sure action is populated before clicking save
	// -> or move all of this into if statement section above
	let $selectBox = $(`select#${ FTs['SERVICE CODE'] }`);

	// set up change handler function, then trigger 'change'
	$selectBox.change(function(e_change) {
		clickSave( actionName );
	})
	.change();
}

/**
 * Function slightly extrapolates clicking the save button. (2 ways this function
 * can be called)
 * 
 * Also - save click delayed by 500 milliseconds just to give Action dropdown
 * some time to load [last test = results are same if we wait or not]
 * 
 * @param {object} actionName - name of action to be added to client
 */
function clickSave( actionName ) {
	var actionState;

	// if actionName doesn't exist / is empty, skip adding action data
	if (!actionName || actionName === '')
		actionState = 'CLIENT_SKIP_ACTION_DATA';

	// if actionName exists, set action state and click 'save'
	else
		actionState = 'CLIENT_ADD_ACTION_DATA';

	// store action state, then click 'save'
	var mObj = {
		action: 'store_data_to_chrome_storage_local',
		dataObj: {
			'ACTION_STATE': actionState
		}
	};
	
	// saves action state, then click save
	chrome.runtime.sendMessage(mObj, function(response) {
		// click 'save' button after a brief timeout
		setTimeout( function(){
			$('input[value="Save"]').click();
		}, 500);
	});
}

/**
 * Function saves action state (to inform advanced search page we're ready to
 * import the next client), then redirects user to advanced search page
 * 
 */
function importNextClientRedirect() {
	// set up obj to tell advanced search we're ready to import again
	var mObj = {
		action: 'store_data_to_chrome_storage_local',
		dataObj: {
			'ACTION_STATE': 'SEARCH_FOR_CLIENT',
			'CLIENT_INDEX': '' // auto increment
		}
	};

	// saves action state, then redirects to advanced search
	chrome.runtime.sendMessage(mObj, function(response) {
		Utils_NavigateToTab( Utils_GetTabHref('AdvancedSearch') );
	});
}

/**
 * Function redirects user to Add Action page only
 * 
 */
function addActionRedirect() {
	Utils_NavigateToTab( Utils_GetTabHref('AddAction') );
}

/**
 * Function adds character 'char' to string 'serviceCode' until the new produced
 * string is 6 characters long.
 * 
 * @param {string} serviceCode - original code that may need more characters
 * @param {string} char - characters to add at the end of serviceCode
 * @returns - new code that is 6 characters long
 */
function fillServiceCode( serviceCode, char ) {
	var newCode = serviceCode;

	// loop, adding char to newCode on each iteration
	for (var i = newCode.length; i < 6; i++) {
		newCode += char;
	}

	return newCode;
}

/**
 * Footnote Comments:
 * 
 * A) function reOpenService() removed b/c:
 *    -> it looks super ugly, and if internet is bad, maay still break.
 *    -> if a service is 'closed', you can still add a new one of the same type
 *    -> can't have 2 live servies of the same type, can have two closed of same type
 */