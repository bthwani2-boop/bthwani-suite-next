package homediscovery

type HomeBanner struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle,omitempty"`
	ImageURL     string `json:"imageUrl"`
	ActionType   string `json:"actionType"`
	ActionTarget string `json:"actionTarget"`
}

type HomePromo struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle,omitempty"`
	BadgeLabel   string `json:"badgeLabel,omitempty"`
	ImageURL     string `json:"imageUrl"`
	ActionType   string `json:"actionType"`
	ActionTarget string `json:"actionTarget"`
}

type HomeFilter struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Kind     string `json:"kind"`
	IsActive bool   `json:"isActive"`
}

type HomeCategory struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	IconURL   string `json:"iconUrl,omitempty"`
	SortOrder int    `json:"sortOrder"`
}

type AdminContentItem struct {
	ID           string `json:"id"`
	Kind         string `json:"kind"`
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle,omitempty"`
	BadgeLabel   string `json:"badgeLabel,omitempty"`
	ImageURL     string `json:"imageUrl,omitempty"`
	ActionType   string `json:"actionType"`
	ActionTarget string `json:"actionTarget"`
	SortOrder    int    `json:"sortOrder"`
	IsActive     bool   `json:"isActive"`
}

type AdminContentInput struct {
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle"`
	BadgeLabel   string `json:"badgeLabel"`
	ImageURL     string `json:"imageUrl"`
	ActionType   string `json:"actionType"`
	ActionTarget string `json:"actionTarget"`
	SortOrder    int    `json:"sortOrder"`
	IsActive     bool   `json:"isActive"`
}

type HomeDiscoveryQuery struct {
	CityCode        string
	ServiceAreaCode string
	Limit           int
}

// HomeDiscoveryResult mirrors OpenAPI DshHomeDiscoveryResponse.
// stores is []store.DshStoreSummary but to avoid circular import we inline.
type HomeDiscoveryResult struct {
	Banners     []HomeBanner
	Promos      []HomePromo
	Filters     []HomeFilter
	Categories  []HomeCategory
	Stores      []HomeStore
	Pagination  HomePagination
	GeneratedAt string
}

type HomeStore struct {
	ID               string      `json:"id"`
	Slug             string      `json:"slug"`
	DisplayName      string      `json:"displayName"`
	Status           string      `json:"status"`
	Serviceability   interface{} `json:"serviceability"`
	RatingAverage    *float64    `json:"ratingAverage,omitempty"`
	RatingCount      int         `json:"ratingCount"`
	DeliveryEtaMin   *int        `json:"deliveryEtaMin,omitempty"`
	DeliveryEtaMax   *int        `json:"deliveryEtaMax,omitempty"`
	HeroImageURL     *string     `json:"heroImageUrl,omitempty"`
	LogoURL          *string     `json:"logoUrl,omitempty"`
	Category         string      `json:"category"`
	CategoryLabel    string      `json:"categoryLabel"`
	IsFreeDelivery   bool        `json:"isFreeDelivery"`
	HasProBadge      bool        `json:"hasProBadge"`
	HasCouponBadge   bool        `json:"hasCouponBadge"`
	IsPopular        bool        `json:"isPopular"`
	FollowerCount    int         `json:"followerCount"`
	PointsMultiplier *int        `json:"pointsMultiplier,omitempty"`
	CityCode         string      `json:"cityCode"`
	ServiceAreaCode  string      `json:"serviceAreaCode"`
	IsVisible        bool        `json:"isVisible"`
	DeliveryModes    []string    `json:"deliveryModes"`
	DistanceKm       *float64    `json:"distanceKm,omitempty"`
}

type HomeServiceability struct {
	Status string `json:"status"`
}

type HomePagination struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
	Total  int `json:"total"`
}
