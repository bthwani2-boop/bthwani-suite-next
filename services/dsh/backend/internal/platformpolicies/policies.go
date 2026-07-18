package platformpolicies

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var (
	ErrInvalid             = errors.New("invalid platform policy")
	ErrNotFound            = errors.New("platform policy not found")
	ErrVersionConflict     = errors.New("platform policy version conflict")
	ErrIdempotencyConflict = errors.New("platform policy idempotency conflict")
)

type MutationContext struct {
	ActorID        string
	ActorSurface   string
	IdempotencyKey string
	CorrelationID  string
	Reason         string
}

type Zone struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	CityCode    string    `json:"cityCode"`
	IsActive    bool      `json:"isActive"`
	Description string    `json:"description"`
	Version     int       `json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateZoneInput struct {
	ID          string `json:"id,omitempty"`
	Name        string `json:"name"`
	CityCode    string `json:"cityCode"`
	Description string `json:"description,omitempty"`
}

type UpdateZoneInput struct {
	Name            *string `json:"name,omitempty"`
	Description     *string `json:"description,omitempty"`
	IsActive        *bool   `json:"isActive,omitempty"`
	ExpectedVersion int     `json:"expectedVersion"`
}

type SlaRule struct {
	ID                  string    `json:"id"`
	ZoneID              string    `json:"zoneId"`
	Category            string    `json:"category"`
	MaxPrepMins         int       `json:"maxPrepMins"`
	MaxDeliveryMins     int       `json:"maxDeliveryMins"`
	Version             int       `json:"version"`
	UpdatedBy           string    `json:"updatedBy"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type UpsertSlaInput struct {
	ZoneID              string `json:"zoneId"`
	Category            string `json:"category"`
	MaxPrepMins         int    `json:"maxPrepMins"`
	MaxDeliveryMins     int    `json:"maxDeliveryMins"`
	ExpectedVersion     int    `json:"expectedVersion"`
}

type CapacityConfig struct {
	ID                  string    `json:"id"`
	ZoneID              string    `json:"zoneId"`
	MaxConcurrentOrders int       `json:"maxConcurrentOrders"`
	MaxCaptainsOnline   int       `json:"maxCaptainsOnline"`
	ThrottleThreshold   float64   `json:"throttleThreshold"`
	Version             int       `json:"version"`
	UpdatedBy           string    `json:"updatedBy"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type UpsertCapacityInput struct {
	ZoneID              string  `json:"zoneId"`
	MaxConcurrentOrders int     `json:"maxConcurrentOrders"`
	MaxCaptainsOnline   int     `json:"maxCaptainsOnline"`
	ThrottleThreshold   float64 `json:"throttleThreshold"`
	ExpectedVersion     int     `json:"expectedVersion"`
}

type ZoneServiceability struct {
	ZoneID       string `json:"zoneId"`
	IsActive     bool   `json:"isActive"`
	ActiveStores int    `json:"activeStores"`
	SlaAvailable bool   `json:"slaAvailable"`
}

func ListZones(ctx context.Context, db *sql.DB, includeInactive bool) ([]Zone, error) {
	query := `SELECT id, name, city_code, is_active, description, version, created_at, updated_at FROM dsh_platform_zones`
	if !includeInactive {
		query += ` WHERE is_active = TRUE`
	}
	query += ` ORDER BY city_code, name, id`
	rows, err := db.QueryContext(ctx, query)
	if err != nil { return nil, err }
	defer rows.Close()
	items := []Zone{}
	for rows.Next() {
		var item Zone
		if err := rows.Scan(&item.ID, &item.Name, &item.CityCode, &item.IsActive, &item.Description, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil { return nil, err }
		items = append(items, item)
	}
	return items, rows.Err()
}

func CreateZone(ctx context.Context, db *sql.DB, input CreateZoneInput, mutation MutationContext) (Zone, error) {
	input.ID = strings.ToLower(strings.TrimSpace(input.ID))
	input.Name = strings.TrimSpace(input.Name)
	input.CityCode = strings.ToLower(strings.TrimSpace(input.CityCode))
	input.Description = strings.TrimSpace(input.Description)
	if input.Name == "" || len(input.Name) > 160 || input.CityCode == "" || len(input.CityCode) > 80 || len(input.Description) > 1000 || !validMutation(mutation) { return Zone{}, ErrInvalid }
	return withIdempotency(ctx, db, mutation, "create-zone", input, func(tx *sql.Tx) (Zone, error) {
		var item Zone
		var err error
		if input.ID == "" {
			err = tx.QueryRowContext(ctx, `INSERT INTO dsh_platform_zones (name, city_code, description) VALUES ($1,$2,$3) RETURNING id,name,city_code,is_active,description,version,created_at,updated_at`, input.Name, input.CityCode, input.Description).Scan(&item.ID,&item.Name,&item.CityCode,&item.IsActive,&item.Description,&item.Version,&item.CreatedAt,&item.UpdatedAt)
		} else {
			err = tx.QueryRowContext(ctx, `INSERT INTO dsh_platform_zones (id,name,city_code,description) VALUES ($1,$2,$3,$4) RETURNING id,name,city_code,is_active,description,version,created_at,updated_at`, input.ID, input.Name, input.CityCode, input.Description).Scan(&item.ID,&item.Name,&item.CityCode,&item.IsActive,&item.Description,&item.Version,&item.CreatedAt,&item.UpdatedAt)
		}
		if err != nil { return Zone{}, err }
		if err := insertEvent(ctx, tx, "zone", item.ID, "created", mutation, nil, item.Version, item); err != nil { return Zone{}, err }
		return item, nil
	})
}

func UpdateZone(ctx context.Context, db *sql.DB, zoneID string, input UpdateZoneInput, mutation MutationContext) (Zone, error) {
	zoneID = strings.TrimSpace(zoneID)
	if zoneID == "" || input.ExpectedVersion < 1 || (input.Name == nil && input.Description == nil && input.IsActive == nil) || !validMutation(mutation) { return Zone{}, ErrInvalid }
	if input.Name != nil { v := strings.TrimSpace(*input.Name); if v == "" || len(v) > 160 { return Zone{}, ErrInvalid }; input.Name = &v }
	if input.Description != nil { v := strings.TrimSpace(*input.Description); if len(v) > 1000 { return Zone{}, ErrInvalid }; input.Description = &v }
	return withIdempotency(ctx, db, mutation, "update-zone:"+zoneID, input, func(tx *sql.Tx) (Zone, error) {
		var before Zone
		if err := tx.QueryRowContext(ctx, `SELECT id,name,city_code,is_active,description,version,created_at,updated_at FROM dsh_platform_zones WHERE id=$1 FOR UPDATE`, zoneID).Scan(&before.ID,&before.Name,&before.CityCode,&before.IsActive,&before.Description,&before.Version,&before.CreatedAt,&before.UpdatedAt); errors.Is(err, sql.ErrNoRows) { return Zone{}, ErrNotFound } else if err != nil { return Zone{}, err }
		if before.Version != input.ExpectedVersion { return Zone{}, ErrVersionConflict }
		name, description, active := before.Name, before.Description, before.IsActive
		if input.Name != nil { name = *input.Name }; if input.Description != nil { description = *input.Description }; if input.IsActive != nil { active = *input.IsActive }
		var item Zone
		if err := tx.QueryRowContext(ctx, `UPDATE dsh_platform_zones SET name=$2,description=$3,is_active=$4,version=version+1,updated_at=NOW() WHERE id=$1 RETURNING id,name,city_code,is_active,description,version,created_at,updated_at`, zoneID,name,description,active).Scan(&item.ID,&item.Name,&item.CityCode,&item.IsActive,&item.Description,&item.Version,&item.CreatedAt,&item.UpdatedAt); err != nil { return Zone{}, err }
		action := "updated"; if before.IsActive != item.IsActive { if item.IsActive { action="activated" } else { action="deactivated" } }
		if err := insertEvent(ctx, tx, "zone", item.ID, action, mutation, before.Version, item.Version, item); err != nil { return Zone{}, err }
		return item,nil
	})
}

func ListSlaRules(ctx context.Context, db *sql.DB, zoneID string) ([]SlaRule,error) {
	args:=[]any{}; query:=`SELECT id,zone_id,category,max_prep_mins,max_delivery_mins,version,updated_by,updated_at FROM dsh_platform_sla_rules`
	if strings.TrimSpace(zoneID)!="" { query+=` WHERE zone_id=$1`; args=append(args,strings.TrimSpace(zoneID)) }; query+=` ORDER BY zone_id,category`
	rows,err:=db.QueryContext(ctx,query,args...); if err!=nil{return nil,err}; defer rows.Close(); items:=[]SlaRule{}
	for rows.Next(){var item SlaRule;if err:=rows.Scan(&item.ID,&item.ZoneID,&item.Category,&item.MaxPrepMins,&item.MaxDeliveryMins,&item.Version,&item.UpdatedBy,&item.UpdatedAt);err!=nil{return nil,err};items=append(items,item)}
	return items,rows.Err()
}

func UpsertSlaRule(ctx context.Context, db *sql.DB, input UpsertSlaInput, mutation MutationContext)(SlaRule,error){
	input.ZoneID=strings.TrimSpace(input.ZoneID);input.Category=strings.ToLower(strings.TrimSpace(input.Category))
	if input.ZoneID==""||input.Category==""||len(input.Category)>120||input.MaxPrepMins<1||input.MaxPrepMins>1440||input.MaxDeliveryMins<1||input.MaxDeliveryMins>1440||input.ExpectedVersion<0||!validMutation(mutation){return SlaRule{},ErrInvalid}
	return withIdempotency(ctx,db,mutation,"upsert-sla:"+input.ZoneID+":"+input.Category,input,func(tx *sql.Tx)(SlaRule,error){
		var before SlaRule;err:=tx.QueryRowContext(ctx,`SELECT id,zone_id,category,max_prep_mins,max_delivery_mins,version,updated_by,updated_at FROM dsh_platform_sla_rules WHERE zone_id=$1 AND category=$2 FOR UPDATE`,input.ZoneID,input.Category).Scan(&before.ID,&before.ZoneID,&before.Category,&before.MaxPrepMins,&before.MaxDeliveryMins,&before.Version,&before.UpdatedBy,&before.UpdatedAt)
		var item SlaRule;var action string;var from any
		if errors.Is(err,sql.ErrNoRows){if input.ExpectedVersion!=0{return SlaRule{},ErrVersionConflict};err=tx.QueryRowContext(ctx,`INSERT INTO dsh_platform_sla_rules(zone_id,category,max_prep_mins,max_delivery_mins,updated_by) VALUES($1,$2,$3,$4,$5) RETURNING id,zone_id,category,max_prep_mins,max_delivery_mins,version,updated_by,updated_at`,input.ZoneID,input.Category,input.MaxPrepMins,input.MaxDeliveryMins,mutation.ActorID).Scan(&item.ID,&item.ZoneID,&item.Category,&item.MaxPrepMins,&item.MaxDeliveryMins,&item.Version,&item.UpdatedBy,&item.UpdatedAt);action="created";from=nil
		}else if err!=nil{return SlaRule{},err}else{if before.Version!=input.ExpectedVersion{return SlaRule{},ErrVersionConflict};err=tx.QueryRowContext(ctx,`UPDATE dsh_platform_sla_rules SET max_prep_mins=$3,max_delivery_mins=$4,updated_by=$5,version=version+1,updated_at=NOW() WHERE zone_id=$1 AND category=$2 RETURNING id,zone_id,category,max_prep_mins,max_delivery_mins,version,updated_by,updated_at`,input.ZoneID,input.Category,input.MaxPrepMins,input.MaxDeliveryMins,mutation.ActorID).Scan(&item.ID,&item.ZoneID,&item.Category,&item.MaxPrepMins,&item.MaxDeliveryMins,&item.Version,&item.UpdatedBy,&item.UpdatedAt);action="updated";from=before.Version}
		if err!=nil{return SlaRule{},err};if err:=insertEvent(ctx,tx,"sla_rule",item.ID,action,mutation,from,item.Version,item);err!=nil{return SlaRule{},err};return item,nil})
}

func GetCapacity(ctx context.Context,db *sql.DB,zoneID string)(CapacityConfig,error){var item CapacityConfig;err:=db.QueryRowContext(ctx,`SELECT id,zone_id,max_concurrent_orders,max_captains_online,throttle_threshold,version,updated_by,updated_at FROM dsh_platform_capacity_configs WHERE zone_id=$1`,strings.TrimSpace(zoneID)).Scan(&item.ID,&item.ZoneID,&item.MaxConcurrentOrders,&item.MaxCaptainsOnline,&item.ThrottleThreshold,&item.Version,&item.UpdatedBy,&item.UpdatedAt);if errors.Is(err,sql.ErrNoRows){return CapacityConfig{},ErrNotFound};return item,err}

func UpsertCapacity(ctx context.Context,db *sql.DB,input UpsertCapacityInput,mutation MutationContext)(CapacityConfig,error){
	input.ZoneID=strings.TrimSpace(input.ZoneID);if input.ZoneID==""||input.MaxConcurrentOrders<1||input.MaxCaptainsOnline<0||input.ThrottleThreshold<0||input.ThrottleThreshold>1||input.ExpectedVersion<0||!validMutation(mutation){return CapacityConfig{},ErrInvalid}
	return withIdempotency(ctx,db,mutation,"upsert-capacity:"+input.ZoneID,input,func(tx *sql.Tx)(CapacityConfig,error){var before CapacityConfig;err:=tx.QueryRowContext(ctx,`SELECT id,zone_id,max_concurrent_orders,max_captains_online,throttle_threshold,version,updated_by,updated_at FROM dsh_platform_capacity_configs WHERE zone_id=$1 FOR UPDATE`,input.ZoneID).Scan(&before.ID,&before.ZoneID,&before.MaxConcurrentOrders,&before.MaxCaptainsOnline,&before.ThrottleThreshold,&before.Version,&before.UpdatedBy,&before.UpdatedAt);var item CapacityConfig;var action string;var from any;if errors.Is(err,sql.ErrNoRows){if input.ExpectedVersion!=0{return CapacityConfig{},ErrVersionConflict};err=tx.QueryRowContext(ctx,`INSERT INTO dsh_platform_capacity_configs(zone_id,max_concurrent_orders,max_captains_online,throttle_threshold,updated_by) VALUES($1,$2,$3,$4,$5) RETURNING id,zone_id,max_concurrent_orders,max_captains_online,throttle_threshold,version,updated_by,updated_at`,input.ZoneID,input.MaxConcurrentOrders,input.MaxCaptainsOnline,input.ThrottleThreshold,mutation.ActorID).Scan(&item.ID,&item.ZoneID,&item.MaxConcurrentOrders,&item.MaxCaptainsOnline,&item.ThrottleThreshold,&item.Version,&item.UpdatedBy,&item.UpdatedAt);action="created";from=nil}else if err!=nil{return CapacityConfig{},err}else{if before.Version!=input.ExpectedVersion{return CapacityConfig{},ErrVersionConflict};err=tx.QueryRowContext(ctx,`UPDATE dsh_platform_capacity_configs SET max_concurrent_orders=$2,max_captains_online=$3,throttle_threshold=$4,updated_by=$5,version=version+1,updated_at=NOW() WHERE zone_id=$1 RETURNING id,zone_id,max_concurrent_orders,max_captains_online,throttle_threshold,version,updated_by,updated_at`,input.ZoneID,input.MaxConcurrentOrders,input.MaxCaptainsOnline,input.ThrottleThreshold,mutation.ActorID).Scan(&item.ID,&item.ZoneID,&item.MaxConcurrentOrders,&item.MaxCaptainsOnline,&item.ThrottleThreshold,&item.Version,&item.UpdatedBy,&item.UpdatedAt);action="updated";from=before.Version};if err!=nil{return CapacityConfig{},err};if err:=insertEvent(ctx,tx,"capacity_config",item.ID,action,mutation,from,item.Version,item);err!=nil{return CapacityConfig{},err};return item,nil})
}

func GetZoneServiceability(ctx context.Context,db *sql.DB,zoneID string)(ZoneServiceability,error){var result ZoneServiceability;result.ZoneID=strings.TrimSpace(zoneID);if result.ZoneID==""{return result,ErrInvalid};err:=db.QueryRowContext(ctx,`SELECT z.is_active,(SELECT COUNT(*) FROM dsh_stores s WHERE s.service_area_code=z.id AND s.status='active' AND s.is_visible=TRUE AND s.serviceability_status IN ('serviceable','limited')),(EXISTS(SELECT 1 FROM dsh_platform_sla_rules r WHERE r.zone_id=z.id)) FROM dsh_platform_zones z WHERE z.id=$1`,result.ZoneID).Scan(&result.IsActive,&result.ActiveStores,&result.SlaAvailable);if errors.Is(err,sql.ErrNoRows){return result,ErrNotFound};return result,err}

func validMutation(m MutationContext)bool{return strings.TrimSpace(m.ActorID)!=""&&strings.TrimSpace(m.ActorSurface)!=""&&len(strings.TrimSpace(m.IdempotencyKey))>=8&&len(strings.TrimSpace(m.Reason))>=3&&len(strings.TrimSpace(m.Reason))<=500}

func withIdempotency[T any](ctx context.Context,db *sql.DB,m MutationContext,operation string,input any,work func(*sql.Tx)(T,error))(T,error){var zero T;payload,_:=json.Marshal(input);sum:=sha256.Sum256(payload);hash:=hex.EncodeToString(sum[:]);tx,err:=db.BeginTx(ctx,nil);if err!=nil{return zero,err};defer tx.Rollback();if _,err=tx.ExecContext(ctx,`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,m.ActorID+"|"+operation+"|"+m.IdempotencyKey);err!=nil{return zero,err};var storedHash string;var stored []byte;err=tx.QueryRowContext(ctx,`SELECT request_hash,response_body FROM dsh_platform_policy_mutation_results WHERE actor_id=$1 AND operation=$2 AND idempotency_key=$3`,m.ActorID,operation,m.IdempotencyKey).Scan(&storedHash,&stored);if err==nil{if storedHash!=hash{return zero,ErrIdempotencyConflict};var replay T;if err=json.Unmarshal(stored,&replay);err!=nil{return zero,err};if err=tx.Commit();err!=nil{return zero,err};return replay,nil};if !errors.Is(err,sql.ErrNoRows){return zero,err};result,err:=work(tx);if err!=nil{return zero,err};response,_:=json.Marshal(result);if _,err=tx.ExecContext(ctx,`INSERT INTO dsh_platform_policy_mutation_results(actor_id,operation,idempotency_key,request_hash,response_body) VALUES($1,$2,$3,$4,$5::jsonb)`,m.ActorID,operation,m.IdempotencyKey,hash,string(response));err!=nil{return zero,err};if err=tx.Commit();err!=nil{return zero,err};return result,nil}

func insertEvent(ctx context.Context,tx *sql.Tx,aggregateType,aggregateID,action string,m MutationContext,fromVersion any,toVersion int,payload any)error{body,_:=json.Marshal(payload);_,err:=tx.ExecContext(ctx,`INSERT INTO dsh_platform_policy_events(aggregate_type,aggregate_id,action,actor_id,actor_surface,correlation_id,reason,from_version,to_version,payload) VALUES($1,$2,$3,$4,$5,NULLIF($6,''),$7,$8,$9,$10::jsonb)`,aggregateType,aggregateID,action,m.ActorID,m.ActorSurface,m.CorrelationID,m.Reason,fromVersion,toVersion,string(body));return err}
