#!/usr/bin/env bash
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" != "true" ]]; then
  echo "ERROR: security tool installation is Remote-only and must run on a GitHub Actions runner." >&2
  exit 1
fi

MODE="${1:-governance}"

readonly ACTIONLINT_VERSION="v1.7.12"
readonly PINACT_VERSION="v0.1.2"
readonly ZIZMOR_VERSION="1.28.0"
readonly REGAL_VERSION="v0.25.0"
readonly CONFTEST_VERSION="v0.55.0"
readonly HADOLINT_VERSION="v2.12.0"
readonly GITLEAKS_VERSION="v8.23.0"
readonly OSV_SCANNER_VERSION="v2.4.0"

echo "Installing locked OSS toolchain binaries for mode: ${MODE}"

require_go() {
  if ! command -v go >/dev/null 2>&1; then
    echo "ERROR: go is required to install Go-based tools in this workflow image." >&2
    echo "Do not change the project Go version here; configure setup-go in the workflow if Go is unavailable." >&2
    exit 1
  fi
}

apt_install() {
  sudo apt-get update -qq
  sudo apt-get install -y -qq "$@"
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
  apt_install python3-pip
  python3 -m pip install --user "zizmor==${ZIZMOR_VERSION}"
  echo "$HOME/.local/bin" >> "$GITHUB_PATH"
  export PATH="$HOME/.local/bin:$PATH"
}

if [[ "${MODE}" == "governance" || "${MODE}" == "ci" ]]; then
  apt_install shellcheck yamllint python3-pip
  install_hadolint
  install_osv_scanner
  install_github_action_go_tools
  install_regal
  python3 -m pip install --user "zizmor==${ZIZMOR_VERSION}"
  echo "$HOME/.local/bin" >> "$GITHUB_PATH"
  install_conftest
elif [[ "${MODE}" == "security" ]]; then
  apt_install shellcheck yamllint python3-pip
  install_hadolint
  install_trivy
  install_osv_scanner
  install_gitleaks
  python3 -m pip install --user "zizmor==${ZIZMOR_VERSION}"
  echo "$HOME/.local/bin" >> "$GITHUB_PATH"
elif [[ "${MODE}" == security:* ]]; then
  analyzer="${MODE#security:}"
  case "${analyzer}" in
    gitleaks) install_gitleaks ;;
    osv-scanner) install_osv_scanner ;;
    trivy) install_trivy ;;
    actionlint) install_actionlint ;;
    zizmor) install_zizmor ;;
    pinact) install_pinact ;;
    shellcheck) apt_install shellcheck ;;
    hadolint) install_hadolint ;;
    yamllint) apt_install yamllint ;;
    *)
      echo "ERROR: unknown security analyzer mode: ${analyzer}" >&2
      exit 1
      ;;
  esac
else
  echo "ERROR: unknown OSS toolchain mode: ${MODE}" >&2
  exit 1
fi

echo "Locked OSS toolchain binary installation completed."