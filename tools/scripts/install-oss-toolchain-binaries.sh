#!/usr/bin/env bash
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" != "true" ]]; then
  echo "ERROR: security tool installation is Remote-only and must run on a GitHub Actions runner." >&2
  exit 1
fi

MODE="${1:-governance}"
SELECTED_TOOL="${2:-all}"

readonly ACTIONLINT_VERSION="v1.7.12"
readonly PINACT_VERSION="v4.1.0"
readonly PINACT_LINUX_AMD64_SHA256="8fcbf1b3e95551c82fd995535e3c1defa70e23299ce36eb3afd6c98778de6ca0"
readonly ZIZMOR_VERSION="1.28.0"
readonly REGAL_VERSION="v0.42.0"
readonly CONFTEST_VERSION="v0.68.2"
readonly HADOLINT_VERSION="v2.12.0"
readonly GITLEAKS_VERSION="v8.23.0"
readonly OSV_SCANNER_VERSION="v2.4.0"
readonly TRIVY_VERSION="0.74.0"

echo "Installing locked OSS toolchain binaries for mode=${MODE} tool=${SELECTED_TOOL}"

matches_tool() {
  [[ "${SELECTED_TOOL}" == "all" || "${SELECTED_TOOL}" == "$1" ]]
}

require_go() {
  command -v go >/dev/null 2>&1 || {
    echo "ERROR: Go is required for this selected remote analyzer." >&2
    exit 1
  }
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
  command -v pinact >/dev/null 2>&1 && return 0
  local archive="pinact_linux_amd64.tar.gz"
  local url="https://github.com/suzuki-shunsuke/pinact/releases/download/${PINACT_VERSION}/${archive}"
  curl -fsSL -o "${archive}" "${url}"
  echo "${PINACT_LINUX_AMD64_SHA256}  ${archive}" | sha256sum --check -
  tar -zxf "${archive}" pinact
  sudo mv pinact /usr/local/bin/pinact
  sudo chmod +x /usr/local/bin/pinact
  pinact --version
}

install_hadolint() {
  command -v hadolint >/dev/null 2>&1 && return 0
  sudo curl -fsSL -o /usr/local/bin/hadolint \
    "https://github.com/hadolint/hadolint/releases/download/${HADOLINT_VERSION}/hadolint-Linux-x86_64"
  sudo chmod +x /usr/local/bin/hadolint
}

install_regal() {
  command -v regal >/dev/null 2>&1 && return 0
  require_go
  GOBIN="${RUNNER_TEMP}/bthwani-tools/bin" go install "github.com/open-policy-agent/regal@${REGAL_VERSION}"
  sudo install -m 0755 "${RUNNER_TEMP}/bthwani-tools/bin/regal" /usr/local/bin/regal
  regal version
}

install_conftest() {
  command -v conftest >/dev/null 2>&1 && return 0
  local version="${CONFTEST_VERSION#v}"
  local archive="conftest_${version}_Linux_x86_64.tar.gz"
  local checksums="conftest-${version}-checksums.txt"
  local base_url="https://github.com/open-policy-agent/conftest/releases/download/${CONFTEST_VERSION}"
  curl -fsSL -o "${archive}" "${base_url}/${archive}"
  curl -fsSL -o "${checksums}" "${base_url}/checksums.txt"
  grep " ${archive}$" "${checksums}" | sha256sum --check -
  tar -zxf "${archive}" conftest
  sudo mv conftest /usr/local/bin/conftest
  sudo chmod +x /usr/local/bin/conftest
  conftest --version
}

install_gitleaks() {
  command -v gitleaks >/dev/null 2>&1 && return 0
  local archive="gitleaks_${GITLEAKS_VERSION#v}_linux_x64.tar.gz"
  curl -fsSLO "https://github.com/gitleaks/gitleaks/releases/download/${GITLEAKS_VERSION}/${archive}"
  tar -zxf "${archive}" gitleaks
  sudo mv gitleaks /usr/local/bin/gitleaks
  sudo chmod +x /usr/local/bin/gitleaks
}

install_trivy() {
  command -v trivy >/dev/null 2>&1 && return 0
  local archive="trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz"
  local checksums="trivy_${TRIVY_VERSION}_checksums.txt"
  local base_url="https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}"
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

install_apt_tools() {
  local packages=()
  matches_tool shellcheck && packages+=(shellcheck)
  matches_tool yamllint && packages+=(yamllint)
  if ((${#packages[@]})); then
    sudo apt-get update
    sudo apt-get install -y "${packages[@]}"
  fi
}

if [[ "${MODE}" == "governance" || "${MODE}" == "ci" ]]; then
  SELECTED_TOOL="all"
  sudo apt-get update
  sudo apt-get install -y shellcheck yamllint python3-pip
  install_hadolint
  install_osv_scanner
  install_actionlint
  install_pinact
  install_regal
  install_zizmor
  install_conftest
elif [[ "${MODE}" == "security" ]]; then
  sudo apt-get update
  sudo apt-get install -y python3-pip
  install_apt_tools
  matches_tool hadolint && install_hadolint
  matches_tool trivy && install_trivy
  matches_tool osv && install_osv_scanner
  matches_tool gitleaks && install_gitleaks
  matches_tool actionlint && install_actionlint
  matches_tool pinact && install_pinact
  matches_tool zizmor && install_zizmor
  matches_tool regal && install_regal
  matches_tool conftest && install_conftest
else
  echo "ERROR: unsupported toolchain mode '${MODE}'." >&2
  exit 1
fi

echo "Locked OSS toolchain binary installation completed."
