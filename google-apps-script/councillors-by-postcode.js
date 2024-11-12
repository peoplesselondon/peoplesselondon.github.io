// This script is designed to be used with a Google Sheets document that contains two sheets:
// - 'Post codes' with columns 'Postcode' and 'Ward'
// - 'Councillors' with columns 'Ward', 'Councillor Name', and 'Email'
// The script takes a postcode as a parameter and returns the ward and councillors for that postcode.
// To deploy the script as a web app, follow these steps:
// 1. Open the Google Sheets document containing the data.
// 2. Open the Google Apps Script editor.
// 3. Copy and paste the script into the editor.
// 4. Save the script and deploy it as a web app ensureing everyone can access.
// 5. Use the web app URL with the 'postcode' parameter to get the councillors for a given postcode.
//    e.g. curl https://script.google.com/macros/s/AKfycbzN7FhBAz0U4Kl3PnpFI79_NsnM4cfLHZsDIAz2_zcWBsXs1sPkDUF0Z6OTA8zA4Tkb/exec?postcode=SE120RF
    
function doGet(e) {
  var postcode = e.parameter.postcode;
  var result = getCouncillors(postcode);
  return ContentService.createTextOutput(JSON.stringify(result))
                       .setMimeType(ContentService.MimeType.JSON);
}

function normalisePostcode(postcode) {
  return postcode.replace(/\s+/g, '').toUpperCase();
}

function getCouncillors(postcode) {
  if (!postcode) return [];

  var spreadsheet = SpreadsheetApp.getActive();
  var postCodesSheet = spreadsheet.getSheetByName('Post codes');
  var councillorsSheet = spreadsheet.getSheetByName('Councillors');

  // Get the header row and find the column indices by name
  var postCodesHeader = postCodesSheet.getRange(1, 1, 1, postCodesSheet.getLastColumn()).getValues()[0];
  var postcodeColIndex = postCodesHeader.indexOf('Postcode') + 1;
  var wardColIndex = postCodesHeader.indexOf('Ward') + 1;

  // Find the row with the given postcode and get ward
  var postCodesRange = postCodesSheet.getRange(2, postcodeColIndex, postCodesSheet.getLastRow() - 1);
  var postCodesValues = postCodesRange.getValues();
  var ward = null;
  var normalisedPostcode = normalisePostcode(postcode);

  for (var i = 0; i < postCodesValues.length; i++) {
    if (normalisePostcode(postCodesValues[i][0]) === normalisedPostcode) {
      ward = postCodesSheet.getRange(i + 2, wardColIndex).getValue();
      console.log("Found ward:" + ward);
      break;
    }
  }

  if (!ward) {
    return []; // Return an empty array if the postcode is not found
  }

  // Get the header row and find the column indices for the 'Councillors' sheet
  var councillorsHeader = councillorsSheet.getRange(1, 1, 1, councillorsSheet.getLastColumn()).getValues()[0];
  var councillorsWardColIndex = councillorsHeader.indexOf('Ward') + 1;
  var councillorsNameColIndex = councillorsHeader.indexOf('Councillor Name') + 1;
  var councillorsEmailColIndex = councillorsHeader.indexOf('Email') + 1;

  // Use the Google Sheets API to find the rows with the given ward
  var councillorsRange = councillorsSheet.getRange(2, 1, councillorsSheet.getLastRow() - 1, councillorsSheet.getLastColumn());
  var councillorsValues = councillorsRange.getValues();
  var councillorsSet = new Set();
  var councillors = [];

  for (var j = 0; j < councillorsValues.length; j++) {
    if (councillorsValues[j][councillorsWardColIndex - 1] === ward) {
      var councillorString = JSON.stringify(councillorsValues[j]);
      var councillorEmail = councillorsValues[j][councillorsEmailColIndex - 1];
      var councillorName = councillorsValues[j][councillorsNameColIndex - 1];
      if (!councillorsSet.has(councillorString)) {
        councillorsSet.add(councillorString);
        councillors.push({name: councillorName, email: councillorEmail}); // Add the entire row of the councillor
      }
    }
  }

  return {ward, councillors};
}

// Test the function
//var councillors = getCouncillors('SE9 4PW');
//console.info("got councillors:");
//console.info(councillors)
