// Last updated March 20, 2017


// =====================================================================================
//                                     FIREBASE FUNCTIONS
// =====================================================================================

/**
 * initFirebase handles setting up the Firebase context and registering
 * callbacks for the auth status.
 *
 * This method also registers a listener with firebase.auth().onAuthStateChanged.
 * This listener is called when the user is signed in or out, and that
 * is where we update the UI.
 *
 * When signed in, we also authenticate to the Firebase Realtime Database.
 * based off: https://github.com/firebase/quickstart-js/blob/master/auth/chromextension/credentials.js
 */
function FB_initFirebase(ctrl, $scope, fb) {
	// listen for auth state changes:
	// This is where we change UI if auth is successful
	fb.auth().onAuthStateChanged(function(user) {
		// Updates user struct, no matter if user is Authenticated or not
		FB_buildUserDataStruct(fb, user);

		if (user) {
			ctrl.username = user.displayName;
		} else {
			ctrl.username = '';
		}
		$scope.$digest();
	});

	// Make sure total_stats node is set up:
	checkNodeHasData(fb, '/total_stats/')
	.then(function(nodeHasData) {

		if (!nodeHasData) {
			// node is empty, so create empty total stats struct
			fb.database()
				.ref(userNode)
				.set(  getEmptyTotalStatsStruct()  );
		}

	});
}

// adds mObj parameter "incrementSize" to student CREATED count
// updates student count in 2 locations:
// -> total_stats/student_stats/created
// -> user_stats/user.uid/student_stats/created
function FB_incrementStudentCreatedCount(fb, mObj) {
    var incrementSize = mObj.incrementSize;
    var user = FB_getCurrentUser(fb);
    var userNode = 'user_stats/' + user.uid + '/student_stats/created';
    var totalStatNode = 'total_stats/student_stats/created';

    FB_incrementNode(fb, userNode, 1);
    FB_incrementNode(fb, totalStatNode, 1);
}

// adds mObj parameter "incrementSize" to student FIXED count
// updates student count in 2 locations:
// -> total_stats/student_stats/fixed
// -> user_stats/user.uid/student_stats/fixed
function FB_incrementStudentFixedCount(fb, mObj) {
    var incrementSize = mObj.incrementSize;
    var user = FB_getCurrentUser(fb);
    var userNode = 'user_stats/' + user.uid + '/student_stats/fixed';
    var totalStatNode = 'total_stats/student_stats/fixed';

    FB_incrementNode(fb, userNode, 1);
    FB_incrementNode(fb, totalStatNode, 1);
}

// adds 1 to button count at mObj.buttonCode
function FB_incrementClickCount(fb, mObj) {
    var targetTabId = mObj.activeTabId;
    var buttonCode = mObj.buttonCode;
    var buttonNode = 'total_stats/button_stats/clicked_' + buttonCode;
    
    FB_incrementNode(fb, buttonNode, 1);

    // just for fun -> so we see some log in the browser
    // chrome.tabs.sendMessage(targetTabId, {
    //     message: 'script_firebase_testing'
    // });
}

// function increments value at node by a specified increment size
// -> incrementSize default = 1
function FB_incrementNode(fb, FBNodeString, incrementSize) {
	if (!fb || !FBNodeString) return;

	var incSize = incrementSize;
	if (!incSize) incSize = 1;

	fb.database()
    	.ref( FBNodeString )
        .once('value')
        .then(function(snapshot) {
            // get value at snapshot (count)
            var count = snapshot.val();

            // if data is a string, turn it into a number (start at 0)
            if ( typeof(count) !== 'number' ) count = 0;

            // check to make sure value is defined
            if (!count) count = 0;

            fb.database()
                .ref( FBNodeString )
                .set( count + incSize );
        });
}

// gets spreadsheet -> page HTML id config from firebase.
// -> maps column headers to HTML element IDs.
// -> Example: last name: "last_name" (header) -> LSURNAME (ID of input element)
// @return: Promise with config as result
function FB_getStarsConfig(fb, mObj) {
	var site = mObj.sitename;

	// check if site var is populated
	if (!site) site = 'stars';
	else site = site.toLowerCase();

	// build site path (for correct config) in site variable
	if (site === 'rips' || site === 'fedena') {
		// add 'stars_config' outer layer to path
		site = 'stars_config/' + site;
	} else if (site !== 'stars') {
		// sitename not recognized. Error out.
		if (ThrowError)
			ThrowError({
				message: 'site: ' + sitename + ' - not recognized.',
				errMethods: ['mConsole']
			});
		return;
	}

	// if we made it down here, sitename is recognized. Now get config!
	var configPromise = fb.database()
		.ref(site + '_config')
		.once('value');

	return configPromise;
}

// gets current user from firebase auth. If none, return un_auth user.
function FB_getCurrentUser(fb) {
	var user = fb.auth().currentUser;

	if (!user) {
		user = {
			'uid': 'un_auth',
			'displayName': 'Un Authorized'
		};
	}

	return user;
}

// gets client count from fb database, then returns to requester
// -> caller has to deal with promise array
function FB_getClientCount(fb) {

	// get total "created" students
    var getCreatedPromise =	fb.database()
		.ref('/total_stats/client_stats/created')
		.once('value');

	return getCreatedPromise;
}

// // gets student count from fb database, then returns to requester
// // -> caller has to deal with promise array
// function FB_getStudentCount(fb) {

// 	// get total "created" students
//     var getCreatedPromise =	fb.database()
// 		.ref('/total_stats/student_stats/created')
// 		.once('value');

// 	// get total "fixed" students
// 	var getFixedPromise = fb.database()
// 		.ref('/total_stats/student_stats/fixed')
// 		.once('value');

// 	var promises = [ getCreatedPromise, getFixedPromise ];

// 	return promises;
// }

// if user doesn't have data stored, build basic, empty data structure
// 	if user isn't authenticated, build under user "un_auth"
function FB_buildUserDataStruct(fb, user) {
	if (!user) {
		user = {
			'uid': 'un_auth',
			'displayName': 'Un Authorized'
		};
	}

	var userNode = '/user_stats/' + user.uid;

	checkNodeHasData(fb, userNode)
	.then(function(nodeHasData) {
		if (nodeHasData) {
			// user node has data, so update last_login
			fb.database()
				.ref(userNode + '/user_details/last_login')
				.set(  getToday('YYYY-MMM-DD')  );
		} else {
			// user node is empty, so create empty user struct
			fb.database()
				.ref(userNode)
				.set(  getEmptyUserStruct(user)  );
		}

	});
}

// ==========================================================================================
//                                  OTHER FUNCTIONS
// ==========================================================================================

// function returns true or false, depending if there is data in a given FB node
// -> returns a promise!
function checkNodeHasData(fb, node) {
	return new Promise( function(resolve, reject) {
		fb.database()
			.ref(node)
			.once('value')
			.then(function(snapshot) {
				var data = snapshot.val();

				if (!data) resolve(false);
				else resolve(true);
			});
	});
}

// function returns object with zeroed counts of button clicks
function getEmptyTotalStatsStruct() {
	return {
		button_stats: {
			clicked_arrows: 0,
			clicked_clear_data: 0,
			clicked_create_table: 0,
			clicked_fix_students: 0,
			clicked_import_students: 0
		},
		client_stats: {
			created: 0
		},
		student_stats: {
			created: 0,
			fixed: 0
		}
	};
}

// function returns an object with zeroed counts & populated name / last_login
function getEmptyUserStruct(user) {
	var name = user.displayName;
	var today = getToday("YYYY-MMM-DD");

	return {
		user_details: {
			display_name: name,
			last_login: today
		},
		student_stats: { // FEDENA
			created: 0,
			fixed: 0
		},
		client_stats: {
			// TODO: add more stuff here for RIPS
			created: 0
		}
	};
}

// function gets today's date, formatted in specified fashion
function getToday(format) {
	return formatDate(format, new Date().toDateString() );
}

// function formats a datestring, depending on the format specified!
function formatDate(format, dateString) {
	var date = dateString;
	var formattedDate = '';

	switch(format) {
		case "YYYY-MMM-DD":
			var dateArr = date.split(' ');
			var dayOfWeek = dateArr[0];
			var month = dateArr[1];
			var dayOfMonth = dateArr[2];
			var year = dateArr[3];

			formattedDate = year.concat('-', month, '-', dayOfMonth);
			break;
		default:
			console.log('date format not handled! -> formatDate (FBAPI.js)');
	}

	return formattedDate;
}

// function getFirebaseConfig() {}

// ===========================================================================================
//                           FEDENA-IMPORT FIREBASE DATA STRUCTURE
// ===========================================================================================

/*    - Description -
 * Firebase Database with the following features:
 * 1) Realtime Database
 *    - User must be authenticated to read & write to database
 * 2) Authentication
 */

/* https://<database name>.firebaseio.com/
 *
 <fedenaimportconfig (v1.1)>: {
	user_stats: {
		<string: user.uid>: {
			user_details: {
				display_name: 	<string: name>,
				last_login: 	<string: date>
			},
			student_stats: {
				created: 	<number: #>,
				fixed: 		<number: #>
			},
			client_stats: {
				// TODO: add stuff here! -> for RIPS
				created: 	<number: #>
			}
		},
		<string: user2.uid>: {
			// ... user 2
		},
		un_auth: { // placeholder for all unauthorized user stat tracking
			user_details: {
				// same as above
			},
			student_stats: {
				// same
			},
			client_details: {
				//same
			}
		}
	},
	total_stats: {
		button_stats: {
			clicked_arrows: 			<number: #>,
			clicked_create_table: 		<number: #>,
			clicked_fix_students: 		<number: #>,
			clicked_import_students: 	<number: #>,
			clicked_clear_data: 		<number: #>
		},
		student_stats: {
			created: 	<number: #>,
			fixed: 		<number: #>
		},
		client_stats: {
			// TODO: add more tracking stats here
			created: 	<number: #>
		}
	},
	// TODO: ADD THIS IN!!!
	stars_config: { // TODO: fill this out - should this go in a different database?
		fedena_config: {
			student_config: {
				first_name: <string: first name>
			},
			parent_config: {
				name: <string: name>
			},
			unhcr_config: {
				id: <string: id>
			}
		},
		rips_config: {
			// TODO: fill this out!
			client_registration_config: {
				optional: {
					<optional client data here>
				},
				required: {
					client_first_name: <string: html id>
				}
			}
		}
	},
	zz_legacy_data: {
		// whatever was stored here before
	}
 }

 <fedenaimportconfig (v1.0)>: {
 	// not entirely sure what was in this version
 }
 */