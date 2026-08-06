import os
import re

def restore_and_refactor():
    os.system('git checkout c:\\bthwani-suite-next\\services\\wlt\\backend\\internal')

    def refactor_file(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Regex:
        # 1. Indentation
        # 2. `_, err = tx.ExecContext(r.Context(), "UPDATE wlt_wallets...", arg...)`
        # 3. `if err != nil { ... return ... }`
        
        pattern = re.compile(
            r'([ \t]*)((?:[\w_]+,\s*)?err\s*(?::?=|=)\s*(?:\w+\.)?ExecContext\(.*?\bUPDATE wlt_wallets\b.*?\)\s*\n\s*if err != nil\s*\{.*?return.*?\n[ \t]*\})',
            re.DOTALL
        )
        
        def replacer(match):
            indent = match.group(1)
            original = match.group(2)
            
            # extract var name if exists
            first_part = original.split('err', 1)[0].strip()
            if first_part.endswith(','):
                var_name = first_part[:-1].strip()
                if ':=' in original.split('ExecContext')[0]:
                    return f"{indent}{var_name}, err := (sql.Result)(nil), error(nil)\n{indent}// removed wlt_wallets update"
                else:
                    return f"{indent}{var_name}, err = nil, nil\n{indent}// removed wlt_wallets update"
            else:
                if ':=' in original.split('ExecContext')[0]:
                    return f"{indent}err := error(nil)\n{indent}// removed wlt_wallets update"
                else:
                    return f"{indent}err = nil\n{indent}// removed wlt_wallets update"

        new_content = pattern.sub(replacer, content)

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

restore_and_refactor()
