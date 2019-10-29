/* eslint-disable no-unused-vars */
/* globals previous */
(function executeRule(current, previous /* null when async */) {
  if (current.active) {
    return;
  }

  var routing = new GlideRecord('u_email_routing');
  routing.addQuery('sys_domain', current.sys_id.toString());
  routing.queryNoDomain();
  while (routing.next()) {
    if (current.active.changes() && !current.active) {
      routing.u_active = false;
    }
    routing.update();
  }
})(current, previous);
