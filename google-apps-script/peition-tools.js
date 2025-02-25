var validPostcodesSet;

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Petition tools')
    .addItem('Remove invalid and de-duplicate', 'clean')
    .addToUi();
}

function normalisePostcode(postcode) {
  return postcode.toString().replace(/\s+/g, '').toUpperCase();
}

function loadValidPostcodes() {
  var spreadsheet = SpreadsheetApp.getActive();
  var postCodesSheet = spreadsheet.getSheetByName('Post codes');
  var postCodesRange = postCodesSheet.getRange(2, 1, postCodesSheet.getLastRow() - 1, 1);
  var postCodesValues = postCodesRange.getValues();
  validPostcodesSet = new Set(postCodesValues.map(row => normalisePostcode(row[0])));
}

function checkPostcode(postcode) {
  console.log("Checking postcode:" + postcode);
  if (!validPostcodesSet) {
    loadValidPostcodes();
  }
  return validPostcodesSet.has(normalisePostcode(postcode));
}

function clean() {
  removeInvalidPostcodes();
  deDuplicate();
}

function removeInvalidPostcodes() {
  var spreadsheet = SpreadsheetApp.getActive();
  var responsesSheet = spreadsheet.getSheetByName('Form responses 1');
  var responsesHeaders = responsesSheet.getRange(1, 1, 1, responsesSheet.getLastColumn()).getValues()[0];
  var individualPostcodeColIndex = responsesHeaders.indexOf('Postcode') + 1;
  var organisationPostcodeColIndex = responsesHeaders.lastIndexOf('Postcode') + 1;

  var validPostcodes = getOrCreateSheet(spreadsheet, 'Valid Postcodes');
  var invalidPostcodes = getOrCreateSheet(spreadsheet, 'Invalid Postcodes');

  var validPostcodesValues = [];
  var invalidPostcodesValues = [];
  var responsesRange = responsesSheet.getRange(2, 1, responsesSheet.getLastRow() - 1, responsesSheet.getLastColumn());
  var responsesValues = responsesRange.getValues();

  loadValidPostcodes();

  for (var i = 0; i < responsesValues.length; i++) {
    if (checkPostcode(responsesValues[i][organisationPostcodeColIndex - 1]) || checkPostcode(responsesValues[i][individualPostcodeColIndex - 1])) {
      validPostcodesValues.push(responsesValues[i]);
    } else {
      invalidPostcodesValues.push(responsesValues[i]);
    }
  }

  updateSheet(validPostcodes, responsesHeaders, validPostcodesValues);
  updateSheet(invalidPostcodes, responsesHeaders, invalidPostcodesValues);
}

function deDuplicate() {
  var spreadsheet = SpreadsheetApp.getActive();
  var validPostcodesSheet = spreadsheet.getSheetByName('Valid Postcodes');
  var validPostcodesRange = validPostcodesSheet.getRange(1, 1, validPostcodesSheet.getLastRow(), validPostcodesSheet.getLastColumn());
  var validPostcodesValues = validPostcodesRange.getValues();
  var validPostcodesHeaders = validPostcodesValues.shift();
  var deduplicatedValues = [validPostcodesHeaders];
  var duplicateEmailValues = [validPostcodesHeaders];
  var duplicateIndividualPhoneValues = [validPostcodesHeaders];
  var duplicateOrganisationPhoneValues = [validPostcodesHeaders];
  var duplicateNamePostcodeValues = [validPostcodesHeaders];
  var deduplicatedSet = new Set();
  var emailSet = new Set();
  var individualPhoneSet = new Set();
  var organisationPhoneSet = new Set();
  var nameColIndex = validPostcodesHeaders.indexOf('Name') + 1;
  var postcodeColIndex = validPostcodesHeaders.indexOf('Postcode') + 1;
  var individualEmailColIndex = validPostcodesHeaders.indexOf('Email address') + 1;
  var organisationEmailColIndex = validPostcodesHeaders.lastIndexOf('Email address') + 1;
  var individualPhoneColIndex = validPostcodesHeaders.indexOf('Phone number') + 1;
  var organisationPhoneColIndex = validPostcodesHeaders.lastIndexOf('Phone number') + 1;

  for (var i = 0; i < validPostcodesValues.length; i++) {
    var row = validPostcodesValues[i];
    var email = row[individualEmailColIndex - 1] || row[organisationEmailColIndex - 1];
    var individualPhone = row[individualPhoneColIndex - 1];
    var organisationPhone = row[organisationPhoneColIndex - 1];
    var name = row[nameColIndex - 1];
    var postcode = row[postcodeColIndex - 1];
    var key = JSON.stringify([name || '', postcode || '']);

    if (email && emailSet.has(email)) {
      duplicateEmailValues.push(row);
    } else if (individualPhone && individualPhoneSet.has(individualPhone)) {
      duplicateIndividualPhoneValues.push(row);
    } else if (organisationPhone && organisationPhoneSet.has(organisationPhone)) {
      duplicateOrganisationPhoneValues.push(row);
    } else if (name && postcode && deduplicatedSet.has(key)) {
      duplicateNamePostcodeValues.push(row);
    } else {
      if (name && postcode) {
        deduplicatedSet.add(key);
      }
      if (email) {
        emailSet.add(email);
      }
      if (individualPhone) {
        individualPhoneSet.add(individualPhone);
      }
      if (organisationPhone) {
        organisationPhoneSet.add(organisationPhone);
      }
      deduplicatedValues.push(row);
    }
  }

  var deduplicatedSheet = getOrCreateSheet(spreadsheet, 'Output');
  var duplicatesEmailSheet = getOrCreateSheet(spreadsheet, 'Duplicates-Email');
  var duplicatesIndividualPhoneSheet = getOrCreateSheet(spreadsheet, 'Duplicates-Individual-Phone');
  var duplicatesOrganisationPhoneSheet = getOrCreateSheet(spreadsheet, 'Duplicates-Organisation-Phone');
  var duplicatesNamePostcodeSheet = getOrCreateSheet(spreadsheet, 'Duplicates-Name-Postcode');

  updateSheet(deduplicatedSheet, validPostcodesHeaders, deduplicatedValues);
  updateSheet(duplicatesEmailSheet, validPostcodesHeaders, duplicateEmailValues);
  updateSheet(duplicatesIndividualPhoneSheet, validPostcodesHeaders, duplicateIndividualPhoneValues);
  updateSheet(duplicatesOrganisationPhoneSheet, validPostcodesHeaders, duplicateOrganisationPhoneValues);
  updateSheet(duplicatesNamePostcodeSheet, validPostcodesHeaders, duplicateNamePostcodeValues);
}

function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

function updateSheet(sheet, headers, values) {
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}
