#!/usr/bin/env bash
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" != "true" ]]; then
  echo "ERROR: security tool installation is Remote-only and must run on a GitHub Actions runner." >&2
  exit 1
fi

MODE="${1:-governance}"
SELECTED_TOOL="${2:-all}"

readonly ACTIONLINT_VERSION="v1.7.12"
readonly PINACT_VERSION="v0.1.2"
readonly ZIZMOR_VERSION="1.28.0"
readonly REGAL_VERSION="v0.25.0"
readonly CONFTEST_VERSION="v0.55.0"
readonly HADOLINT_VERSION="v2.12.0"
readonly GITLEAKS_VERSION="v8.23.0"
readonly OSV_SCANNER_VERSION="v2.4.0"
readonly SEMGREP_VERSION="1.172.0"

echo "Installing locked OSS toolchain binaries for mode=${MODE} tool=${SELECTED_TOOL}"

matches_tool() {
  [[ "${SELECTED_TOOL}" == "all" || "${SELECTED_TOOL}" == "$1" ]]
}

require_go() {
  if ! command -v go >/dev/null 2>&1; then
    echo "ERROR: go is required to install Go-based tools in this workflow image." >&2
    echo "Do not change the project Go version here; configure setup-go in the workflow if Go is unavailable." >&2
    exit 1
  fi
}

install_osv_scanner() {
  require_go
  go install "github.com/google/osv-scanner/v2/cmd/osv-scanner@${OSV_SCANNER_VERSION}"
  echo "$HOME/go/bin" >> "$GITHUB_PATH"
  export PATH="$HOME/go/bin:$PATH"
}

install_actionlint() {
  require_go
  go install "github.com/rhysd/actionlint/cmd/actionlint@${ACTIONLINT_VERSION}"
  echo "$HOME/go/bin" >> "$GITHUB_PATH"
  export PATH="$HOME/go/bin:$PATH"
}

install_pinact() {
  require_go
  go install "github.com/suzuki-shunsuke/pinact/cmd/pinact@${PINACT_VERSION}"
  echo "$HOME/go/bin" >> "$GITHUB_PATH"
  export PATH="$HOME/go/bin:$PATH"
}

install_github_action_go_tools() {
  install_actionlint
  install_pinact
}

install_hadolint() {
  if command -v hadolint >/dev/null 2>&1; then return 0; fi
  sudo curl -fsSL -o /usr/local/bin/hadolint "https://github.com/hadolint/hadolint/releases/download/${HADOLINT_VERSION}/hadolint-Linux-x86_64"
  sudo chmod +x /usr/local/bin/hadolint
}

install_regal() {
  if command -v regal >/dev/null 2>&1; then return 0; fi
  curl -fsSL -o regal "https://github.com/open-policy-agent/regal/releases/download/${REGAL_VERSION}/regal_Linux_x86_64"
  chmod +x regal
  sudo mv regal /usr/local/bin/
}

install_conftest() {
  if command -v conftest >/dev/null 2>&1; then return 0; fi
  local archive="conftest_${CONFTEST_VERSION#v}_Linux_x86_64.tar.gz"
  curl -fsSL -O "https://github.com/open-policy-agent/conftest/releases/download/${CONFTEST_VERSION}/${archive}"
  tar -zxf "$archive"
  sudo mv conftest /usr/local/bin/
}

install_gitleaks() {
  if command -v gitleaks >/dev/null 2>&1; then return 0; fi
  local archive="gitleaks_${GITLEAKS_VERSION#v}_linux_x64.tar.gz"
  curl -fsSL -O "https://github.com/gitleaks/gitleaks/releases/download/${GITLEAKS_VERSION}/${archive}"
  tar -zxf "$archive"
  sudo mv gitleaks /usr/local/bin/
}

install_trivy() {
  if command -v trivy >/dev/null 2>&1; then return 0; fi
  local version="0.72.0"
  local archive="trivy_${version}_Linux-64bit.tar.gz"
  local checksums="trivy_${version}_checksums.txt"
  local base_url="https://github.com/aquasecurity/trivy/releases/download/v${version}"
  curl -fsSLO "${base_url}/${archive}"
  curl -fsSLO "${base_url}/${checksums}"
  grep " ${archive}$" "${checksums}" | sha256sum --check -
  tar -zxf "${archive}" trivy
  sudo mv trivy /usr/local/bin/trivy
  sudo chmod +x /usr/local/bin/trivy
}

install_zizmor() {
  python3 -m pip install --user --disable-pip-version-check "zizmor==${ZIZMOR_VERSION}"
  echo "$HOME/.local/bin" >> "$GITHUB_PATH"
  export PATH="$HOME/.local/bin:$PATH"
}

install_semgrep() {
  local venv="${RUNNER_TEMP}/bthwani-semgrep-${SEMGREP_VERSION}"
  python3 -m venv "${venv}"
  "${venv}/bin/python" -m pip install --disable-pip-version-check "semgrep==${SEMGREP_VERSION}"
  echo "${venv}/bin" >> "$GITHUB_PATH"
  export PATH="${venv}/bin:$PATH"
  semgrep --version
}

if [[ "${MODE}" == "governance" || "${MODE}" == "ci" ]]; then
  sudo apt-get update
  sudo apt-get install -y shellcheck yamllint python3-pip python3-venv
  install_hadolint
  install_osv_scanner
  install_github_action_go_tools
  install_regal
  install_zizmor
  install_conftest
fi

if [[ "${MODE}" == "security" ]]; then
  sudo apt-get update
  sudo apt-get install -y python3-pip python3-venv

  if matches_tool shellcheck; then sudo apt-get install -y shellcheck; fi
  if matches_tool yamllint; then sudo apt-get install -y yamllint; fi
  if matches_tool hadolint; then install_hadolint; fi
  if matches_tool trivy; then install_trivy; fi
  if matches_tool osv; then install_osv_scanner; fi
  if matches_tool gitleaks; then install_gitleaks; fi
  if matches_tool actionlint; then install_actionlint; fi
  if matches_tool pinact; then install_pinact; fi
  if matches_tool zizmor; then install_zizmor; fi
  if matches_tool semgrep; then install_semgrep; fi
fi

echo "Locked OSS toolchain binary installation completed."
