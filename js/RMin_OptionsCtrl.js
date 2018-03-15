(function() {
	'use strict';

    // Angular setup:
	angular.module('RIPSMinifierApp', [])
	.controller('MainController', MainController);

	// controller for options page
	MainController.$inject = ['$q', '$scope'];
	function MainController($q, $scope) {
		var Ctrl = this;

		// Initial page data
		Ctrl.textareaWelcome = 'Welcome!'
		
		// Listener tracks any changes to local storage in background's console 
		// See code here: https://developer.chrome.com/extensions/storage
		chrome.storage.onChanged.addListener(function(changes, namespace) {
			for (let key in changes) {
				var storageChange = changes[key];

				console.log('Storage key "%s" in namespace "%s" changed. ' +
					'Old value was "%s", new value is: ',
					key,
					namespace,
					storageChange.oldValue,
					storageChange.newValue
				);

				// Do things with special keys, if needed!
				// ...
			}
		});

		// ============================================================================

		// ================================ CLEAR DATA ================================
		// ============================================================================

		// ================================= FIREBASE =================================
		// ============================================================================

		// ============================= EVERYTHING ELSE ==============================
	};

})();