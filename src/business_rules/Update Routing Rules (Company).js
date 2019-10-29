/* eslint-disable no-unused-vars */
/* globals previous */
(function executeRule(current, previous /* null when async */) {
  if (!current.sys_domain.changes() && current.active) {
    return;
  }

  var routing = new GlideRecord('u_email_routing');
  routing.addQuery('u_company', current.sys_id.toString());
  routing.queryNoDomain();
  while (routing.next()) {
    if (current.sys_domain.changes()) {
      routing.sys_domain = current.sys_domain.toString();
    }
    if (current.active.changes() && !current.active) {
      routing.u_active = false;
    }
    routing.update();
  }
})(current, previous);
