package provider

import "fmt"

type Error struct {
	Code       string
	StatusCode int
	Message    string
}

func (e Error) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}
