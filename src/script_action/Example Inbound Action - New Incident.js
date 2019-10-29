/* globals DomainEmailHelper, IncidentState */
// Declare variables
var wasForwarded = false;
var userRecord;
var companyID;
var domainID;
var helper = new DomainEmailHelper();

//------------------------------------------------------------------------------------------------------------------------------------------
// ---------Cleanse Email Variables----------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------------
email = helper.cleanseEmailObject(email);

//------------------------------------------------------------------------------------------------------------------------------------------
// --------------Find a User-----------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------------
userRecord = helper.findUser(email, wasForwarded);

//------------------------------------------------------------------------------------------------------------------------------------------
// --------------Find a Domain---------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------------
domainID = helper.findDomain(email, userRecord, wasForwarded);
current.sys_domain = domainID;

//------------------------------------------------------------------------------------------------------------------------------------------
// --------------Find a Company--------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------------
companyID = helper.findCompany(userRecord, email, domainID);
current.company = companyID;

//------------------------------------------------------------------------------------------------------------------------------------------
// -------------Get Email Details------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------------
var emailDetails = helper.getEmailDetails(email);

//	Note: current.opened_by is already set to the first UserID that matches the From: email address

if (userRecord !== false) {
  current.caller_id = userRecord.sys_id.toString();
  current.opened_by = userRecord.sys_id.toString();
} else {
  current.caller_id = gs.getUserID();
}

current.work_notes = emailDetails;
current.short_description = email.subject;
current.description = email.body_text;

current.category = 'inquiry';
current.incident_state = IncidentState.NEW;
current.notify = 2;
current.contact_type = 'email';

if (email.body.assign != undefined) {
  current.assigned_to = email.body.assign;
}

if (email.importance != undefined) {
  if (email.importance.toLowerCase() == 'high') {
    current.impact = 1;
    current.urgency = 1;
  }
}

current.insert();
