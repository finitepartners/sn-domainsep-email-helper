# Domain Email Helper

![Alt](docs/img/finite-logo-75.png 'Finite Logo')

## Summary

In Domain Separated instances, the need often arises to create tasks from emails sent in by individuals that aren't users in the system. This provides a challenge, as there's no out of box solution for routing these emails into the correct client companies and domains.

This utility update set provides a custom table intended to help with routing inbound emails to the proper company and domain.

It gracefully handles scenarios where the individual user cannot be found based on the "from" email address.

Provides for:

1.       Email Suffixes

a. @disney.com" would go to the Disney domain.

2.       Email Forwarders

a. Every email sent to helpdesk@pepsi.com, (whichforwarded the email into the system) would properly go Pepsi domain

3.       Email Addresses

a. If a user has 5 email addresses they use you canlist them out so that the system properly identifies the user record for all 5email addresses.

## Quick Start

- Prerequsites: _none_

1.  Download and install update set from [ServiceNow Share](https://developer.servicenow.com/app.do#!/share/contents/9326002_domain_email_helper?t=PRODUCT_DETAILS)
    Setup Instructions:

2.       Add Email Routing -> Company related list toCompany table (if desired).

3.       Add Email Routing -> User related list toUser table (if desired).

4.       Add Email Routing -> Domain related list tothe Domain table (if desired).

5.       Find Inbound Action "Example Inbound Action- New Incident", and make your Inbound Actions perform similarly.

a. NOTE: The order these functions are called in*matters*.

                                                              i.     You want to find the user first and setcompany/domain from that if it's found.

                                                            ii.     Only if you don't find the user do you look forcompany/domain.

                                                          iii.     The Example Inbound Action does exactly this.

6.       Modify ACLs on Routing table (if desired).

a. Currently:

                                                              i.     Anyone can read

                                                            ii.     Only Admin can create/update/delete.

7.       Deactivate left hand nav module if you don'twant it (or move it if desired).

a. System Mailboxes - > Administration ->Email Routings

8.       Setup Email Routing rules.

a. System Mailboxes - > Administration ->Email Routings

##Test Plan
Tested thoroughly. Test Plan used:

· Sending in an email for email suffix.

· Sending in an email for email forwarder.

· Sending in an email for email address.

· Changing domain of company and updating therouting domain.

· Deactivating a company and updating the routingactive flag.

· Deactivating a domain and updating the routingactive flag.

· Deactivating a user and updating the routingactive flag.

· Updating a user's company and updating therouting company field and then domain.

· Deleting a company, deleting routing record.

· Deleting a user, deleting routing record.

## Contribute

Submit enhancements/defects via this repo's [Issues](../../issues)

## Credit

[Garrett Griffin-Morales](https://github.com/garrett-griffin)
