/* eslint-disable no-unused-vars */
/* globals previous */
(function executeRule(current, previous /* null when async */) {
  if (!current.company.changes() && current.active) {
    return;
  }

  var routing = new GlideRecord('u_email_routing');
  routing.addQuery('u_user', current.sys_id.toString());
  routing.queryNoDomain();
  while (routing.next()) {
    if (current.company.changes()) {
      routing.u_company = current.company.toString();
    }
    if (current.active.changes() && !current.active) {
      routing.u_active = false;
    }
    routing.update();
  }
})(current, previous);
