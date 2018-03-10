// Last Updated: June 24, 2017
/*
	Purpose: Convert text values from spreadsheets to appropriate codes in
		dropdowns of Registration & CBI pages
*/

// TODO: find all values in 'input' object / list / spreadsheet that aren't in specific
//  dropdowns
//  ex: 'M' -> 'Male' in GENDER
function findMissing(input) {

}

/**
 * Function loops through html dropdown options of a given 'id' (using jQuery), then:
 * 1) adds data into an object
 * 2) creates message string (dcText) with all object data
 * 3) returns message
 * 
 * Made for Google Chrome console (returning will print the text to the screen like console.log)
 * 
 * After printing, copy / paste output to getDC() function below! 
 * 
 * @param {string} id - html id of dropdown element 
 * @returns message text (goal = message is printed to google chrome console)
 */
function loop(id) {
	var obj = {};
	$('#' + id + ' option').each(function() {
		// obj[ $(this).val() ] = $(this).text().trim();
		obj[ $(this).text().trim() ] = $(this).val();
	});
	
	var dcText = '\nobj = {\n';

	$.each( obj, function( key, value ) {
		dcText += '\t\'' + key + '\': ' + value + ',\n';
		// dcText += '\t].indexOf(val) !== -1) { return ' + value + '; }\n'
	});

	dcText += '}';

	return dcText;
}

// ========================================================================================
//										Main Functions
// ========================================================================================

/**
 * Function checks if value exists in below lists and returns code.
 * If doesn't exist, returns default value (def)
 * 
 * @param {number} val value in field object
 * @param {number} def default value in field object
 * @returns a (hopefully) valid code for the dropdown
 */
function getCode(val, def) {
	if (val !== undefined) { return val; }
	else return def;
}

// cl = client object
// FT = Field Translator object
// field = field in client object
/**
 * Function gets Dropdown Code [manually] from list of values in specific dropdown 
 * 
 * @param {object} cl client object
 * @param {object} FT Field Translator
 * @param {string} field field that is being searched / added in the client object
 * @returns valid code for specific dropdown (or undefined)
 */
function getDC(cl, FT, field) {
	// get value from client:
	var val = cl[ FT[field] ];
	var obj;
	var code;

	switch(field) {
		case 'GENDER':
			obj = {
				'Female': 	2,
				'Male': 	1,
				// Extra values in spreadsheets, but not dropdowns:
				'female': 	2,
				'F': 		2,
				'male': 	1,
				'M':  		1
			}
			code = getCode( obj[val] , 3); // default = 3 [other]
			break;
		case 'NATIONALITY':
			obj = {
				'Eritrea': 		17,
				'Ethiopia': 	19,
				'Iraq': 		24,
				'Somalia': 		43,
				'South Sudan': 	44,
				'Sudan': 		47,
				'Syria': 		49,
				'Yemen': 		60,
				'-STATELESS-': 	46,
				'Afganistan': 	67,
				'Albania': 		66,
				'Algeria': 		2,
				'Andorra': 		68,
				'Angola': 		3,
				'Antigua and Barbuda': 69,
				'Argentina': 	70,
				'Armenia': 		71,
				'Aruba': 		72,
				'Australia':	73,
				'Austria': 		74,
				'Azerbaijan': 	4,
				'Bahamas': 		75,
				'Bahrain': 		76,
				'Bangladesh': 	77,
				'Barbados': 	78,
				'Belarus': 		79,
				'Belgium': 		80,
				'Belize': 		81,
				'Benin': 		82,
				'Bhutan': 		83,
				'Bolivia': 		84,
				'Bosnia and Herzegovi': 85,
				'Botswana': 	86,
				'Brazil': 		87,
				'Brunei': 		88,
				'Bulgaria': 	89,
				'Burkina Faso': 90,
				'Burma': 		91,
				'Burundi': 		8,
				'Cabo Verde': 	92,
				'Cambodia': 	93,
				'Cameroon': 	9,
				'Canada': 		94,
				'Central African Repu': 104,
				'Chad': 		11,
				'Chile': 		95,
				'China': 		12,
				'Colombia': 	96,
				'Comoros': 		13,
				'Congo, DRC': 	105,
				'Congo, Republic': 106,
				'Costa Rica': 	97,
				'Cote d\'Ivoire': 98,
				'Croatia': 		99,
				'Cuba': 		100,
				'Curacao': 		101,
				'Cyprus': 		102,
				'Czech Republic': 103,
				'Denmark': 		107,
				'Djibouti': 	16,
				'Dominica': 	108,
				'Dominican Republic': 109,
				'East Timor (TL)': 110,
				'Ecuador': 		111,
				'Egypt': 		112,
				'El Salvador': 	113,
				'Equatorial Guinea': 114,
				'Estonia': 		115,
				'Fiji': 		116,
				'Finland': 		117,
				'France': 		118,
				'Gabon': 		119,
				'Gambia, The': 	120,
				'Georgia': 		121,
				'Germany': 		122,
				'Ghana': 		123,
				'Greece': 		124,
				'Grenada': 		125,
				'Guatemala': 	126,
				'Guinea': 		21,
				'Guinea-Bissau': 127,
				'Guyana': 		128,
				'Haiti': 		129,
				'Holy See': 	130,
				'Honduras': 	131,
				'Hong Kong': 	132,
				'Hungary': 		133,
				'Iceland': 		134,
				'India': 		22,
				'Indonesia': 	23,
				'Iran': 		135,
				'Ireland': 		136,
				'Israel': 		137,
				'Italy': 		138,
				'IVORY_COAST': 	25,
				'Jamaica': 		139,
				'Japan': 		140,
				'Jordan': 		26,
				'Kazakhstan': 	27,
				'Kenya': 		141,
				'Kiribati': 	142,
				'Kosovo': 		143,
				'Kuwait': 		144,
				'Kyrgyzstan': 	145,
				'Laos': 		146,
				'Latvia': 		147,
				'Lebanon': 		28,
				'Lesotho': 		148,
				'Liberia': 		29,
				'Libya': 		30,
				'Liechtenstein': 149,
				'Lithuania': 	151,
				'Luxembourg': 	150,
				'Macau': 		152,
				'Macedonia': 	153,
				'Madagascar': 	154,
				'Malawi': 		155,
				'Malaysia': 	156,
				'Maldives': 	157,
				'Mali': 		31,
				'Malta': 		158,
				'Marshall Islands': 159,
				'Mauritania': 	32,
				'Mauritius': 	160,
				'Mexico': 		161,
				'Micronesia': 	162,
				'Moldova': 		163,
				'Monaco': 		164,
				'Mongolia': 	165,
				'Montenegro': 	166,
				'Morocco': 		33,
				'Mozambique': 	167,
				'Namibia': 		168,
				'Nauru': 		169,
				'Nepal': 		170,
				'Netherlands': 	171,
				'Netherlands Antilles': 172,
				'New Zealand': 	173,
				'Nicaragua': 	174,
				'Niger': 		175,
				'Nigeria': 		34,
				'North Korea': 	176,
				'Norway': 		177,
				'Oman': 		178,
				'Pakistan': 	35,
				'Palau': 		179,
				'Palestinian': 	36,
				'Panama': 		180,
				'Papau New Guinea': 181,
				'Paraguay': 	182,
				'Peru': 		183,
				'Philippines': 	37,
				'Poland': 		184,
				'Portugal': 	185,
				'Qatar': 		186,
				'Romania': 		187,
				'Russia': 		38,
				'Rwanda': 		39,
				'Saint Kitts and N': 188,
				'Saint Lucia': 	189,
				'Saint Vincent & G': 190,
				'Samoa': 		191,
				'San Marino': 	192,
				'Sao Tome and Princ': 193,
				'Saudi Arabia': 40,
				'Senegal': 		194,
				'Serbia': 		195,
				'Seychelles': 	196,
				'Sierra Leone': 41,
				'Singapore': 	197,
				'Sint Maartan': 198,
				'Slovakia': 	199,
				'Slovenia': 	200,
				'Solomon Islands': 201,
				'South Africa': 202,
				'South Korea': 	203,
				'Spain': 		204,
				'Sri Lanka': 	45,
				'Suriname': 	205,
				'Swaziland': 	206,
				'Sweden': 		207,
				'Switzerland': 	208,
				'Taiwan': 		209,
				'Tajikistan': 	50,
				'Tanzania': 	51,
				'Thailand': 	52,
				'Togo': 		53,
				'Tongo': 		210,
				'Trinidad and Tobago': 211,
				'Tunisia': 		54,
				'Turkey': 		55,
				'Turkmenistan': 56,
				'Tuvalu': 		212,
				'Uganda': 		57,
				'Ukraine': 		58,
				'United Arab Emirates': 213,
				'United Kingdom': 214,
				'United States': 215,
				'Uruguay': 		216,
				'Uzbekistan': 	59,
				'Vanuatu': 		217,
				'Venezuela': 	218,
				'Vietnam': 		219,
				'Zambia': 		220,
				'Zimbabwe': 	61,
				// Extra values in spreadsheets, but not dropdowns:
				'Sudanes': 		47,		// Same as 'Sudan'
				'Sudanese': 	47		// Same as 'Sudan'
			}
			code = getCode( obj[val], 46) // Default = 46 - '-STATELESS-'
			break;
		case 'MAIN LANGUAGE':
			obj = {
				'Amharic': 55,
				'Arabic': 56,
				'Bilen': 57,
				'Dinka': 58,
				'English': 59,
				'French': 60,
				'Fur': 61,
				'Heiban': 62,
				'Kawalib': 63,
				'Masalit': 64,
				'Moro': 65,
				'Nuer': 66,
				'Oromo': 67,
				'Other': 75,
				'Saho': 68,
				'Shilluk': 69,
				'Somali': 70,
				'Swahili': 71,
				'Tigre': 73,
				'Tigrinya': 72,
				'Zaghawa': 74,
			};
			code = getCode( obj[val], 75) // Default = 75 - 'Other'
			break;
	}

	return code;
}