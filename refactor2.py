import os
import re

def fix_args(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find `tx.ExecContext(ctx, "SELECT 1", arg1, arg2...)`
    # or finalTx.ExecContext(ctx, `SELECT 1`, arg1, arg2...)
    # We will replace `tx.ExecContext(` or `finalTx.ExecContext(` 
    # if it's followed by context, and "SELECT 1" or `SELECT 1`
    
    # We'll just replace `tx.ExecContext(` with `func(...any) (sql.Result, error) { return nil, nil }(`
    # But ONLY for the ones that have "SELECT 1" or `SELECT 1`.
    
    # Let's use a simpler approach. Restore the files first from git!
    pass

def restore_and_refactor():
    os.system('git checkout c:\\bthwani-suite-next\\services\\wlt\\backend\\internal')

    def refactor_file(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # We will match the entire statement:
        # result, err := tx.ExecContext(...) OR _, err = tx.ExecContext(...)
        
        # Match from `err` to the end of the `if err != nil` block
        # We need to capture the variable names before `, err` if they exist.
        
        pattern = re.compile(
            r'([ \t]*)((?:\w+,\s*)?err\s*(?::?=|=)\s*(?:\w+\.)?ExecContext\([^)]*\bUPDATE wlt_wallets\b[^)]*\)\s*\n\s*if err != nil\s*\{[^}]*return[^\n]*\n\s*\})',
            re.DOTALL
        )
        
        def replacer(match):
            indent = match.group(1)
            original = match.group(2)
            # If it starts with `result, err :=`, we should just do `result, err := nil, error(nil)`
            if original.startswith('err =') or original.startswith('err :='):
                return f"{indent}err = nil\n{indent}// removed wlt_wallets update"
            elif ':= ' in original.split('ExecContext')[0]:
                var_name = original.split(',')[0].strip()
                return f"{indent}{var_name}, err := (sql.Result)(nil), error(nil)\n{indent}// removed wlt_wallets update"
            else:
                var_name = original.split(',')[0].strip()
                return f"{indent}{var_name}, err = nil, nil\n{indent}// removed wlt_wallets update"

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
