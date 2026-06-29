package provider

func NewMockClient() (*Client, error) {
	config, err := LoadConfig()
	if err != nil {
		return nil, err
	}
	if config.Mode == "" {
		config.Mode = ModeMock
	}
	return NewClient(config), nil
}
