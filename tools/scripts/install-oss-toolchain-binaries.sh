#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-governance}"

echo "Installing OSS toolchain binaries for mode: ${MODE}"

install_common_go_tools() {
  if ! command -v go >/dev/null 2>&1; then
    echo "ERROR: go is required to install go-based tools in this workflow image." >&2
    echo "Do not change project go-version here; add setup-go in the workflow if the image lacks go." >&2
    exit 1
  fi

  go install github.com/google/osv-scanner/cmd/osv-scanner@v1.9.0
  go install github.com/rhysd/actionlint/cmd/actionlint@latest
  go install github.com/suzuki-shunsuke/pinact/cmd/pinact@v0.1.2
  echo "$HOME/go/bin" >> "$GITHUB_PATH"
  export PATH="$HOME/go/bin:$PATH"
}

install_hadolint() {
  if command -v hadolint >/dev/null 2>&1; then return 0; fi
  sudo curl -fsSL -o /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64
  sudo chmod +x /usr/local/bin/hadolint
}

install_regal() {
  if command -v regal >/dev/null 2>&1; then return 0; fi
  curl -fsSL -o regal https://github.com/open-policy-agent/regal/releases/download/v0.25.0/regal_Linux_x86_64
  chmod +x regal
  sudo mv regal /usr/local/bin/
}

install_conftest() {
  if command -v conftest >/dev/null 2>&1; then return 0; fi
  curl -fsSL -O https://github.com/open-policy-agent/conftest/releases/download/v0.55.0/conftest_0.55.0_Linux_x86_64.tar.gz
  tar -zxf conftest_0.55.0_Linux_x86_64.tar.gz
  sudo mv conftest /usr/local/bin/
}

install_gitleaks() {
  if command -v gitleaks >/dev/null 2>&1; then return 0; fi
  curl -fsSL -O https://github.com/gitleaks/gitleaks/releases/download/v8.23.0/gitleaks_8.23.0_linux_x64.tar.gz
  tar -zxf gitleaks_8.23.0_linux_x64.tar.gz
  sudo mv gitleaks /usr/local/bin/
}

install_trivy() {
  if command -v trivy >/dev/null 2>&1; then return 0; fi
  curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.50.1
}

if [[ "${MODE}" == "governance" || "${MODE}" == "ci" ]]; then
  sudo apt-get update
  sudo apt-get install -y shellcheck yamllint python3-pip
  install_hadolint
  install_common_go_tools
  install_regal
  python3 -m pip install --user zizmor
  echo "$HOME/.local/bin" >> "$GITHUB_PATH"
  install_conftest
fi

if [[ "${MODE}" == "security" ]]; then
  install_trivy
  install_common_go_tools
  install_gitleaks
fi

echo "OSS toolchain binary installation completed."
