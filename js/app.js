(function() {
	'use strict';

	// Firebase setup:
	// var config = {
	//     apiKey: "AIzaSyDRulUofq1zYX7Z1J2t--A2CRzObthoIDc",
	//     authDomain: "fedenaimportconfig.firebaseapp.com",
	//     databaseURL: "https://fedenaimportconfig.firebaseio.com",
	//     // storageBucket: "fedenaimportconfig.appspot.com",
	//     messagingSenderId: "197993359621"
	// };
	// firebase.initializeApp(config);

    // Angular setup:
	angular.module('RIPSImportPageApp', [])
	.controller('MainController', MainController);

	// controller for options page
	MainController.$inject = ['$q', '$scope'];
	function MainController($q, $scope) {
		var Ctrl = this;

		// Initial page data
		Ctrl.textareaWelcome = 'Client details here (delimited by commas \",\" or tabs)'
			+ ' - Headers must match fields below\n'
			+ 'Required Fields:\n'
				+ '\tFirst / Last / Full name, Date of Birth, Gender, Nationality,\n'
				+ '\Preferred Language, Phone Number, UNHCR No\n'
			+ 'Optional Fields:\n'
				+ '\tDate of UNHCR Reg, Country of Origin, Ethnic origin,\n'
				+ '\tSecond Language, Marital Status, Address 1, Caritas No,\n'
				+ '\tService Code (+ more), Action Code (+ more)';
		// Ctrl.clientCount = 0;
		// Ctrl.auto = true;
		Ctrl.importEnabled = false;

		// initialize arrays
		Ctrl.headerArr = [];
		Ctrl.dataArray = [];
		Ctrl.widthArray = [];
		Ctrl.importErrors = [];

		// initialize settings bar checkboxes
		Ctrl.byUnhcr = true; 		Ctrl.byPhone = false;
		Ctrl.byOtherPhone = false;	Ctrl.byStarsNumber = false;
		Ctrl.matchFirst = true;		Ctrl.matchLast = true;
		Ctrl.createNew = false; // safer if we default this to false

		// Set up Firebase:
		// FB_initFirebase(Ctrl, $scope, firebase);
		// getClientCount();

		// other initial variables:
		// Ctrl.admissionDateFormatError = false;
		// Ctrl.admissionDateFormatWarning = false;
		// Ctrl.admissionDateFormatErrorLocation = "unknown";

		// TODO: see if this works inside controller, so can be output in HTML
		// Listener tracks any changes to local storage in background's console 
		// Got code here: https://developer.chrome.com/extensions/storage
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

				if (key === 'ADD_MESSAGE') {
					// adding empty check for case when add_message is cleared (set to '')
					if (storageChange.newValue == '') return;

					// Add error to array, which adds error to html page.
					// Since angular variable is changed outside of normal context,
					// need to use $digest or $apply as below.
					$scope.$apply(function() {
						Ctrl.importErrors.push( storageChange.newValue );
					});
				}
			}
		});

		// =================================== IMPORT!!!! =============================
		/**
		 * Function called after "Import Clients" button is clicked in popup
		 * 
		 * Client data from textarea is stored into chrome local storage, then
		 * MainContent.js is told to figure out what to do next
		 * 
		 */
		Ctrl.importClients = function() {
			// Make sure data arrays are populated before moving on
			if (Ctrl.headerArr.length === 0 || Ctrl.dataArray.length === 0) {
				let errMessage = `Error: headerArr <${Ctrl.headerArr.length}> or ` +
					`dataArray <${Ctrl.headerArr.length}> is empty :(`;

				console.error(errMessage);
				return;
			}

			// TODO: add some validation for required fields (maybe in "Create Table" function)
			console.log('data to import:',Ctrl.dataArray);

			// display empty import error array
			Ctrl.importErrors = [];

			// first, clear error array (and more later, if needed)
			let mObjFirst = {
				action: 'store_data_to_chrome_storage_local',
				dataObj: {
					'ADD_MESSAGE': ''
				}
			};
			chrome.runtime.sendMessage(mObjFirst, function(response) {
				// then, query tabs for rips urls
				chrome.tabs.query({
					currentWindow: true,
					url: 'http://rips.247lib.com/Stars/*'
				}, function(tabs) {

					// error if too many or too few tabs found w/ RIPS open
					if (tabs.length === 0) {
						let errMessage = 'No RIPS tabs are open right now!' +
							' Must open 1 for data import to work.';

						console.error(errMessage);

						$scope.$apply(function() {
							Ctrl.importErrors.push(errMessage);
						});
						
						return;
					} else if (tabs.length > 1) {
						let errMessage = `Too many RIPS tabs open! Found: ${tabs.length}.`;

						console.error(errMessage);
						
						$scope.$apply(function() {
							Ctrl.importErrors.push(errMessage);	
						});

						return;
					}

					// got here if only 1 RIPS tab open (yay)
					var targetTab = tabs[0];
					$scope.$apply(function() {
						Ctrl.importEnabled = false; // hide button
					});

					var mObj = {
						action: 'store_data_to_chrome_storage_local',
						dataObj: {
							'ACTION_STATE': 'SEARCH_FOR_CLIENT',
							'CLIENT_DATA': Ctrl.dataArray,
							'CLIENT_INDEX': 0,
							'IMPORT_SETTINGS': getImportSettings(Ctrl)
						}
					};
					
					// send message config (store data) then tell MainContent to GO!
					chrome.runtime.sendMessage(mObj, function(response) {
						chrome.tabs.sendMessage(targetTab.id, {
							"message": "begin_client_import"
						});
					});
				});
			});
		}
		// ============================================================================

		// ================================ CLEAR DATA ================================
		/**
		 * Function clears some data from chrome local storage, and alerts user after
		 * 
		 */
		Ctrl.clearChromeData = function() {
			var mObj = {
				action: 'clear_data_from_chrome_storage_local',
				noCallback: true,
				dataObj: {
					'CLIENT_DATA': '',
					'CLIENT_INDEX': 0,
					'ACTION_STATE': '',
					'DUPLICATE_CLIENT_UNHCR_NO': '',
					'ADD_MESSAGE': '',
					'IMPORT_SETTINGS': ''
				}
			};

			chrome.runtime.sendMessage(mObj, function(response) {
				// alert('Chrome data has been cleared');
				console.warn('Chrome data has been cleared');
			});

			Ctrl.clientData = '';
			Ctrl.importErrors = [];
			Ctrl.errorMessages = [];
			Ctrl.delim = '';
			Ctrl.importEnabled = false;
			
			// data from converted client data (data-table)
			Ctrl.headerArr = [];
			Ctrl.dataArray = [];
		}
		// ============================================================================

		// ================================= FIREBASE =================================

		// get number of client records changed via firebase databasea:
		// function getClientCount() {

		// 	FB_getClientCount(firebase)
		// 	.then(function(snapshot) {
		// 		var created = snapshot.val();

		// 		Ctrl.clientCount = created;

		// 		// $scope doesn't catch Ctrl change, so call $digest or $apply
		// 		$scope.$digest();
		// 	});
		// }

		/* Start the auth flow and authorizes for Firebase.
		 * @param{boolean} interactive True if the OAuth flow should request with an interactive mode.
		 */
		// function userAuth(interactive) {
		//   	// Request an OAuth token from the Chrome Identity API.
		//   	chrome.identity.getAuthToken({interactive: !!interactive}, function(token) {

		//     	if (chrome.runtime.lastError && !interactive) {
		//     	  	console.log('It was not possible to get a token programmatically.');
		// 	    } else if(chrome.runtime.lastError) {
		// 	      	console.error(chrome.runtime.lastError);
		// 	    } else if (token) {
		//       		// Authrorize Firebase with the OAuth Access Token.
		//       		var credential = firebase.auth.GoogleAuthProvider.credential(null, token);
		    	  	
		//     	  	firebase.auth().signInWithCredential(credential).catch(function(error) {
		// 	        	// The OAuth token might have been invalidated. Lets' remove it from cache.
		// 	        	if (error.code === 'auth/invalid-credential') {
		// 	          		chrome.identity.removeCachedAuthToken({token: token}, function() {
		//             			startAuth(interactive);
		//           			});
		//         		} else {
		//         			// valid credential! user is authenticated.
		//         			//  make sure user data scruture is ready
		//         			// console.log('inside Fb signInWithCredential [app.js], calling buildUserDataStruct');
		//         			FB_buildUserDataStruct(firebase, firebase.auth().currentUser);
		//         		}
		//       		});
		//     	} else {
		//       		console.error('The OAuth Token was null');
		//     	}
		//   	});
		// }

		// count number of button clicks, store in Firebase database:
		// function countButtonClick(buttonCode) {
		// 	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		// 		// var activeTab = tabs[0];

		// 		var mObj = {
		// 			action: 'firebase_increment_button_count',
		// 			activeTabId: tabs[0].id,
		// 			buttonCode: buttonCode
		// 		}

		// 		chrome.runtime.sendMessage(mObj);
		// 	});
		// }

		// ============================================================================

		// ============================= EVERYTHING ELSE ==============================
		// Function toggles createNew variable for checkboxes
		Ctrl.toggleCreateNew = function() {
			Ctrl.createNew = !Ctrl.createNew;
		}
		
		// Function fills table with pasted client data
		Ctrl.fillTable = function() {
			// countButtonClick('create_table');

			var data = Ctrl.clientData;
			var delim, dataObj;

			// get best delimiter from client data
			delim = getDelim(data);

			// if no delim found, quit.
			if ( delim === '' ) return;

			// look for some basic errors in client data structure
			if ( foundErrors(data) ) return;

			// convert data from string to array of objects (json-like)
			dataObj = convertData(data, delim);

			if (dataObj.errorCount) return;
			else displayError([]); // remove error message

			// give angular the data from dataObj
			Ctrl.headerArr = dataObj.headerArr;
			Ctrl.dataArray = dataObj.dataArray

			// initialize width array for column css
			initColWidthArray(dataObj.headerArr.length);

			// show import button
			Ctrl.importEnabled = true;
		};

		// these functions deal with widths of columns in the table
		Ctrl.increaseWidth = function(index) { Ctrl.widthArray[index] += 20; }
		Ctrl.decreaseWidth = function(index) { Ctrl.widthArray[index] -= 20; }
		Ctrl.getWidth = function(index) { return Ctrl.widthArray[index]; }

		// ====================== INTERNAL FUNCTIONS =======================
		
		/**
		 * Function returns an object from import settings checkboxes
		 * 
		 * @param {object} Ctrl - angular app object
		 * @returns {object} - settings object
		 */
		function getImportSettings(Ctrl) {
			return {
				matchSettings: {
					matchFirst: Ctrl.matchFirst,
					matchLast: Ctrl.matchLast
				},

				searchSettings: {
					byUnhcr: Ctrl.byUnhcr,
					byPhone: Ctrl.byPhone,
					byOtherPhone: Ctrl.byOtherPhone,
					byStarsNumber: Ctrl.byStarsNumber
				},

				otherSettings: {
					createNew: Ctrl.createNew
				}
			};
		}

		/**
		 * Initialize array of widths for parsed client data table
		 * 
		 * @param {number} size - size of array to fill with widths
		 */
		function initColWidthArray(size) {
			for (var i = 0; i < size; i++) {
				Ctrl.widthArray.push(100);
			}
		}

		/**
		 * Function converts data from string format to array of client objects.
		 * If there are errors, display them at the end
		 * 
		 * @param {string} data - client data in string format
		 * @param {any} delim - delimiter to use to parse client data
		 * @returns - obj with error count and data arrays
		 */
		function convertData(data, delim) {
			// first element in dataArray is # of errors
			// var dataArray = [0];

			// ===== CREATE VARS HERE TO BE USED LATER =====

			// returnObj holds all data we will need in next stages of import
			var returnObj = {
				errorCount: 0,
				headerArr: [],
				dataArray: []
			}

			var errArr = [];

			/**
				headerKeys will contain headers related to rows like this:
				{
					0: FirstName
					1: LastName
					2: DOB
					3: Nationality
					... etc
				}
				built off 0,1,2 to be used with row indices later
			 */
			var headerKeys = {};

			// ===== START DATA PROCESSING =====

			var rows = data.split("\n");

			// remove final row if it's only a '\n'  character (rows[index] will just be "")
			if (rows[rows.length - 1] === "") rows.pop();

			// setup headerKeys:
			var headerRow = rows[0].split(delim);
			returnObj.headerArr = headerRow;

			/**
			 * === NOTE: ===
			 * Cannot look for matching header fields here BECAUSE Vulnerabilities
			 * Are dynamically added to translator when on client basic information
			 * page. THEREFORE, don't check here, just check when importing clients
			 */ 

			// create keys for header Obj -> ALL UPPERCASE :)
			for (var i = 0; i < headerRow.length; i++) {
				headerKeys[i] = headerRow[i].trim().toUpperCase();
			}

			// setup the rest of the data (non-header)
			// start at rowIndex = 1 because index 0 is header row
			for (var rowIndex = 1; rowIndex < rows.length; rowIndex++) {
				var row = rows[rowIndex].split(delim);

				// check row length matches header row length
				if (row.length !== headerRow.length) {
					// Error in # of delims between this row and header row.
					errArr.push("ROW #" + (rowIndex + 1) + " HAS DIFFERENT # " +
						"OF COLUMNS THAN HEADER");
					returnObj.errorCount += 1;

					// error row, so skip processing this row
					continue;
				}

				var clientObj = {};

				// loop through cells in row (client cells), build client obj,
				// add client obj to returnObj
				for (var cellIndex = 0; cellIndex < row.length; cellIndex++) {
					var cell = row[cellIndex];
					var propName = headerKeys[cellIndex];

					clientObj[propName] = cell.trim();
				}

				returnObj.dataArray.push(clientObj);
			}

			// display errors
			if (errArr.length > 0)
				displayError(errArr);

			return returnObj;
		}

		/**
		 * Function searches given data for basic errors. Current errors checked:
		 * 1) Only 1 line of data (throws error)
		 * 
		 * @param {string} data - client data in string format (delimited)
		 * @returns - true / false if error found
		 */
		function foundErrors(data) {
			// look for "\n" in data. if there aren't any, create an error
			if (data.indexOf("\n") === -1) {
				displayError(["ONLY 1 LINE OF DATA - NEED TITLE ROW + DATA ROW!"]);
				return true;
			}

			return false;
		}

		/**
		 * Function finds and returns delim found from pasted client data.
		 * Priority:
		 * 1) Tab (\t)
		 * 2) Comma (,)
		 * 
		 * @param {string} data - data string to find delim in
		 * @returns - delimiter (string) used in data string
		 */
		function getDelim(data) {
			if (data === undefined || data === '') return '';

			var tab1 = data.indexOf("\t");
			var com1 = data.indexOf(",");

			// if no tabs or commas exist, throw error
			if (tab1 === -1 && com1 === -1) {
				displayError(["CLIENT DATA MUST HAVE TABS OR COMMAS BETWEEN COLUMNS OF DATA"]);
				return '';
			}

			if (tab1 !== -1) {
				Ctrl.delim = "tab";
				return "\t";
			} else if (com1 !== -1) {
				Ctrl.delim = "comma";
				return ",";
			}

			return '';
		}

		/**
		 * Function sets angular variable to passed-in array of warning strings
		 * to be displayed on the page. These are displayed pre-import!
		 * 
		 * Note: these are not import errors! Ctrl.importErrors is for errors
		 * that occur DURING import
		 * 
		 * TODO: make this more clear by differentiating variable names
		 * 
		 * @param {object} messages - array of strings (warning messages) 
		 */
		function displayError(messages) {
			if (messages === '')
				messages = []

			Ctrl.errorMessages = messages;
		}
	};

})();