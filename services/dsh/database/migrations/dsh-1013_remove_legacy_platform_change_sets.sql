-- DSH no longer owns platform change-set lifecycle or persistence.
-- Platform Control is the sole canonical owner of platform change sets,
-- including validation, approval, application, audit and readback.
-- dsh-991 remains immutable history; this forward migration removes its
-- retired table after all runtime writers and readers were removed.
DROP TABLE IF EXISTS dsh_platform_change_sets;
