var DomainEmailHelper = Class.create();
DomainEmailHelper.prototype = {
  initialize: function() {},

  cleanseEmailObject: function(email) {
    // Cleanse Origemail
    email.origemail = this.cleanseEmailAddress(email.origemail);

    // Check for email.body.from and cleanse if found, otherwise set it to false for easy checking in future
    if (typeof email.body.from != 'undefined' && email.body.from != undefined) {
      email.body.from = this.cleanseEmailAddress(email.body.from);
    } else {
      email.body.from = false;
    }

    // noinspection JSUnresolvedVariable
    email.recipients = email.to.split(',');

    if (typeof email.recipients == 'string') {
      email.recipients = new Array(email.recipients);
    }

    var i;
    var rArray = email.recipients;
    for (i = 0; i < rArray.length; i++) {
      rArray[i] = this.cleanseEmailAddress(rArray[i]);
    }
    email.recipients = rArray;

    return email;
  },

  cleanseEmailAddress: function(emailAddress) {
    var matches;

    matches = emailAddress.match(/<([^>]*)>/);
    if (matches) {
      emailAddress = matches[1];
    }
    matches = emailAddress.match(/\[mailto:([^\]]*)]/);
    if (matches) {
      emailAddress = matches[1];
    }

    emailAddress = emailAddress.toLowerCase();

    return emailAddress;
  },

  searchForWatermarkAndUpdateEmail: function(email) {
    var watermarkGR = new GlideRecord('sys_watermark');
    var watermarkRgx;
    var watermarkResult;
    var bodyText = email.body_text;

    watermarkRgx = new RegExp('Ref:MSG(?:[0-9]*)', 'i');

    watermarkResult = bodyText.match(watermarkRgx);

    if (watermarkResult != null) {
      watermarkResult = watermarkResult[0].split(':');
      if (watermarkGR.get('number', watermarkResult[1])) {
        if (watermarkGR.source_table == current.getTableName()) {
          return watermarkGR.sys_id;
        }
      }
    }

    return false;
  },

  _getUserFromAdditionalEmail: function(emailAddress) {
    var extraEmails = new GlideRecord('u_email_routing');
    extraEmails.addQuery('u_type', 'email_address');
    extraEmails.addQuery('u_value', emailAddress);
    extraEmails.addQuery('u_user', '!=', '');
    extraEmails.addQuery('u_active', true);
    extraEmails.setLimit(1);
    extraEmails.queryNoDomain();
    if (extraEmails.next()) {
      return extraEmails.u_user.getRefRecord();
    }
    return false;
  },

  findUser: function(email, wasForwarded) {
    var userQuery;
    var userToReturn = false;
    // var extraEmails;
    var domain;
    var result;

    // If it was forwarded, check for the email.body.from address first
    if (wasForwarded && email.body.from !== false) {
      userQuery = new GlideRecord('sys_user');
      userQuery.addQuery('email', email.body.from);
      userQuery.addQuery('active', true);
      userQuery.setLimit(1);
      userQuery.queryNoDomain();
      if (userQuery.next()) {
        userToReturn = userQuery;
      }

      if (userToReturn === false) {
        result = this._getUserFromAdditionalEmail(email.body.from);
        if (result !== false) {
          userToReturn = result;
        }
      }
    }

    if (userToReturn === false && String(email.origemail).replace(/\s/gi, '') != '') {
      userQuery = new GlideRecord('sys_user');
      userQuery.addQuery('email', email.origemail);
      userQuery.addQuery('active', true);
      userQuery.setLimit(1);
      userQuery.queryNoDomain();
      if (userQuery.next()) {
        userToReturn = userQuery;
      }
    }

    if (userToReturn === false && String(email.origemail).replace(/\s/gi, '') != '') {
      result = this._getUserFromAdditionalEmail(email.origemail);
      if (result !== false) {
        userToReturn = result;
      }
    }

    if (userToReturn !== false) {
      domain = this.checkEmailForwardersForDomain(email);
      if (domain !== false && userToReturn.sys_domain != domain) {
        return false;
      }
      return userToReturn;
    }

    return false;
  },

  findDomain: function(email, userRecord, wasForwarded) {
    var company;
    var domain;
    var header;
    var actDom;
    var suffix;
    var findMSP;
    var i;
    var rArray;

    // If a company is defined in the email then set the domain based on the company
    if (typeof email.body.company != 'undefined' && email.body.company != undefined) {
      company = new GlideRecord('core_company');
      company.addQuery('name', 'CONTAINS', email.body.company);
      company.addQuery('active', true);
      company.setLimit(1);
      company.queryNoDomain();
      if (company.next()) {
        return company.sys_domain;
      }
    }

    // Check the Forwarding Email Addresses table. Domain trumps user here.
    domain = this.checkEmailForwardersForDomain(email);
    if (domain !== false) {
      return domain;
    }

    // Try to set it from the user record.
    if (userRecord !== false) {
      if (userRecord.company != '') {
        if (userRecord.company.sys_domain != '' && userRecord.company.sys_domain.toString().indexOf('global') != 0) {
          return userRecord.company.sys_domain;
        }
      } else if (userRecord.sys_domain != '' && userRecord.sys_domain.toString().indexOf('global') != 0) {
        return userRecord.sys_domain;
      }
    }

    // If it was forwarded, try to set it by the original sender's email address.
    if (wasForwarded && email.body.from !== false) {
      domain = this.emailAddressToDomain(email.body.from);
      if (domain != '') {
        return domain;
      }
    }

    // Try to set it by the from address
    domain = this.emailAddressToDomain(email.origemail);
    if (domain != '') {
      return domain;
    }

    // Check the Received:From in the email header and try to set the domain.
    header = email.headers;
    header = header.substring(header.lastIndexOf('Received:from') + 14, header.indexOf('(', header.lastIndexOf('Received:from') + 14) - 1).toLowerCase();
    actDom = new GlideRecord('u_email_routing');
    actDom.addQuery('u_type', 'email_suffix');
    actDom.addQuery('u_active', true);
    actDom.queryNoDomain();
    while (actDom.next()) {
      suffix = actDom.u_value.toString().toLowerCase();
      if (header.indexOf(suffix) >= 0) {
        return actDom.sys_domain;
      }
    }

    // Check the "To" field to see if that's a company we recognize
    rArray = email.recipients;
    for (i = 0; i < rArray.length; i++) {
      domain = this.emailAddressToDomain(rArray[i]);
      if (domain != '') {
        return domain;
      }
    }

    // If we've gotten to this point, we couldn't determine a domain, so we default to Primary Company's Domain
    findMSP = new GlideRecord('core_company');
    findMSP.addQuery('primary', true);
    findMSP.addQuery('active', true);
    findMSP.setLimit(1);
    findMSP.queryNoDomain();
    if (findMSP.next()) {
      return findMSP.sys_domain;
    }

    // If we got here, there is no primary company specified, which is a configuration error.
    // We'll try one more thing -- finding the first domain we see listed as "MSP" type.
    findMSP = new GlideRecord('sys_domain');
    findMSP.addQuery('type', 'MSP');
    findMSP.addQuery('active', true);
    findMSP.setLimit(1);
    findMSP.queryNoDomain();
    if (findMSP.next()) {
      return findMSP.sys_id;
    }

    // Should never get here.
    return false;
  },

  checkEmailForwardersForCompany: function(email) {
    var result = this.checkEmailForwarders(email);
    if (result !== false) {
      return result.u_company.toString();
    }
    return false;
  },

  checkEmailForwardersForDomain: function(email) {
    var result = this.checkEmailForwarders(email);
    if (result !== false) {
      return result.sys_domain.toString();
    }
    return false;
  },

  checkEmailForwarders: function(email) {
    var i;
    var rArray;
    var forwarders;
    var fwEmail;
    var header;

    // Check the Forwarding Email Addresses table. Domain trumps user here.
    forwarders = new GlideRecord('u_email_routing');
    forwarders.addQuery('u_type', 'email_forwarder');
    forwarders.addQuery('u_active', true);
    forwarders.queryNoDomain();
    rArray = email.recipients;
    while (forwarders.next()) {
      fwEmail = forwarders.u_value.toString().toLowerCase();
      for (i = 0; i < rArray.length; i++) {
        if (fwEmail == rArray[i]) {
          return forwarders;
        }
      }
    }

    header = email.headers;

    forwarders = new GlideRecord('u_email_routing');
    forwarders.addQuery('u_type', 'email_forwarder');
    forwarders.addQuery('u_active', true);
    forwarders.queryNoDomain();
    while (forwarders.next()) {
      fwEmail = forwarders.u_value.toString();
      if (header.indexOf(fwEmail) >= 0 || header.indexOf(fwEmail.toLowerCase()) >= 0) {
        return forwarders;
      }
    }
    return false;
  },

  emailAddressToDomain: function(emailAddress) {
    emailAddress = '@' + emailAddress.substring(emailAddress.indexOf('@') + 1, emailAddress.length);
    return this.getEmailSuffix(emailAddress);
  },

  getEmailSuffix: function(emailDomain) {
    var dom = '';
    var emailRouting = new GlideRecord('u_email_routing');
    emailRouting.addQuery('u_type', 'email_suffix');
    emailRouting.addQuery('u_email_suffix', emailDomain);
    emailRouting.addQuery('u_active', true);
    emailRouting.query();
    if (emailRouting.next()) {
      dom = emailRouting.sys_domain;
    }
    return dom;
  },

  findCompany: function(userRecord, email, domainID) {
    if (userRecord !== false && userRecord.company != '') {
      return userRecord.company.sys_id;
    }

    var company;

    if (typeof email.body.company != 'undefined' && email.body.company != undefined) {
      company = new GlideRecord('core_company');
      company.addQuery('name', 'CONTAINS', email.body.company);
      company.addQuery('customer', true);
      company.addQuery('active', true);
      company.setLimit(1);
      company.queryNoDomain();
      if (company.next()) {
        return company.sys_id;
      }
    }

    // Check the Forwarding Email Addresses table. Domain trumps user here.
    company = this.checkEmailForwardersForCompany(email);
    if (company !== false) {
      return company;
    }

    // Check suffixes
    var suffix = '@' + email.substring(email.indexOf('@') + 1, email.length);
    var extraEmails = new GlideRecord('u_email_routing');
    extraEmails.addQuery('u_type', 'email_suffix');
    extraEmails.addQuery('u_value', suffix);
    extraEmails.addQuery('u_active', true);
    extraEmails.setLimit(1);
    extraEmails.queryNoDomain();
    if (extraEmails.next()) {
      return extraEmails.u_company.toString();
    }

    company = new GlideRecord('core_company');
    company.addQuery('sys_domain', domainID);
    company.addQuery('customer', 'true');
    company.addQuery('active', true);
    company.setLimit(1);
    company.queryNoDomain();
    if (company.next()) {
      return company.sys_id;
    }

    // Should never get here if functions are called in proper order.
    return false;
  },

  getEmailDetails: function(email) {
    var emailDescription = '';

    emailDescription += 'From Address:   ' + email.origemail + '\n';
    emailDescription += 'To Address(es): ' + email.direct + '\n';
    emailDescription += 'Cc Address(es): ' + email.copied + '\n';
    if (email.body.from !== false) {
      emailDescription += 'Possible From Address:  ' + email.body.from + '\n';
    }

    return emailDescription;
  },

  setEmailDetails: function(email) {
    var emailDescription;
    // var priority;
    current.comments = 'Received From: ' + email.origemail;

    emailDescription = this.getEmailDetails(email);

    // current.contact_type = "email";
    current.short_description = email.subject;
    current.description = email.body_text + '\n\n' + emailDescription;
  },

  type: 'DomainEmailHelper'
};
