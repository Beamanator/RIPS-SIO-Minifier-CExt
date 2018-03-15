// ================================================================================================
//                                  MAIN EVENT LISTENERS
// ================================================================================================

// React when a browser action's icon is clicked.
chrome.browserAction.onClicked.addListener(function(tab) {
    // do something (handled in manifest file for now)
});

// React when a tab is closed
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    // do stuff
});

/* mObj             object containing config and data
 *                  {
 *               		action: "get_data_...",
 *               		dataObj: {
 *                          'key1': value1,
 *                          'key2': value2
 *                      },
 *                      noCallback: false
 *               	}
 * MessageSender    chrome object that holds information about message sender (ex: tab id)
 * sendResponse     callback function for message sender
 */
chrome.runtime.onMessage.addListener(function(mObj, MessageSender, sendResponse) {
    var action = mObj.action;
    var async = false;
    var noCallback = mObj.noCallback;

    // kill callback if noCallback flag is true
    if (noCallback) sendResponse = undefined;

    // quit early if no action defined (probably an options page messages)
    if (!action) return;

    switch(action) {
        // gets data from chrome's local storage and returns to caller via sendResponse
        case 'get_data_from_chrome_storage_local':
            getValuesFromChromeLocalStorage(mObj, sendResponse);
            // async because uses promises
            async = true;
            break;

        // save data to chrome's local storage
        case 'store_data_to_chrome_storage_local':
            storeToChromeLocalStorage(mObj, sendResponse);
            // async because uses promises
            async = true;
            break;

        // clear data from keys in mObj.dataObj [clear by setting keys to '']
        case 'clear_data_from_chrome_storage_local':
            clearDataFromChromeLocalStorage(mObj, sendResponse);
            // async because uses promises
            async = true;
            break;

        // add error to options page
        case 'catch_error':
            catchMessage(mObj, sendResponse);
            async = true;
            break;

        // ---- NEW ACTIONS GO ABOVE THIS LINE ----
        
        // to use open / close tab, look in Fedena extension code
        case 'open/close_tab':
            console.error('opening / closing tabs not handled yet');
            break;

        // Firebase functions can look to Fedena code for reference
        case 'firebase_*':
            console.error('Firebase action code entered and not handled');
            break;

        // send message back saying no response found:
        default:
            broadcastActionHandleError(mObj);
    } 

    // returns true if asyncronous is needed
    if (async) return true;
});

// ===============================================================
//                       main functions
// ===============================================================

/**
 * Function gets a message from caller and stores it, triggering options.js
 * to listen and display some message (if key is ADD_MESSAGE)
 * 
 * @param {object} mObj - message config object
 * @param {function} sendResponse - not used right now
 */
function catchMessage(mObj, sendResponse) {
    var message = mObj.message;

    if (!message)
        message = 'No message found - using basic error message from background.js';
    
    var mObj2 = {
        dataObj: {
            'ADD_MESSAGE': message
        }
    };

    // store data, add_message handled in options.js now
    storeToChromeLocalStorage(mObj2, sendResponse);
}

/**
 * Function gets chrome local data and sends data back to caller
 * 
 * Expects mObj to look like this:
 * {
 *      action: '...',
 *      keysObj: {
 *          'key1', '',
 *          'key2', '',
 *          ...
 *      }
 * }
 * 
 * @param {object} mObj message object with key data
 * @param {function} responseCallback callback function where gathered data will be sent
 */
function getValuesFromChromeLocalStorage(mObj, responseCallback) {
    // get object of keys from message object
    var keysObj = mObj.keysObj;

    getValuesFromStorage( keysObj )

    // responses is an array of objects {key:value}
    .then( function( responses ) {
        // turn responses into a serializable object
        var obj = Serialize_ArrayToObj(responses);

        responseCallback( obj );
    });
}

/**
 * Function stores data to chrome local storage based off config object (mObj)
 * 
 * @param {object} mObj message object holding data to store
 * @param {function} responseCallback callback function where success message is sent
 */
function storeToChromeLocalStorage(mObj, responseCallback) {
    var dataObj = mObj.dataObj;

    // if trying to clear 
    if (!dataObj) {
        console.error('data obj in store function doesn\'t exist!');
    }
    
    var storePromises = []; // used to store all key promises below

    // loop through keys in dataObj (turns obj into array of keys)
    // if dataObj is empty, loop will get skipped
    Object.keys( dataObj ).forEach( function(key, index) {
        // key: the name of the object key
        // index: the ordinal position of the key within the object
        var dataValue = dataObj[key]; 

		/* ============== AVAILABLE KEYS =============
            ADD_MESSAGE     -   add message to console in options.js

            TODO: add audit trail (in fb?) just for me?
		*/
		switch (key) {
                
            // tells options.js to add message to console :)
            case 'ADD_MESSAGE':
                var message = dataValue;
                storePromises.push(
                    saveValueToStorage('ADD_MESSAGE', message)
                );
                break;

            default:
                // log errored key to background console:
                console.error('unable to handle key when saving to local storage:', key);
		}
    });

	Promise.all(storePromises)
    .then( function(responseMessageArr) {
        // if responseCallback isn't real, just console log the message
        if (responseCallback)
            responseCallback( responseMessageArr );
        else
            console.log('store messages: ',responseMessageArr);
    });
}

/**
 * Function clears all store data in chrome local storage for passed-in keys
 * 
 * Keys should be pased in serialized, like this:
 * {
 *      'CACHED_DATA': '',
 *      'VALID_PHONE': '',
 *      ... etc
 * }
 * 
 * @param {any} mObj message config object holding data keys object
 * @param {any} responseCallback callback function (may be undefined)
 */
function clearDataFromChromeLocalStorage(mObj, responseCallback) {
    var dataObj = mObj.dataObj;

    storeToChromeLocalStorage({
        dataObj: dataObj
    }, responseCallback);    
}

// ===============================================================
//                      helper functions
// ===============================================================

/**
 * Function turns an array into a serializable object
 * Purpose = must send chrome messages as objects, not arrays
 * Note: if arr[i] is undefined, doesn't add to obj!
 * Note2: if arr[i]['key'] is undefined or null, also doesn't add to obj!
 * TODO: think if note2 is good or bad...
 * 
 * @param {array} arr array of objects to convert to single serializable object
 * @param {object} [obj={}] object to add keys to
 * @param {number} [index=0] starting index
 * @returns serializable object made from array
 */
function Serialize_ArrayToObj(arr, obj = {}, index = 0) {
    if (arr.length < 1) {
        console.error('Array not populated');
        return {};
    }

    for (let i = index; i < arr.length; i++) {
        // var nextKey = key + i;
        // // skip undefined values in arr:
        // if ( arr[i] != undefined )
        //     obj[nextKey] = arr[i];

        // get data object from array
        var dataObj = arr[i];

        // check if dataObj is an empty object. if so, skip
        if ( Object.keys( dataObj ).length < 1 )
            continue;

        else {
            Object.keys( dataObj ).forEach( function(nextKey, index) {
                // get next value to serialize from dataObj
                var nextVal = dataObj[nextKey];

                // if nextVal is legit, push into obj
                if (nextVal !== undefined && nextVal !== null)
                    obj[nextKey] = nextVal;
            });
        }
            
    }

    return obj;
}

/**
 * Function gets single key of data from chrome local storage
 * 
 * @param {string} key self-explanatory
 * @returns Promise with data from 1 key
 */
function getValFromStorage(key) {
	return new Promise( function( resolve, reject ) {
		chrome.storage.local.get( key, function( dataObj ) {

			// successful -> return data from database
			resolve( dataObj );
		});
	});
}

/**
 * Function gets multiple keys of data from chrome local storage
 * 
 * @param {object} keysObj object full of keys
 * @returns Promise array with data from all keys
 */
function getValuesFromStorage( keysObj ) {
    var promises = [];

    Object.keys( keysObj ).forEach( function( key, index ) {
        promises.push( getValFromStorage( key ) );
    });

	return Promise.all(promises);
}

/**
 * Function sends messages to console and tabs indicating that an action (mObj.action)
 * was sent to background.js and not handled appropriately.
 * 
 * @param {any} mObj message config object
 */
function broadcastActionHandleError(mObj) {
    var errAction = mObj.action;

    // send err message to tabs
    chrome.tabs.sendMessage(MessageSender.tab.id, {
        message: 'message_not_handled_by_background_script',
        action: errAction
    });

    // log error in background console:
    console.error('error handling action in background.js: action<' + errAction + '>');
}

/**
 * Function stores single key of data into chrome local storage
 * 
 * @param {any} key self-explanatory
 * @param {any} value self-explanatory
 * @returns Promise that resolves with success message
 */
function saveValueToStorage(key, value) {
    return new Promise( function(resolve, reject) {
		var obj = {};
		obj[key] = value;

		chrome.storage.local.set(obj, function() {
            // if value is empty, it's a data clear (not store)
            var message = '';

            if (value === '')
                message = 'Cleared: ' + key;
            else
                message = 'Saved: ' + key + ':' + value;

            // send message back to caller
			resolve(message);
		});
	});
}