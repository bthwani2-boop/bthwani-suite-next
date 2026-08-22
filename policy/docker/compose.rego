package main

import rego.v1

deny contains msg if {
  some name, service in input.services
  service.privileged == true
  msg := sprintf("service %q must not run privileged", [name])
}

deny contains msg if {
  some name, service in input.services
  service.network_mode == "host"
  msg := sprintf("service %q must not use host networking", [name])
}

deny contains msg if {
  some name, service in input.services
  service.pid == "host"
  msg := sprintf("service %q must not use the host PID namespace", [name])
}

deny contains msg if {
  some name, service in input.services
  service.ipc == "host"
  msg := sprintf("service %q must not use the host IPC namespace", [name])
}

deny contains msg if {
  some name, service in input.services
  some volume in object.get(service, "volumes", [])
  is_string(volume)
  contains(lower(volume), "/var/run/docker.sock")
  msg := sprintf("service %q must not mount the Docker daemon socket", [name])
}

deny contains msg if {
  some name, service in input.services
  some capability in object.get(service, "cap_add", [])
  upper(capability) == "ALL"
  msg := sprintf("service %q must not add Linux capability ALL", [name])
}

deny contains msg if {
  some name, service in input.services
  some capability in object.get(service, "cap_add", [])
  upper(capability) == "SYS_ADMIN"
  msg := sprintf("service %q must not add Linux capability SYS_ADMIN", [name])
}
