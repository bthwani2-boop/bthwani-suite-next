package workforce

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"
)

// TestAuditAtomicityASTGuard enforces the workforce-027 invariant SEMANTICALLY
// on the Go AST (no substring pseudo-matching):
//
//  1. SINGLE_AUDIT_WRITER — the workforce_action_audit table may only be
//     referenced by the canonical governed write boundary (txunit.go) and the
//     pre-existing self-contained transactional unit (journey003_documents.go).
//  2. NO_LEGACY_AUDIT_API — Repository.RecordAudit (the superseded
//     post-commit audit path) must not be called anywhere.
//  3. NO_DISCARDED_GOVERNED_RESULT — the governed helpers
//     (StoreIdempotentResponse, storeIdempotentResponseTx, recordAuditTx,
//     GovernedWrite) may never be blank-discarded or dropped.
//  4. WORKERS_ONLY_IN_GOVERNED_UNIT — the tx-scoped mutation/audit workers
//     may only be invoked inside a FuncLit (the GovernedWrite closure).
//  5. NO_RAW_TX_IN_SERVICE_LAYER — service.go and sovereign_leadership.go may
//     never manage transactions or execute SQL directly.
//
// TestAuditAtomicityGuardDetectsNegativeFixtures proves this checker actually
// fires on each forbidden pattern (anti false-green).

var auditTableWriterAllowlist = map[string]bool{
	"txunit.go":               true,
	"journey003_documents.go": true,
}

var governedHelperNames = map[string]bool{
	"StoreIdempotentResponse":   true,
	"storeIdempotentResponseTx": true,
	"recordAuditTx":             true,
	"GovernedWrite":             true,
}

var governedWorkerNames = map[string]bool{
	"createPersonTx": true, "createCaptainTx": true, "createEmployeeTx": true,
	"updatePersonTx": true, "updateCaptainTx": true, "updateEmployeeTx": true,
	"updateSelfTx": true, "setEngagementStatusTx": true,
	"upsertEmployeeGovernanceTx": true, "upsertSovereignAssignmentTx": true,
	"personByActorIDTx": true, "recordAuditTx": true, "storeIdempotentResponseTx": true,
	"employeeGovernanceVersionTx": true, "sovereignAssignmentVersionTx": true,
	"insertLifecycleCommandTx": true, "markLifecycleCommandTx": true,
}

var serviceLayerFiles = map[string]bool{
	"service.go":              true,
	"sovereign_leadership.go": true,
}

// serviceLayerFiles is retained for documentation: the NO_RAW_TX rule is
// enforced structurally on Service receivers, not on file names.

type astViolation struct {
	file string
	line int
	rule string
	msg  string
}

type guardVisitor struct {
	fset      *token.FileSet
	base      string
	inFuncLit bool
	fnOwner   string // "service" | "repo" | ""
	out       *[]astViolation
}

func (v *guardVisitor) add(n ast.Node, rule, msg string) {
	pos := v.fset.Position(n.Pos())
	*v.out = append(*v.out, astViolation{file: v.base, line: pos.Line, rule: rule, msg: msg})
}

func calleeName(call *ast.CallExpr) string {
	switch fn := call.Fun.(type) {
	case *ast.Ident:
		return fn.Name
	case *ast.SelectorExpr:
		if fn.Sel != nil {
			return fn.Sel.Name
		}
	}
	return ""
}

func (v *guardVisitor) Visit(n ast.Node) ast.Visitor {
	if n == nil {
		return nil
	}
	switch node := n.(type) {
	case *ast.BasicLit:
		// Rule 1: single audit-table writer.
		if !auditTableWriterAllowlist[v.base] && node.Kind == token.STRING &&
			strings.Contains(node.Value, "workforce_action_audit") {
			v.add(n, "SINGLE_AUDIT_WRITER", "workforce_action_audit may only be referenced by the governed write boundary (txunit.go) or a pre-existing self-contained transactional unit")
		}
	case *ast.AssignStmt:
		blankLHS := false
		for _, l := range node.Lhs {
			if id, ok := l.(*ast.Ident); ok && id.Name == "_" {
				blankLHS = true
			}
		}
		if blankLHS && len(node.Rhs) == 1 {
			if call, ok := node.Rhs[0].(*ast.CallExpr); ok && governedHelperNames[calleeName(call)] {
				v.add(n, "NO_DISCARDED_GOVERNED_RESULT", fmt.Sprintf("governed helper %s result blank-discarded; failures must propagate", calleeName(call)))
			}
		}
	case *ast.ExprStmt:
		if call, ok := node.X.(*ast.CallExpr); ok {
			name := calleeName(call)
			if name == "recordAuditTx" || name == "storeIdempotentResponseTx" || name == "GovernedWrite" {
				v.add(n, "NO_DISCARDED_GOVERNED_RESULT", fmt.Sprintf("governed helper %s result dropped as bare statement", name))
			}
			if governedWorkerNames[name] && !v.inFuncLit && v.base != "txunit.go" {
				v.add(n, "WORKERS_ONLY_IN_GOVERNED_UNIT", fmt.Sprintf("tx worker %s called outside a GovernedWrite closure", name))
			}
		}
	case *ast.CallExpr:
		name := calleeName(node)
		// Rule 2: legacy post-commit audit API anywhere.
		if sel, ok := node.Fun.(*ast.SelectorExpr); ok && sel.Sel != nil && sel.Sel.Name == "RecordAudit" {
			v.add(n, "NO_LEGACY_AUDIT_API", "Repository.RecordAudit was superseded by recordAuditTx inside GovernedWrite; post-commit audit is forbidden")
		}
		// Rule 4: workers only inside a GovernedWrite closure.
		if governedWorkerNames[name] && !v.inFuncLit && v.base != "txunit.go" {
			v.add(n, "WORKERS_ONLY_IN_GOVERNED_UNIT", fmt.Sprintf("tx worker %s called outside a GovernedWrite closure", name))
		}
		// Rule 5: Service methods never manage transactions or SQL directly;
		// Repository methods own the data access.
		if v.fnOwner == "service" {
			if sel, ok := node.Fun.(*ast.SelectorExpr); ok {
				switch sel.Sel.Name {
				case "BeginTx", "Commit", "Rollback", "ExecContext", "QueryRowContext", "QueryContext":
					v.add(n, "NO_RAW_TX_IN_SERVICE_LAYER", fmt.Sprintf("service layer must not manage transactions or SQL directly (%s)", sel.Sel.Name))
				}
			}
		}
	}
	if fn, ok := n.(*ast.FuncDecl); ok {
		owner := ""
		if fn.Recv != nil && len(fn.Recv.List) > 0 {
			switch rt := fn.Recv.List[0].Type.(type) {
			case *ast.StarExpr:
				if id, ok := rt.X.(*ast.Ident); ok && id.Name == "Service" {
					owner = "service"
				} else if id, ok := rt.X.(*ast.Ident); ok && id.Name == "Repository" {
					owner = "repo"
				}
			case *ast.Ident:
				if rt.Name == "Service" {
					owner = "service"
				} else if rt.Name == "Repository" {
					owner = "repo"
				}
			}
		}
		return &guardVisitor{fset: v.fset, base: v.base, fnOwner: owner, out: v.out}
	}
	if _, ok := n.(*ast.FuncLit); ok {
		return &guardVisitor{fset: v.fset, base: v.base, inFuncLit: true, fnOwner: v.fnOwner, out: v.out}
	}
	return v
}

func auditAtomicityViolationsOf(path string) ([]astViolation, error) {
	src, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, src, parser.AllErrors)
	if err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}
	var violations []astViolation
	ast.Walk(&guardVisitor{fset: fset, base: filepath.Base(path), out: &violations}, file)
	return violations, nil
}

func TestAuditAtomicityASTGuard(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test source path")
	}
	dir := filepath.Dir(currentFile)
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	var violations []string
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		vs, err := auditAtomicityViolationsOf(filepath.Join(dir, name))
		if err != nil {
			t.Fatalf("scan %s: %v", name, err)
		}
		for _, v := range vs {
			violations = append(violations, fmt.Sprintf("%s:%d [%s] %s", v.file, v.line, v.rule, v.msg))
		}
	}
	if len(violations) > 0 {
		sort.Strings(violations)
		t.Fatalf("audit atomicity violations detected:\n%s", strings.Join(violations, "\n"))
	}
}

// TestAuditAtomicityGuardDetectsNegativeFixtures is the anti-false-green
// proof: each fixture contains a forbidden pattern, and the SAME checker used
// on production sources must flag it under the expected rule.
func TestAuditAtomicityGuardDetectsNegativeFixtures(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test source path")
	}
	fixtures := filepath.Join(filepath.Dir(currentFile), "testdata", "audit_guard_fixtures")
	expected := map[string]string{
		"violator_blank_discard.go":   "NO_DISCARDED_GOVERNED_RESULT",
		"violator_legacy_api.go":      "NO_LEGACY_AUDIT_API",
		"violator_raw_tx.go":          "NO_RAW_TX_IN_SERVICE_LAYER",
		"violator_audit_table.go":     "SINGLE_AUDIT_WRITER",
		"violator_floating_worker.go": "WORKERS_ONLY_IN_GOVERNED_UNIT",
	}
	for fixture, rule := range expected {
		vs, err := auditAtomicityViolationsOf(filepath.Join(fixtures, fixture))
		if err != nil {
			t.Fatalf("%s: %v", fixture, err)
		}
		found := false
		for _, v := range vs {
			if v.rule == rule {
				found = true
			}
		}
		if !found {
			t.Errorf("%s: checker failed to detect forbidden pattern (expected rule %s) — the guard would be false-green", fixture, rule)
		}
	}
}
