package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type Route struct {
	Method string `json:"method"`
	Path   string `json:"path"`
}

var governedRouteHelpers = map[string]struct{}{
	"public":            {},
	"read":              {},
	"mutation":          {},
	"workforceMutation": {},
	"providerMutation":  {},
}

func main() {
	entryPath := "services/dsh/backend/internal/http/server.go"
	if len(os.Args) > 1 {
		entryPath = os.Args[1]
	}

	files, err := routerPackageFiles(entryPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error discovering router package for %s: %v\n", entryPath, err)
		os.Exit(1)
	}

	seen := map[string]bool{}
	routes := []Route{}
	for _, filePath := range files {
		fileRoutes, err := parseRoutes(filePath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing file %s: %v\n", filePath, err)
			os.Exit(1)
		}
		for _, route := range fileRoutes {
			key := route.Method + " " + route.Path
			if seen[key] {
				continue
			}
			seen[key] = true
			routes = append(routes, route)
		}
	}

	sort.Slice(routes, func(i, j int) bool {
		if routes[i].Path == routes[j].Path {
			return routes[i].Method < routes[j].Method
		}
		return routes[i].Path < routes[j].Path
	})

	body, err := json.MarshalIndent(routes, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling JSON: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(string(body))
}

func routerPackageFiles(entryPath string) ([]string, error) {
	info, err := os.Stat(entryPath)
	if err != nil {
		return nil, err
	}
	directory := entryPath
	if !info.IsDir() {
		directory = filepath.Dir(entryPath)
	}
	entries, err := os.ReadDir(directory)
	if err != nil {
		return nil, err
	}
	files := []string{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		files = append(files, filepath.Join(directory, name))
	}
	sort.Strings(files)
	if len(files) == 0 {
		return nil, fmt.Errorf("no Go router files found in %s", directory)
	}
	return files, nil
}

func parseRoutes(filePath string) ([]Route, error) {
	fileSet := token.NewFileSet()
	node, err := parser.ParseFile(fileSet, filePath, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	routes := []Route{}
	ast.Inspect(node, func(node ast.Node) bool {
		call, ok := node.(*ast.CallExpr)
		if !ok || len(call.Args) < 1 || !isRouteRegistration(call.Fun) {
			return true
		}
		literal, ok := call.Args[0].(*ast.BasicLit)
		if !ok || literal.Kind != token.STRING {
			return true
		}
		routeValue, err := strconvUnquote(literal.Value)
		if err != nil {
			return true
		}
		parts := strings.Fields(routeValue)
		switch len(parts) {
		case 2:
			routes = append(routes, Route{Method: parts[0], Path: parts[1]})
		case 1:
			routes = append(routes, Route{Method: "", Path: parts[0]})
		}
		return true
	})
	return routes, nil
}

func isRouteRegistration(fun ast.Expr) bool {
	switch target := fun.(type) {
	case *ast.SelectorExpr:
		return target.Sel.Name == "HandleFunc" || target.Sel.Name == "Handle"
	case *ast.Ident:
		_, ok := governedRouteHelpers[target.Name]
		return ok
	default:
		return false
	}
}

// strconvUnquote handles both interpreted and raw Go string literals without
// accepting dynamically-computed route patterns. Keeping extraction literal-
// only is intentional: registered runtime routes must remain statically
// auditable by the binding gate.
func strconvUnquote(value string) (string, error) {
	if len(value) < 2 {
		return "", fmt.Errorf("invalid string literal")
	}
	if value[0] == '`' && value[len(value)-1] == '`' {
		return value[1 : len(value)-1], nil
	}
	if value[0] != '"' || value[len(value)-1] != '"' {
		return "", fmt.Errorf("unsupported string literal")
	}

	var decoded string
	if err := json.Unmarshal([]byte(value), &decoded); err != nil {
		return "", err
	}
	return decoded, nil
}
