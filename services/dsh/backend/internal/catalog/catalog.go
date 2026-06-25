package catalog

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("catalog entity not found")
	ErrConflict = errors.New("catalog version conflict")
	ErrInvalid  = errors.New("invalid catalog input")
)

type Category struct {
	ID          string    `json:"id"`
	StoreID     string    `json:"storeId"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	SortOrder   int       `json:"sortOrder"`
	IsActive    bool      `json:"isActive"`
	Version     int       `json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Product struct {
	ID             string    `json:"id"`
	StoreID        string    `json:"storeId"`
	CategoryID     *string   `json:"categoryId"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	SKU            string    `json:"sku"`
	PriceReference string    `json:"priceReference"`
	IsActive       bool      `json:"isActive"`
	Version        int       `json:"version"`
	Media          []Media   `json:"media"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type Media struct {
	ID          string    `json:"id"`
	StoreID     string    `json:"storeId"`
	ProductID   *string   `json:"productId"`
	ObjectKey   string    `json:"objectKey"`
	ContentType string    `json:"contentType"`
	State       string    `json:"state"`
	PublicURL   *string   `json:"publicUrl"`
	Version     int       `json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CategoryInput struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	SortOrder       int    `json:"sortOrder"`
	IsActive        bool   `json:"isActive"`
	ExpectedVersion int    `json:"expectedVersion"`
}

type ProductInput struct {
	CategoryID      *string `json:"categoryId"`
	Name            string  `json:"name"`
	Description     string  `json:"description"`
	SKU             string  `json:"sku"`
	PriceReference  string  `json:"priceReference"`
	IsActive        bool    `json:"isActive"`
	ExpectedVersion int     `json:"expectedVersion"`
}

type UploadIntentInput struct {
	ProductID   *string `json:"productId"`
	FileName    string  `json:"fileName"`
	ContentType string  `json:"contentType"`
}

type CompleteMediaInput struct {
	PublicURL       string `json:"publicUrl"`
	ExpectedVersion int    `json:"expectedVersion"`
}

type DecisionInput struct {
	Decision        string `json:"decision"`
	Reason          string `json:"reason"`
	ExpectedVersion int    `json:"expectedVersion"`
}

type Revision struct {
	ID            string     `json:"id"`
	StoreID       string     `json:"storeId"`
	Revision      int        `json:"revision"`
	Status        string     `json:"status"`
	SubmittedBy   string     `json:"submittedBy"`
	ReviewedBy    *string    `json:"reviewedBy"`
	ReviewReason  string     `json:"reviewReason"`
	CorrelationID string     `json:"correlationId"`
	CreatedAt     time.Time  `json:"createdAt"`
	ReviewedAt    *time.Time `json:"reviewedAt"`
}

func PublicCatalog(ctx context.Context, db *sql.DB, storeID string) ([]Category, []Product, error) {
	var eligible bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
		  SELECT 1 FROM dsh_stores
		  WHERE id=$1 AND status='active' AND is_visible=true
		    AND serviceability_status IN ('serviceable','limited')
		    AND partner_readiness='ready'
		    AND catalog_approval_status='approved'
		    AND marketing_visibility='visible'
		)`, storeID).Scan(&eligible)
	if err != nil {
		return nil, nil, err
	}
	if !eligible {
		return nil, nil, ErrNotFound
	}
	categories, err := ListCategories(ctx, db, storeID, true)
	if err != nil {
		return nil, nil, err
	}
	products, err := ListProducts(ctx, db, storeID, true)
	return categories, products, err
}

func ListCategories(ctx context.Context, db *sql.DB, storeID string, activeOnly bool) ([]Category, error) {
	query := `SELECT id,store_id,name,description,sort_order,is_active,version,created_at,updated_at
		FROM dsh_catalog_categories WHERE store_id=$1`
	if activeOnly {
		query += " AND is_active=true"
	}
	query += " ORDER BY sort_order,name"
	rows, err := db.QueryContext(ctx, query, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Category{}
	for rows.Next() {
		var item Category
		if err := rows.Scan(&item.ID, &item.StoreID, &item.Name, &item.Description, &item.SortOrder, &item.IsActive, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func ListProducts(ctx context.Context, db *sql.DB, storeID string, activeOnly bool) ([]Product, error) {
	query := `SELECT id,store_id,category_id,name,description,sku,price_reference,is_active,version,created_at,updated_at
		FROM dsh_catalog_products WHERE store_id=$1`
	if activeOnly {
		query += " AND is_active=true"
	}
	query += " ORDER BY name"
	rows, err := db.QueryContext(ctx, query, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Product{}
	for rows.Next() {
		var item Product
		if err := rows.Scan(&item.ID, &item.StoreID, &item.CategoryID, &item.Name, &item.Description, &item.SKU, &item.PriceReference, &item.IsActive, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		media, err := listMedia(ctx, db, storeID, item.ID, activeOnly)
		if err != nil {
			return nil, err
		}
		item.Media = media
		items = append(items, item)
	}
	return items, rows.Err()
}

func UpsertCategory(ctx context.Context, db *sql.DB, actorID, actorRole, storeID, categoryID, correlationID string, input CategoryInput) (Category, error) {
	if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(correlationID) == "" {
		return Category{}, ErrInvalid
	}
	if categoryID == "" {
		categoryID = entityID("category")
		_, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_categories
			(id,store_id,name,description,sort_order,is_active) VALUES($1,$2,$3,$4,$5,$6)`,
			categoryID, storeID, strings.TrimSpace(input.Name), strings.TrimSpace(input.Description), input.SortOrder, input.IsActive)
		if err != nil {
			return Category{}, err
		}
	} else {
		result, err := db.ExecContext(ctx, `UPDATE dsh_catalog_categories SET
			name=$1,description=$2,sort_order=$3,is_active=$4,version=version+1,updated_at=now()
			WHERE id=$5 AND store_id=$6 AND version=$7`,
			strings.TrimSpace(input.Name), strings.TrimSpace(input.Description), input.SortOrder, input.IsActive,
			categoryID, storeID, input.ExpectedVersion)
		if err != nil {
			return Category{}, err
		}
		if n, _ := result.RowsAffected(); n != 1 {
			return Category{}, ErrConflict
		}
	}
	item, err := getCategory(ctx, db, storeID, categoryID)
	if err == nil {
		err = audit(ctx, db, actorID, actorRole, storeID, "category.upsert", "category", categoryID, correlationID, "", item)
	}
	return item, err
}

func DeleteCategory(ctx context.Context, db *sql.DB, actorID, actorRole, storeID, categoryID, correlationID string, expectedVersion int) error {
	result, err := db.ExecContext(ctx, `DELETE FROM dsh_catalog_categories WHERE id=$1 AND store_id=$2 AND version=$3`, categoryID, storeID, expectedVersion)
	if err != nil {
		return err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return ErrConflict
	}
	return audit(ctx, db, actorID, actorRole, storeID, "category.delete", "category", categoryID, correlationID, "", map[string]any{"deleted": true})
}

func UpsertProduct(ctx context.Context, db *sql.DB, actorID, actorRole, storeID, productID, correlationID string, input ProductInput) (Product, error) {
	if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.SKU) == "" || strings.TrimSpace(input.PriceReference) == "" {
		return Product{}, ErrInvalid
	}
	if productID == "" {
		productID = entityID("product")
		_, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_products
			(id,store_id,category_id,name,description,sku,price_reference,is_active)
			VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
			productID, storeID, input.CategoryID, strings.TrimSpace(input.Name), strings.TrimSpace(input.Description),
			strings.TrimSpace(input.SKU), strings.TrimSpace(input.PriceReference), input.IsActive)
		if err != nil {
			return Product{}, err
		}
	} else {
		result, err := db.ExecContext(ctx, `UPDATE dsh_catalog_products SET
			category_id=$1,name=$2,description=$3,sku=$4,price_reference=$5,is_active=$6,
			version=version+1,updated_at=now()
			WHERE id=$7 AND store_id=$8 AND version=$9`,
			input.CategoryID, strings.TrimSpace(input.Name), strings.TrimSpace(input.Description),
			strings.TrimSpace(input.SKU), strings.TrimSpace(input.PriceReference), input.IsActive,
			productID, storeID, input.ExpectedVersion)
		if err != nil {
			return Product{}, err
		}
		if n, _ := result.RowsAffected(); n != 1 {
			return Product{}, ErrConflict
		}
	}
	item, err := getProduct(ctx, db, storeID, productID)
	if err == nil {
		err = audit(ctx, db, actorID, actorRole, storeID, "product.upsert", "product", productID, correlationID, "", item)
	}
	return item, err
}

func DeleteProduct(ctx context.Context, db *sql.DB, actorID, actorRole, storeID, productID, correlationID string, expectedVersion int) error {
	result, err := db.ExecContext(ctx, `DELETE FROM dsh_catalog_products WHERE id=$1 AND store_id=$2 AND version=$3`, productID, storeID, expectedVersion)
	if err != nil {
		return err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return ErrConflict
	}
	return audit(ctx, db, actorID, actorRole, storeID, "product.delete", "product", productID, correlationID, "", map[string]any{"deleted": true})
}

func CreateUploadIntent(ctx context.Context, db *sql.DB, actorID, actorRole, storeID, correlationID string, input UploadIntentInput) (Media, string, error) {
	if strings.TrimSpace(input.FileName) == "" || !strings.HasPrefix(input.ContentType, "image/") {
		return Media{}, "", ErrInvalid
	}
	id := entityID("media")
	objectKey := fmt.Sprintf("catalog/%s/%s/%s", storeID, id, sanitizeFileName(input.FileName))
	_, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_media(id,store_id,product_id,object_key,content_type)
		VALUES($1,$2,$3,$4,$5)`, id, storeID, input.ProductID, objectKey, input.ContentType)
	if err != nil {
		return Media{}, "", err
	}
	item, err := getMedia(ctx, db, storeID, id)
	if err != nil {
		return Media{}, "", err
	}
	if err := audit(ctx, db, actorID, actorRole, storeID, "media.intent.create", "media", id, correlationID, "", item); err != nil {
		return Media{}, "", err
	}
	return item, "http://localhost:59000/dsh-media/" + objectKey, nil
}

func CompleteMedia(ctx context.Context, db *sql.DB, actorID, actorRole, storeID, mediaID, correlationID string, input CompleteMediaInput) (Media, error) {
	if strings.TrimSpace(input.PublicURL) == "" || input.ExpectedVersion < 1 {
		return Media{}, ErrInvalid
	}
	result, err := db.ExecContext(ctx, `UPDATE dsh_catalog_media SET state='complete',public_url=$1,
		version=version+1,updated_at=now() WHERE id=$2 AND store_id=$3 AND version=$4 AND state='pending'`,
		input.PublicURL, mediaID, storeID, input.ExpectedVersion)
	if err != nil {
		return Media{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return Media{}, ErrConflict
	}
	item, err := getMedia(ctx, db, storeID, mediaID)
	if err == nil {
		err = audit(ctx, db, actorID, actorRole, storeID, "media.complete", "media", mediaID, correlationID, "", item)
	}
	return item, err
}

func DeleteMedia(ctx context.Context, db *sql.DB, actorID, actorRole, storeID, mediaID, correlationID string, expectedVersion int) error {
	result, err := db.ExecContext(ctx, `UPDATE dsh_catalog_media SET state='deleted',public_url=NULL,
		version=version+1,updated_at=now() WHERE id=$1 AND store_id=$2 AND version=$3 AND state<>'deleted'`,
		mediaID, storeID, expectedVersion)
	if err != nil {
		return err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return ErrConflict
	}
	return audit(ctx, db, actorID, actorRole, storeID, "media.delete", "media", mediaID, correlationID, "", map[string]any{"state": "deleted"})
}

func Submit(ctx context.Context, db *sql.DB, actorID, storeID, correlationID string) (Revision, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Revision{}, err
	}
	defer tx.Rollback()
	var count int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_catalog_products WHERE store_id=$1 AND is_active=true`, storeID).Scan(&count); err != nil {
		return Revision{}, err
	}
	if count == 0 {
		return Revision{}, fmt.Errorf("%w: active product required", ErrInvalid)
	}
	var revision int
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(revision),0)+1 FROM dsh_catalog_revisions WHERE store_id=$1`, storeID).Scan(&revision); err != nil {
		return Revision{}, err
	}
	id := entityID("revision")
	_, err = tx.ExecContext(ctx, `INSERT INTO dsh_catalog_revisions
		(id,store_id,revision,status,submitted_by,correlation_id)
		VALUES($1,$2,$3,'submitted',$4,$5)`, id, storeID, revision, actorID, correlationID)
	if err != nil {
		return Revision{}, err
	}
	_, err = tx.ExecContext(ctx, `UPDATE dsh_stores SET catalog_approval_status='submitted',
		version=version+1,updated_at=now() WHERE id=$1`, storeID)
	if err != nil {
		return Revision{}, err
	}
	if err := tx.Commit(); err != nil {
		return Revision{}, err
	}
	return getRevision(ctx, db, id)
}

func Decide(ctx context.Context, db *sql.DB, actorID, storeID, correlationID string, input DecisionInput) (Revision, error) {
	if (input.Decision != "approved" && input.Decision != "rejected") || len(strings.TrimSpace(input.Reason)) < 3 {
		return Revision{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Revision{}, err
	}
	defer tx.Rollback()
	var id string
	err = tx.QueryRowContext(ctx, `SELECT id FROM dsh_catalog_revisions
		WHERE store_id=$1 AND status='submitted' ORDER BY revision DESC LIMIT 1 FOR UPDATE`, storeID).Scan(&id)
	if err == sql.ErrNoRows {
		return Revision{}, ErrNotFound
	}
	if err != nil {
		return Revision{}, err
	}
	result, err := tx.ExecContext(ctx, `UPDATE dsh_stores SET catalog_approval_status=$1,
		version=version+1,updated_at=now() WHERE id=$2 AND version=$3`,
		input.Decision, storeID, input.ExpectedVersion)
	if err != nil {
		return Revision{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return Revision{}, ErrConflict
	}
	_, err = tx.ExecContext(ctx, `UPDATE dsh_catalog_revisions SET status=$1,reviewed_by=$2,
		review_reason=$3,reviewed_at=now() WHERE id=$4`, input.Decision, actorID, strings.TrimSpace(input.Reason), id)
	if err != nil {
		return Revision{}, err
	}
	if err := tx.Commit(); err != nil {
		return Revision{}, err
	}
	return getRevision(ctx, db, id)
}

func ListSubmissions(ctx context.Context, db *sql.DB) ([]Revision, error) {
	rows, err := db.QueryContext(ctx, `SELECT id,store_id,revision,status,submitted_by,reviewed_by,
		review_reason,correlation_id,created_at,reviewed_at FROM dsh_catalog_revisions
		ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Revision{}
	for rows.Next() {
		item, err := scanRevision(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func ListAudit(ctx context.Context, db *sql.DB, storeID string) ([]map[string]any, error) {
	rows, err := db.QueryContext(ctx, `SELECT id,actor_id,actor_role,action,entity_type,entity_id,
		from_state,to_state,reason,correlation_id,created_at FROM dsh_catalog_audit
		WHERE store_id=$1 ORDER BY created_at DESC LIMIT 100`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var id, actorID, role, action, entityType, entityID, reason, correlationID string
		var before, after []byte
		var createdAt time.Time
		if err := rows.Scan(&id, &actorID, &role, &action, &entityType, &entityID, &before, &after, &reason, &correlationID, &createdAt); err != nil {
			return nil, err
		}
		var fromState, toState any
		_ = json.Unmarshal(before, &fromState)
		_ = json.Unmarshal(after, &toState)
		items = append(items, map[string]any{"id": id, "actorId": actorID, "actorRole": role, "action": action,
			"entityType": entityType, "entityId": entityID, "fromState": fromState, "toState": toState,
			"reason": reason, "correlationId": correlationID, "createdAt": createdAt})
	}
	return items, rows.Err()
}

func getCategory(ctx context.Context, db *sql.DB, storeID, id string) (Category, error) {
	var item Category
	err := db.QueryRowContext(ctx, `SELECT id,store_id,name,description,sort_order,is_active,version,created_at,updated_at
		FROM dsh_catalog_categories WHERE store_id=$1 AND id=$2`, storeID, id).
		Scan(&item.ID, &item.StoreID, &item.Name, &item.Description, &item.SortOrder, &item.IsActive, &item.Version, &item.CreatedAt, &item.UpdatedAt)
	if err == sql.ErrNoRows {
		err = ErrNotFound
	}
	return item, err
}

func getProduct(ctx context.Context, db *sql.DB, storeID, id string) (Product, error) {
	var item Product
	err := db.QueryRowContext(ctx, `SELECT id,store_id,category_id,name,description,sku,price_reference,is_active,version,created_at,updated_at
		FROM dsh_catalog_products WHERE store_id=$1 AND id=$2`, storeID, id).
		Scan(&item.ID, &item.StoreID, &item.CategoryID, &item.Name, &item.Description, &item.SKU, &item.PriceReference, &item.IsActive, &item.Version, &item.CreatedAt, &item.UpdatedAt)
	if err == sql.ErrNoRows {
		return item, ErrNotFound
	}
	if err == nil {
		item.Media, err = listMedia(ctx, db, storeID, id, false)
	}
	return item, err
}

func listMedia(ctx context.Context, db *sql.DB, storeID, productID string, completeOnly bool) ([]Media, error) {
	query := `SELECT id,store_id,product_id,object_key,content_type,state,public_url,version,created_at,updated_at
		FROM dsh_catalog_media WHERE store_id=$1 AND product_id=$2`
	if completeOnly {
		query += " AND state='complete'"
	}
	query += " ORDER BY created_at"
	rows, err := db.QueryContext(ctx, query, storeID, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Media{}
	for rows.Next() {
		var item Media
		if err := rows.Scan(&item.ID, &item.StoreID, &item.ProductID, &item.ObjectKey, &item.ContentType, &item.State, &item.PublicURL, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func getMedia(ctx context.Context, db *sql.DB, storeID, id string) (Media, error) {
	var item Media
	err := db.QueryRowContext(ctx, `SELECT id,store_id,product_id,object_key,content_type,state,public_url,version,created_at,updated_at
		FROM dsh_catalog_media WHERE store_id=$1 AND id=$2`, storeID, id).
		Scan(&item.ID, &item.StoreID, &item.ProductID, &item.ObjectKey, &item.ContentType, &item.State, &item.PublicURL, &item.Version, &item.CreatedAt, &item.UpdatedAt)
	if err == sql.ErrNoRows {
		err = ErrNotFound
	}
	return item, err
}

func getRevision(ctx context.Context, db *sql.DB, id string) (Revision, error) {
	return scanRevision(db.QueryRowContext(ctx, `SELECT id,store_id,revision,status,submitted_by,reviewed_by,
		review_reason,correlation_id,created_at,reviewed_at FROM dsh_catalog_revisions WHERE id=$1`, id))
}

func scanRevision(scanner interface{ Scan(...any) error }) (Revision, error) {
	var item Revision
	err := scanner.Scan(&item.ID, &item.StoreID, &item.Revision, &item.Status, &item.SubmittedBy,
		&item.ReviewedBy, &item.ReviewReason, &item.CorrelationID, &item.CreatedAt, &item.ReviewedAt)
	return item, err
}

func audit(ctx context.Context, db *sql.DB, actorID, actorRole, storeID, action, entityType, entityID, correlationID, reason string, state any) error {
	body, _ := json.Marshal(state)
	_, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_audit
		(id,store_id,actor_id,actor_role,action,entity_type,entity_id,to_state,reason,correlation_id)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
		entityID+"-audit-"+fmt.Sprint(time.Now().UnixNano()), storeID, actorID, actorRole, action,
		entityType, entityID, string(body), reason, correlationID)
	return err
}

func entityID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

func sanitizeFileName(value string) string {
	value = strings.ReplaceAll(strings.TrimSpace(value), "\\", "-")
	value = strings.ReplaceAll(value, "/", "-")
	value = strings.ReplaceAll(value, "..", "-")
	return value
}
