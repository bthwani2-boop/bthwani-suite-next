-- DSH-018: Retire the duplicate marketing banners/promos subsystem.
-- SSOT resolution: dsh_home_banners/dsh_home_promos (dsh.client.home-discovery,
-- migration dsh-002_home_discovery.sql) are the single canonical owner of home
-- banner/promo truth serving app-client. dsh_marketing_banners/dsh_marketing_promos
-- (created in dsh-012, governed in dsh-017) ended with zero UI consumers and
-- duplicated that truth. Their contract paths, backend routes/handlers and shared
-- controllers are removed in the same change; campaigns and the generic marketing
-- governance tables (audit/visibility gates/target bindings/impressions/clicks)
-- remain untouched.

DROP TABLE IF EXISTS dsh_marketing_banners;
DROP TABLE IF EXISTS dsh_marketing_promos;
