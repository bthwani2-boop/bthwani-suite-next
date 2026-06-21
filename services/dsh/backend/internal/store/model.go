package store

import "time"

type DshStoreStatus string
type DshServiceabilityStatus string
type DshStoreCategory string

const (
	StatusActive            DshStoreStatus = "active"
	StatusInactive          DshStoreStatus = "inactive"
	StatusTemporarilyClosed DshStoreStatus = "temporarily_closed"
	StatusUnavailable       DshStoreStatus = "unavailable"
)

const (
	ServiceabilityServiceable DshServiceabilityStatus = "serviceable"
	ServiceabilityLimited     DshServiceabilityStatus = "limited"
	ServiceabilityOutOfArea   DshServiceabilityStatus = "out_of_area"
	ServiceabilityUnavailable DshServiceabilityStatus = "unavailable"
)

const (
	CategoryRestaurant DshStoreCategory = "restaurant"
	CategoryGrocery    DshStoreCategory = "grocery"
	CategoryPharmacy   DshStoreCategory = "pharmacy"
	CategoryBakery     DshStoreCategory = "bakery"
	CategoryDefault    DshStoreCategory = "default"
)

type DshStoreRow struct {
	ID                   string
	Slug                 string
	DisplayName          string
	Status               DshStoreStatus
	CityCode             string
	ServiceAreaCode      string
	ServiceabilityStatus DshServiceabilityStatus
	RatingAverage        *float64
	RatingCount          int
	DeliveryEtaMin       *int
	DeliveryEtaMax       *int
	IsVisible            bool
	HeroImageURL         *string
	LogoURL              *string
	Category             DshStoreCategory
	DeliveryModes        []string
	IsFreeDelivery       bool
	DistanceKM           *float64
	FollowerCount        int
	HasProBadge          bool
	HasCouponBadge       bool
	PointsMultiplier     *int
	IsPopular            bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type ServiceabilityInfo struct {
	Status DshServiceabilityStatus `json:"status"`
}

type DshStoreSummary struct {
	ID               string             `json:"id"`
	Slug             string             `json:"slug"`
	DisplayName      string             `json:"displayName"`
	Status           DshStoreStatus     `json:"status"`
	CityCode         string             `json:"cityCode"`
	ServiceAreaCode  string             `json:"serviceAreaCode"`
	Serviceability   ServiceabilityInfo `json:"serviceability"`
	RatingAverage    *float64           `json:"ratingAverage"`
	RatingCount      int                `json:"ratingCount"`
	DeliveryEtaMin   *int               `json:"deliveryEtaMin"`
	DeliveryEtaMax   *int               `json:"deliveryEtaMax"`
	IsVisible        bool               `json:"isVisible"`
	HeroImageURL     *string            `json:"heroImageUrl"`
	LogoURL          *string            `json:"logoUrl"`
	Category         DshStoreCategory   `json:"category"`
	DeliveryModes    []string           `json:"deliveryModes"`
	IsFreeDelivery   bool               `json:"isFreeDelivery"`
	DistanceKM       *float64           `json:"distanceKm"`
	FollowerCount    int                `json:"followerCount"`
	HasProBadge      bool               `json:"hasProBadge"`
	HasCouponBadge   bool               `json:"hasCouponBadge"`
	PointsMultiplier *int               `json:"pointsMultiplier"`
	IsPopular        bool               `json:"isPopular"`
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
		ID: row.ID, Slug: row.Slug, DisplayName: row.DisplayName, Status: row.Status,
		CityCode: row.CityCode, ServiceAreaCode: row.ServiceAreaCode,
		Serviceability: ServiceabilityInfo{Status: row.ServiceabilityStatus},
		RatingAverage:  row.RatingAverage, RatingCount: row.RatingCount,
		DeliveryEtaMin: row.DeliveryEtaMin, DeliveryEtaMax: row.DeliveryEtaMax,
		IsVisible: row.IsVisible, HeroImageURL: row.HeroImageURL, LogoURL: row.LogoURL,
		Category: row.Category, DeliveryModes: row.DeliveryModes,
		IsFreeDelivery: row.IsFreeDelivery, DistanceKM: row.DistanceKM,
		FollowerCount: row.FollowerCount, HasProBadge: row.HasProBadge,
		HasCouponBadge: row.HasCouponBadge, PointsMultiplier: row.PointsMultiplier,
		IsPopular: row.IsPopular,
	}
}

func RowToDetail(row DshStoreRow) DshStoreDetail {
	return DshStoreDetail{
		DshStoreSummary: RowToSummary(row),
		CreatedAt:       row.CreatedAt.UTC().Format(time.RFC3339Nano),
		UpdatedAt:       row.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}
