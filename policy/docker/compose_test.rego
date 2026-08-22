package main_test

import data.main.deny
import rego.v1

test_minimal_compose_passes if {
  count(deny with input as {
    "services": {
      "api": {
        "image": "example/api:1"
      }
    }
  }) == 0
}

test_privileged_is_rejected if {
  count(deny with input as {
    "services": {
      "api": {
        "privileged": true
      }
    }
  }) == 1
}

test_host_network_is_rejected if {
  count(deny with input as {
    "services": {
      "api": {
        "network_mode": "host"
      }
    }
  }) == 1
}

test_docker_socket_is_rejected if {
  count(deny with input as {
    "services": {
      "api": {
        "volumes": ["/var/run/docker.sock:/var/run/docker.sock"]
      }
    }
  }) == 1
}

test_dangerous_capability_is_rejected if {
  count(deny with input as {
    "services": {
      "api": {
        "cap_add": ["SYS_ADMIN"]
      }
    }
  }) == 1
}
