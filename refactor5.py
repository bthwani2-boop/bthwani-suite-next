import os
import re

def refactor_missed():
    def refactor_file(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Regex for tx.Exec(`...UPDATE wlt_wallets...`); err != nil {
        pattern1 = re.compile(
            r'([ \t]*)if _, err := tx\.Exec\([^)]*\bUPDATE wlt_wallets\b.*?\)[\s\n]*;[\s\n]*err != nil\s*\{.*?return.*?\n[ \t]*\}',
            re.DOTALL
        )
        
        # Regex for result, updateErr := tx.ExecContext(...)
        pattern2 = re.compile(
            r'([ \t]*)result,\s*updateErr\s*:=\s*tx\.ExecContext\(.*?\bUPDATE wlt_wallets\b.*?\)\s*\n\s*if updateErr != nil\s*\{.*?return.*?\n[ \t]*\}',
            re.DOTALL
        )

        def replacer1(match):
            indent = match.group(1)
            return f"{indent}if false {{\n{indent}\t// removed wlt_wallets update\n{indent}}}"

        def replacer2(match):
            indent = match.group(1)
            return f"{indent}result, updateErr := (sql.Result)(nil), error(nil)\n{indent}// removed wlt_wallets update"

        new_content = pattern1.sub(replacer1, content)
        new_content = pattern2.sub(replacer2, new_content)

        if new_content != content:
            print(f"Refactored {filepath}")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
        else:
            if 'UPDATE wlt_wallets' in content:
                print(f"WARNING: Missed UPDATE wlt_wallets in {filepath}")

    root = r"c:\bthwani-suite-next\services\wlt\backend\internal"
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith(".go"):
                refactor_file(os.path.join(dirpath, filename))

refactor_missed()
