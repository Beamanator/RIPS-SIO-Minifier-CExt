//=============================== DOCUMENT FUNCTIONS ======================================
/*
	Main purpose of this file is to redirect the user to the AdvancedSearch page.

	This should only be hit if the user / SIO is on an unnecessary page, example:
		Addresses
		Notes
		etc... 	
*/

$(document).ready(() => {
	Utils_NavigateToTab( Utils_GetTabHref('AdvancedSearch') );
});

// ============================= PUBLIC FUNCTIONS ===============================