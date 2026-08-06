import os
import re

def refactor_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern to match ANY query string containing UPDATE wlt_wallets
    # We will replace the entire query string with "SELECT 1"
    
    # Match backtick strings
    pattern1 = re.compile(r'`[^`]*\bUPDATE wlt_wallets\b[^`]*`', re.IGNORECASE)
    # Match double-quote strings
    pattern2 = re.compile(r'"[^"]*\bUPDATE wlt_wallets\b[^"]*"', re.IGNORECASE)

    new_content = pattern1.sub('`SELECT 1`', content)
    new_content = pattern2.sub('"SELECT 1"', new_content)

    if new_content != content:
        print(f"Refactored {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
    else:
        if 'UPDATE wlt_wallets' in content:
            print(f"WARNING: Missed UPDATE wlt_wallets in {filepath}")

def main():
    root = r"c:\bthwani-suite-next\services\wlt\backend\internal"
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith(".go"):
                refactor_file(os.path.join(dirpath, filename))

if __name__ == "__main__":
    main()
