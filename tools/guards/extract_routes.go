package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type Route struct {
	Method            string   `json:"method"`
	Path              string   `json:"path"`
	Route             string   `json:"route"`
	Receiver          string   `json:"receiver"`
	HandlerExpression string   `json:"handlerExpression"`
	Handler           *Handler `json:"handler"`
	FilePath          string   `json:"filePath"`
	Line              int      `json:"line"`
}

type Handler struct {
	Kind                 string  `json:"kind"`
	Receiver             *string `json:"receiver"`
	HandlerName          *string `json:"handlerName"`
	SurfaceExpression    *string `json:"surfaceExpression"`
	PermissionExpression *string `json:"permissionExpression"`
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

		var handlerArg ast.Expr
		if len(call.Args) > 1 {
			handlerArg = call.Args[1]
		}

		var receiverName string
		if sel, ok := call.Fun.(*ast.SelectorExpr); ok {
			if id, ok := sel.X.(*ast.Ident); ok {
				receiverName = id.Name
			}
		}

		handlerExprStr := ""
		if handlerArg != nil {
			handlerExprStr = nodeToString(fileSet, handlerArg)
		}

		handlerInfo := parseHandlerExpr(fileSet, handlerArg)

		method := ""
		path := routeValue
		if len(parts) == 2 {
			method = parts[0]
			path = parts[1]
		} else if len(parts) == 1 {
			path = parts[0]
		}

		// Calculate relative path for output
		relPath := filePath
		if wd, err := os.Getwd(); err == nil {
			if rel, err := filepath.Rel(wd, filePath); err == nil {
				// Normalize path separator to forward slash for consistency with JS
				relPath = filepath.ToSlash(rel)
			}
		}

		routes = append(routes, Route{
			Method:            method,
			Path:              path,
			Route:             routeValue,
			Receiver:          receiverName,
			HandlerExpression: handlerExprStr,
			Handler:           handlerInfo,
			FilePath:          relPath,
			Line:              fileSet.Position(call.Pos()).Line,
		})

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

func nodeToString(fset *token.FileSet, node ast.Node) string {
	var buf bytes.Buffer
	printer.Fprint(&buf, fset, node)
	return buf.String()
}

func parseHandlerExpr(fset *token.FileSet, expr ast.Expr) *Handler {
	if expr == nil {
		return nil
	}

	// Check if it's direct `s.HandlerName`
	if sel, ok := expr.(*ast.SelectorExpr); ok {
		if id, ok := sel.X.(*ast.Ident); ok {
			receiver := id.Name
			handlerName := sel.Sel.Name
			return &Handler{
				Kind:        "direct",
				Receiver:    &receiver,
				HandlerName: &handlerName,
			}
		}
	}

	// Check if it's `s.withPermission(...)`
	if call, ok := expr.(*ast.CallExpr); ok {
		if sel, ok := call.Fun.(*ast.SelectorExpr); ok && sel.Sel.Name == "withPermission" {
			if id, ok := sel.X.(*ast.Ident); ok {
				receiver := id.Name

				var surfaceExpr, permExpr, handlerName *string
				if len(call.Args) >= 1 {
					s := nodeToString(fset, call.Args[0])
					surfaceExpr = &s
				}
				if len(call.Args) >= 2 {
					s := nodeToString(fset, call.Args[1])
					permExpr = &s
				}
				if len(call.Args) >= 3 {
					if hsel, ok := call.Args[2].(*ast.SelectorExpr); ok {
						s := hsel.Sel.Name
						handlerName = &s
					}
				}

				return &Handler{
					Kind:                 "withPermission",
					Receiver:             &receiver,
					HandlerName:          handlerName,
					SurfaceExpression:    surfaceExpr,
					PermissionExpression: permExpr,
				}
			}
		}
	}

	return &Handler{Kind: "other"}
}
