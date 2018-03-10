// ============================== PAGE CONTROLLER =======================
/**
 * Controller function for View Actions pages - decides what to do based off of
 * passed in action.
 * 
 * Called By: None [automatically taken here after adding an action]
 * 
 * @param {object} config 
 */
function ViewActions_Controller( config ) {
	var action = config.action;
	
	switch(action) {
		// redirect to advanced search to start importing next client
		case 'NEXT_CLIENT_REDIRECT':
			nextClientRedirect();
			break;

		// Action not handled by controller!
		default:
			console.error('Unhandled action found in CtrlViewAction.js:', action);
	}
}

/**
 * Function gets ready for next client, a.k.a. redirects user to Advanced Search
 * page - after getting action state and client index ready
 * 
 */
function nextClientRedirect() {
	// store action state (searching for next client), then redirect
	var mObj = {
		action: 'store_data_to_chrome_storage_local',
		dataObj: {
			'ACTION_STATE': 'SEARCH_FOR_CLIENT',
			'CLIENT_INDEX': '' // auto increment client index
		}
	};
	
	// saves action state, then redirects to Advanced Search page
	chrome.runtime.sendMessage(mObj, function(response) {
		Utils_NavigateToTab( Utils_GetTabHref( 'AdvancedSearch' ) );
	});
}