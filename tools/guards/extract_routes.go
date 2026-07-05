package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"strings"
)

type Route struct {
	Method string `json:"method"`
	Path   string `json:"path"`
}

func main() {
	filePath := "services/dsh/backend/internal/http/server.go"
	if len(os.Args) > 1 {
		filePath = os.Args[1]
	}

	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, filePath, nil, parser.ParseComments)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing file %s: %v\n", filePath, err)
		os.Exit(1)
	}

	var routes []Route

	ast.Inspect(node, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}

		sel, ok := call.Fun.(*ast.SelectorExpr)
		if !ok {
			return true
		}

		// Look for .HandleFunc or .Handle calls
		if sel.Sel.Name != "HandleFunc" && sel.Sel.Name != "Handle" {
			return true
		}

		if len(call.Args) < 1 {
			return true
		}

		// First argument should be a string literal defining the route
		lit, ok := call.Args[0].(*ast.BasicLit)
		if !ok || lit.Kind != token.STRING {
			return true
		}

		// Strip quotes
		routeVal := strings.Trim(lit.Value, "`\"")
		parts := strings.Fields(routeVal)
		if len(parts) == 2 {
			routes = append(routes, Route{
				Method: parts[0],
				Path:   parts[1],
			})
		} else if len(parts) == 1 {
			// Defaults to GET or any method if not specified, but let's assume it is just the path
			routes = append(routes, Route{
				Method: "",
				Path:   parts[0],
			})
		}

		return true
	})

	bz, err := json.MarshalIndent(routes, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(bz))
}
