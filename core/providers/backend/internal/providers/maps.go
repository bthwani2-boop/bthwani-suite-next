package providers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

var (
	ErrInvalidMapRequest     = errors.New("invalid map request")
	ErrMapProviderUnavailable = errors.New("map provider unavailable")
	ErrMapProviderNotConfigured = errors.New("map provider not configured")
)

type MapSearchInput struct {
	Query        string   `json:"query"`
	Limit        int      `json:"limit,omitempty"`
	Language     string   `json:"language,omitempty"`
	CountryCodes []string `json:"countryCodes,omitempty"`
}

type MapReverseInput struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Language  string  `json:"language,omitempty"`
}

type MapLocation struct {
	ProviderCode       string  `json:"providerCode"`
	ProviderPlaceID    string  `json:"providerPlaceId"`
	DisplayName        string  `json:"displayName"`
	Latitude           float64 `json:"latitude"`
	Longitude          float64 `json:"longitude"`
	CountryCode        string  `json:"countryCode,omitempty"`
	AdministrativeArea string  `json:"administrativeArea,omitempty"`
	Locality            string  `json:"locality,omitempty"`
	PostalCode          string  `json:"postalCode,omitempty"`
	Confidence          float64 `json:"confidence,omitempty"`
}

type MapSearchResponse struct {
	Locations []MapLocation `json:"locations"`
}

type MapReverseResponse struct {
	Location MapLocation `json:"location"`
}

type mapProviderParameters struct {
	Protocol     string   `json:"protocol"`
	BaseURL      string   `json:"baseUrl"`
	SearchPath   string   `json:"searchPath"`
	ReversePath  string   `json:"reversePath"`
	UserAgent    string   `json:"userAgent"`
	DefaultLang  string   `json:"defaultLanguage"`
	CountryCodes []string `json:"countryCodes"`
	TimeoutMS    int      `json:"timeoutMs"`
	Priority     int      `json:"priority"`
}

type mapProviderCredentials struct {
	APIKey       string `json:"apiKey"`
	APIKeyHeader string `json:"apiKeyHeader"`
	APIKeyQuery  string `json:"apiKeyQuery"`
}

type nominatimAddress struct {
	CountryCode string `json:"country_code"`
	State       string `json:"state"`
	StateDistrict string `json:"state_district"`
	City        string `json:"city"`
	Town        string `json:"town"`
	Village     string `json:"village"`
	County      string `json:"county"`
	Postcode    string `json:"postcode"`
}

type nominatimLocation struct {
	PlaceID     json.RawMessage  `json:"place_id"`
	Latitude    string           `json:"lat"`
	Longitude   string           `json:"lon"`
	DisplayName string           `json:"display_name"`
	Importance  float64          `json:"importance"`
	Address     nominatimAddress `json:"address"`
}

func (s *Service) SearchMaps(ctx context.Context, input MapSearchInput) (MapSearchResponse, error) {
	input.Query = strings.TrimSpace(input.Query)
	if len(input.Query) < 2 || len(input.Query) > 240 {
		return MapSearchResponse{}, ErrInvalidMapRequest
	}
	if input.Limit == 0 {
		input.Limit = 6
	}
	if input.Limit < 1 || input.Limit > 10 || len(input.Language) > 32 || len(input.CountryCodes) > 8 {
		return MapSearchResponse{}, ErrInvalidMapRequest
	}
	providers, err := s.repo.ListProvidersByKind(ctx, "maps")
	if err != nil {
		return MapSearchResponse{}, err
	}
	if len(providers) == 0 {
		return MapSearchResponse{}, ErrMapProviderNotConfigured
	}
	sortMapProviders(providers)
	var lastErr error
	for _, provider := range providers {
		locations, err := searchWithMapProvider(ctx, provider, input)
		if err == nil {
			return MapSearchResponse{Locations: locations}, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = ErrMapProviderUnavailable
	}
	return MapSearchResponse{}, fmt.Errorf("%w: %v", ErrMapProviderUnavailable, lastErr)
}

func (s *Service) ReverseMap(ctx context.Context, input MapReverseInput) (MapReverseResponse, error) {
	if input.Latitude < -90 || input.Latitude > 90 || input.Longitude < -180 || input.Longitude > 180 || len(input.Language) > 32 {
		return MapReverseResponse{}, ErrInvalidMapRequest
	}
	providers, err := s.repo.ListProvidersByKind(ctx, "maps")
	if err != nil {
		return MapReverseResponse{}, err
	}
	if len(providers) == 0 {
		return MapReverseResponse{}, ErrMapProviderNotConfigured
	}
	sortMapProviders(providers)
	var lastErr error
	for _, provider := range providers {
		location, err := reverseWithMapProvider(ctx, provider, input)
		if err == nil {
			return MapReverseResponse{Location: location}, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = ErrMapProviderUnavailable
	}
	return MapReverseResponse{}, fmt.Errorf("%w: %v", ErrMapProviderUnavailable, lastErr)
}

func sortMapProviders(list []ExternalProvider) {
	sort.SliceStable(list, func(i, j int) bool {
		left, _ := decodeMapProvider(list[i])
		right, _ := decodeMapProvider(list[j])
		if left.Priority == right.Priority {
			return list[i].Code < list[j].Code
		}
		return left.Priority < right.Priority
	})
}

func searchWithMapProvider(ctx context.Context, provider ExternalProvider, input MapSearchInput) ([]MapLocation, error) {
	params, creds := decodeMapProvider(provider)
	if !supportsNominatim(provider, params) {
		return nil, fmt.Errorf("unsupported map provider protocol for %s", provider.Code)
	}
	endpoint, err := mapEndpoint(params.BaseURL, defaultPath(params.SearchPath, "/search"))
	if err != nil {
		return nil, err
	}
	query := endpoint.Query()
	query.Set("format", "jsonv2")
	query.Set("addressdetails", "1")
	query.Set("q", input.Query)
	query.Set("limit", strconv.Itoa(input.Limit))
	language := strings.TrimSpace(input.Language)
	if language == "" {
		language = strings.TrimSpace(params.DefaultLang)
	}
	if language != "" {
		query.Set("accept-language", language)
	}
	countries := normalizedCountryCodes(input.CountryCodes)
	if len(countries) == 0 {
		countries = normalizedCountryCodes(params.CountryCodes)
	}
	if len(countries) > 0 {
		query.Set("countrycodes", strings.Join(countries, ","))
	}
	applyAPIKey(query, nil, creds)
	endpoint.RawQuery = query.Encode()

	var upstream []nominatimLocation
	if err := executeMapJSON(ctx, provider.Code, endpoint.String(), params, creds, &upstream); err != nil {
		return nil, err
	}
	locations := make([]MapLocation, 0, len(upstream))
	for _, item := range upstream {
		location, err := normalizeNominatimLocation(provider.Code, item)
		if err == nil {
			locations = append(locations, location)
		}
	}
	return locations, nil
}

func reverseWithMapProvider(ctx context.Context, provider ExternalProvider, input MapReverseInput) (MapLocation, error) {
	params, creds := decodeMapProvider(provider)
	if !supportsNominatim(provider, params) {
		return MapLocation{}, fmt.Errorf("unsupported map provider protocol for %s", provider.Code)
	}
	endpoint, err := mapEndpoint(params.BaseURL, defaultPath(params.ReversePath, "/reverse"))
	if err != nil {
		return MapLocation{}, err
	}
	query := endpoint.Query()
	query.Set("format", "jsonv2")
	query.Set("addressdetails", "1")
	query.Set("lat", strconv.FormatFloat(input.Latitude, 'f', 7, 64))
	query.Set("lon", strconv.FormatFloat(input.Longitude, 'f', 7, 64))
	language := strings.TrimSpace(input.Language)
	if language == "" {
		language = strings.TrimSpace(params.DefaultLang)
	}
	if language != "" {
		query.Set("accept-language", language)
	}
	applyAPIKey(query, nil, creds)
	endpoint.RawQuery = query.Encode()

	var upstream nominatimLocation
	if err := executeMapJSON(ctx, provider.Code, endpoint.String(), params, creds, &upstream); err != nil {
		return MapLocation{}, err
	}
	return normalizeNominatimLocation(provider.Code, upstream)
}

func executeMapJSON(ctx context.Context, providerCode, endpoint string, params mapProviderParameters, creds mapProviderCredentials, target any) error {
	timeout := time.Duration(params.TimeoutMS) * time.Millisecond
	if timeout < time.Second || timeout > 15*time.Second {
		timeout = 5 * time.Second
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	userAgent := strings.TrimSpace(params.UserAgent)
	if userAgent == "" {
		return fmt.Errorf("map provider %s requires a configured userAgent", providerCode)
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json")
	applyAPIKey(nil, req.Header, creds)
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("map provider %s returned status %d", providerCode, resp.StatusCode)
	}
	decoder := json.NewDecoder(io.LimitReader(resp.Body, 1024*1024))
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("decode map provider %s response: %w", providerCode, err)
	}
	return nil
}

func decodeMapProvider(provider ExternalProvider) (mapProviderParameters, mapProviderCredentials) {
	params := mapProviderParameters{Priority: 100}
	creds := mapProviderCredentials{}
	if len(provider.Parameters) > 0 {
		_ = json.Unmarshal(provider.Parameters, &params)
	}
	if len(provider.Credentials) > 0 {
		_ = json.Unmarshal(provider.Credentials, &creds)
	}
	return params, creds
}

func supportsNominatim(provider ExternalProvider, params mapProviderParameters) bool {
	protocol := strings.ToLower(strings.TrimSpace(params.Protocol))
	code := strings.ToLower(strings.TrimSpace(provider.Code))
	return protocol == "nominatim" || code == "nominatim" || strings.Contains(code, "nominatim")
}

func mapEndpoint(baseURL, path string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") {
		return nil, fmt.Errorf("invalid map provider baseUrl")
	}
	if parsed.Scheme == "http" && parsed.Hostname() != "localhost" && parsed.Hostname() != "127.0.0.1" && parsed.Hostname() != "::1" {
		return nil, fmt.Errorf("non-local map provider must use https")
	}
	parsed.Path = strings.TrimRight(parsed.Path, "/") + "/" + strings.TrimLeft(path, "/")
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed, nil
}

func defaultPath(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func applyAPIKey(query url.Values, header http.Header, creds mapProviderCredentials) {
	if strings.TrimSpace(creds.APIKey) == "" {
		return
	}
	if query != nil && strings.TrimSpace(creds.APIKeyQuery) != "" {
		query.Set(strings.TrimSpace(creds.APIKeyQuery), creds.APIKey)
	}
	if header != nil && strings.TrimSpace(creds.APIKeyHeader) != "" {
		header.Set(strings.TrimSpace(creds.APIKeyHeader), creds.APIKey)
	}
}

func normalizedCountryCodes(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		code := strings.ToLower(strings.TrimSpace(value))
		if len(code) != 2 || seen[code] {
			continue
		}
		seen[code] = true
		result = append(result, code)
	}
	return result
}

func normalizeNominatimLocation(providerCode string, item nominatimLocation) (MapLocation, error) {
	latitude, err := strconv.ParseFloat(strings.TrimSpace(item.Latitude), 64)
	if err != nil || latitude < -90 || latitude > 90 {
		return MapLocation{}, ErrMapProviderUnavailable
	}
	longitude, err := strconv.ParseFloat(strings.TrimSpace(item.Longitude), 64)
	if err != nil || longitude < -180 || longitude > 180 {
		return MapLocation{}, ErrMapProviderUnavailable
	}
	if strings.TrimSpace(item.DisplayName) == "" {
		return MapLocation{}, ErrMapProviderUnavailable
	}
	administrativeArea := firstNonEmpty(item.Address.State, item.Address.StateDistrict, item.Address.County)
	locality := firstNonEmpty(item.Address.City, item.Address.Town, item.Address.Village)
	return MapLocation{
		ProviderCode:       providerCode,
		ProviderPlaceID:    normalizeRawIdentifier(item.PlaceID),
		DisplayName:        strings.TrimSpace(item.DisplayName),
		Latitude:           latitude,
		Longitude:          longitude,
		CountryCode:        strings.ToUpper(strings.TrimSpace(item.Address.CountryCode)),
		AdministrativeArea: strings.TrimSpace(administrativeArea),
		Locality:            strings.TrimSpace(locality),
		PostalCode:          strings.TrimSpace(item.Address.Postcode),
		Confidence:          item.Importance,
	}, nil
}

func normalizeRawIdentifier(raw json.RawMessage) string {
	value := strings.TrimSpace(string(raw))
	value = strings.Trim(value, "\"")
	return value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
