package store

import "time"

type DshStoreStatus string

const (
	StatusActive            DshStoreStatus = "active"
	StatusInactive          DshStoreStatus = "inactive"
	StatusTemporarilyClosed DshStoreStatus = "temporarily_closed"
	StatusUnavailable       DshStoreStatus = "unavailable"
)

type DshServiceabilityStatus string

const (
	ServiceabilityServiceable DshServiceabilityStatus = "serviceable"
	ServiceabilityLimited     DshServiceabilityStatus = "limited"
	ServiceabilityOutOfArea   DshServiceabilityStatus = "out_of_area"
	ServiceabilityUnavailable   DshServiceabilityStatus = "unavailable"
)

type DshStoreRow struct {
	ID                   string                  `db:"id"`
	Slug                 string                  `db:"slug"`
	DisplayName         string                  `db:"display_name"`
	Status               DshStoreStatus          `db:"status"`
	CityCode             string                  `db:"city_code"`
	ServiceAreaCode      string                  `db:"service_area_code"`
	ServiceabilityStatus DshServiceabilityStatus `db:"serviceability_status"`
	RatingAverage        *float64                `db:"rating_average"`
	RatingCount          int                     `db:"rating_count"`
	DeliveryEtaMin       *int                    `db:"delivery_eta_min"`
	DeliveryEtaMax       *int                    `db:"delivery_eta_max"`
	IsVisible            bool                    `db:"is_visible"`
	HeroImageUrl         *string                 `db:"hero_image_url"`
	LogoUrl              *string                 `db:"logo_url"`
	CreatedAt            time.Time               `db:"created_at"`
	UpdatedAt            time.Time               `db:"updated_at"`
}

type ServiceabilityInfo struct {
	Status DshServiceabilityStatus `json:"status"`
}

type DshStoreSummary struct {
	ID              string             `json:"id"`
	Slug            string             `json:"slug"`
	DisplayName     string             `json:"displayName"`
	Status          DshStoreStatus     `json:"status"`
	CityCode        string             `json:"cityCode"`
	ServiceAreaCode string             `json:"serviceAreaCode"`
	Serviceability  ServiceabilityInfo `json:"serviceability"`
	RatingAverage   *float64           `json:"ratingAverage"`
	RatingCount     int                `json:"ratingCount"`
	DeliveryEtaMin  *int               `json:"deliveryEtaMin"`
	DeliveryEtaMax  *int               `json:"deliveryEtaMax"`
	IsVisible       bool               `json:"isVisible"`
	HeroImageUrl    *string            `json:"heroImageUrl"`
	LogoUrl         *string            `json:"logoUrl"`
}

type DshStoreDetail struct {
	DshStoreSummary
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type Pagination struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
	Total  int `json:"total"`
}

type DshStoreListResult struct {
	Stores     []DshStoreSummary `json:"stores"`
	Pagination Pagination        `json:"pagination"`
}

type DshStoreListQuery struct {
	CityCode        string
	ServiceAreaCode string
	Status          DshStoreStatus
	IsVisible       *bool
	Limit           int
	Offset          int
}

func RowToSummary(row DshStoreRow) DshStoreSummary {
	return DshStoreSummary{
		ID:              row.ID,
		Slug:            row.Slug,
		DisplayName:     row.DisplayName,
		Status:          row.Status,
		CityCode:        row.CityCode,
		ServiceAreaCode: row.ServiceAreaCode,
		Serviceability: ServiceabilityInfo{
			Status: row.ServiceabilityStatus,
		},
		RatingAverage:  row.RatingAverage,
		RatingCount:    row.RatingCount,
		DeliveryEtaMin: row.DeliveryEtaMin,
		DeliveryEtaMax: row.DeliveryEtaMax,
		IsVisible:      row.IsVisible,
		HeroImageUrl:   row.HeroImageUrl,
		LogoUrl:        row.LogoUrl,
	}
}

func RowToDetail(row DshStoreRow) DshStoreDetail {
	return DshStoreDetail{
		DshStoreSummary: RowToSummary(row),
		CreatedAt:       row.CreatedAt.UTC().Format(time.RFC3339Nano),
		UpdatedAt:       row.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}
