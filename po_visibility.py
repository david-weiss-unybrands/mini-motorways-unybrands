import json
from datetime import datetime, timedelta

from airflow import DAG
from airflow.exceptions import AirflowException
from airflow.models import Variable
from airflow.operators.python_operator import PythonOperator
from common.slack import on_failure
from google.cloud import bigquery, storage

PROJECT_ID = Variable.get("PROJECT_ID")
DATASET = "prod"
CURRENT_DATE = datetime.now().strftime("%Y-%m-%d")
FILENAME_MAPPING = f"location_brand_marketplace_{CURRENT_DATE}.csv"
GCS_KEY = "marketplace_mapping"
ENV = Variable.get("airflow_env")
JSON_VARS = json.loads(Variable.get("dag_vars"))
GCP_BUCKET = JSON_VARS["environment"][ENV]["global"]["GCS_BUCKET"]
BRAND_MAPPING_TMP = f"{PROJECT_ID}.{DATASET}.location_brand_marketplace_mapping_tmp"
BRAND_MAPPING = f"{PROJECT_ID}.{DATASET}.location_brand_marketplace_mapping"
INVENTORY_BY_MKT = f"{PROJECT_ID}.{DATASET}.inventory_by_marketplace_tmp"
PO_VIS_TMP = f"{PROJECT_ID}.{DATASET}.po_visibility_3pls_tmp"
PO_VIS = f"{PROJECT_ID}.{DATASET}.po_visibility_3pls"
PO_VIS_HIS = f"{PROJECT_ID}.{DATASET}.po_visibility_3pls_historical"
ERP_MAPPING = f"{PROJECT_ID}.{DATASET}.erp_mapping"
CONSOLIDATED_INVENTORY = f"{PROJECT_ID}.{DATASET}.consolidated_inventory"
FLIBER_FORECAST = f"{PROJECT_ID}.{DATASET}.flbr_raw_forecast_monthly"
USIN_ASIN_MAPPING = f"{PROJECT_ID}.{DATASET}.asin_usin_mapping_tmp"
PO_INV_PERF_VISIBILITY_TMP = f"{PROJECT_ID}.{DATASET}.po_inventory_performance_3pls_tmp"
PO_INV_PERF_VISIBILITY = f"{PROJECT_ID}.{DATASET}.po_inventory_performance_3pls"
PO_INV_PERF_VIS_HIS = f"{PROJECT_ID}.{DATASET}.po_inventory_performance_3pls_historical"
SHIPMENT_DATA = f"{PROJECT_ID}.ns_curate.ns_inship_cons_v"
ANVYL_INV_VIEW = f"{PROJECT_ID}.{DATASET}.anvyl_inv_po_view"
ORDERS_DATA = f"{PROJECT_ID}.ns_curate.ns_po_cons_v"
SHIPMENT_QTY = f"{PROJECT_ID}.ns_curate.inship_qty"
ANVYL_INV_TMP = f"{PROJECT_ID}.{DATASET}.anvyl_inventory_tmp"
USD_SALES = f"{PROJECT_ID}.{DATASET}.ft_usd_sales"
SALES_DATA = f"{PROJECT_ID}.{DATASET}.sales_data_tmp"
ITEM_MASTER = f"{PROJECT_ID}.{DATASET}.erp_item_master"
COGS_DATA = f"{PROJECT_ID}.{DATASET}.cogs_data_tmp"
FORECASTED_YEAR_TMP = f"{PROJECT_ID}.{DATASET}.forecasted_year_tmp"
STANDARD_COSTS = f"{PROJECT_ID}.manual_data.man_standard_costs"
ASIN_SHORT_NAMES = f"{PROJECT_ID}.manual_data.man_asin_short_names"
CHILD_TIERS = f"{PROJECT_ID}.analytics_manual_data.gs_child_tiers"
SC_PLANNING_PARAM =f"{PROJECT_ID}.analytics_manual_data.sc_master_planning_param"
SC_SAFETY_LEVEL = f"{PROJECT_ID}.analytics_manual_data.sc_master_safety_level"
SC_SAFETY_EXCEPTION = f"{PROJECT_ID}.analytics_manual_data.sc_master_safety_exception"
ITEM_VENDOR_MASTER = f"{PROJECT_ID}.prod.erp_item_vendor_master"
SC_PROD_LT = f"{PROJECT_ID}.analytics_manual_data.sc_master_prod_lt"
SC_TRANS_LT = f"{PROJECT_ID}.analytics_manual_data.sc_master_trans_lt"
SC_OTHER = f"{PROJECT_ID}.analytics_manual_data.sc_master_other"
REPORT_GLOBAL_METRICS = f"{PROJECT_ID}.{DATASET}.report_global_metrics"


def run_statements(query) -> str:
    try:
        print(f'Running query:\n{query}')
        client = bigquery.Client()
        job = client.query(query=query)
        job.result()
    except Exception as e:
        raise AirflowException(e)
    return "Statements executed."


def check_mapping_file_existence() -> str:
    path_key = f"{GCS_KEY}/{FILENAME_MAPPING}"
    storage_client = storage.Client()
    bucket = storage_client.bucket(GCP_BUCKET)
    stats = storage.Blob(bucket=bucket, name=path_key).exists(storage_client)
    if stats:
        load_tmp_mapping = f"""
DROP TABLE IF EXISTS {BRAND_MAPPING_TMP};
CREATE TABLE IF NOT EXISTS {BRAND_MAPPING_TMP}
(
    location_code STRING
    ,brand STRING
    ,marketplace STRING
    ,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
LOAD DATA OVERWRITE {BRAND_MAPPING_TMP}
(
    location_code STRING
    ,brand STRING
    ,marketplace STRING
)
FROM FILES (
  format = 'CSV',
  skip_leading_rows = 1,
  uris = ['gs://{GCP_BUCKET}/{GCS_KEY}/{FILENAME_MAPPING}']);
"""
        refresh_mapping = f"""
DROP TABLE IF EXISTS {BRAND_MAPPING};
CREATE TABLE IF NOT EXISTS {BRAND_MAPPING}
(
    location_code STRING
    ,brand STRING
    ,marketplace STRING
    ,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
INSERT INTO {BRAND_MAPPING}
    (location_code, brand, marketplace)
SELECT location_code, brand, marketplace
FROM {BRAND_MAPPING_TMP};
DROP TABLE IF EXISTS {BRAND_MAPPING_TMP};
"""
        run_statements(load_tmp_mapping)
        run_statements(refresh_mapping)
        return f"Mapping table {BRAND_MAPPING} updated"
    return f"No updates for the mapping table {BRAND_MAPPING}"


def create_po_visibility_tmp() -> str:
    inv_by_mkt = f"""
CREATE OR REPLACE VIEW {INVENTORY_BY_MKT} AS (
WITH ERP_TPL_MAPPING_ACTIVE AS(
    SELECT ASIN, USIN,
            country_code AS MARKETPLACE,
            CASE
                WHEN country_code IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR')
                    THEN 'EU'
                WHEN country_code = 'GB' THEN 'UK'
                WHEN country_code IN ('MX', 'US') THEN 'NA'
                ELSE country_code
            END REGION
    FROM {ERP_MAPPING} em
    WHERE MPN IS NOT NULL
        AND USIN IS NOT NULL
        AND ASIN IS NOT NULL
        AND CHANNEL = 'Amazon FBA'
        AND active_listing
        AND NOT inactive
    GROUP BY 1, 2, 3, 4
), ERP_FBA_MAPPING_ACTIVE AS (
    SELECT MSKU SKU, ASIN, USIN,
            country_code AS MARKETPLACE,
            CASE
                WHEN country_code IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR')
                    THEN 'EU'
                WHEN country_code = 'GB' THEN 'UK'
                WHEN country_code IN ('MX', 'US') THEN 'NA'
                ELSE country_code
            END REGION
    FROM {ERP_MAPPING} em
    WHERE MSKU IS NOT NULL
        AND USIN IS NOT NULL
        AND ASIN IS NOT NULL
        AND CHANNEL = 'Amazon FBA'
        AND active_listing
        AND NOT inactive
    GROUP BY 1, 2, 3, 4, 5
), CONSOLIDATED_INVENTORY_TPL_MARKETPLACE AS (
    WITH brand_location_mapping AS (
        SELECT location_code, brand, marketplace,
            count(*) OVER(PARTITION BY location_code, brand) AS market_count
        FROM {BRAND_MAPPING}
    ), ci_tpl_brand AS (
        SELECT ci.usin, ci.location_code, ci.brand,
            ci.sku, ci.available, ci.available_raw,
            ci.fc_transfer, ci.fc_processing,
            ci.intransit, ci.allocated, ci.unfulfillable
        FROM {CONSOLIDATED_INVENTORY} ci
        WHERE ci.location_code NOT LIKE 'FBA%'
    ),ci_tpl_marketplace_prio_low AS (
        SELECT ci.location_code, bmm.marketplace,
                bmm.market_count > 1 AS multi_market,
                ci.brand,
                ci.usin,
                tma1.asin,
                CASE
                    WHEN tma1.usin IS NULL OR tma1.asin IS NULL THEN 1
                    ELSE 5
                END AS prio,
                ci.sku, ci.available, ci.available_raw,
                ci.fc_transfer, ci.fc_processing,
                ci.intransit, ci.allocated, ci.unfulfillable
        FROM ci_tpl_brand ci
        LEFT JOIN brand_location_mapping bmm
            ON bmm.location_code  = ci.location_code
            AND bmm.brand = ci.brand
        LEFT JOIN ERP_TPL_MAPPING_ACTIVE tma1
            ON tma1.usin = ci.usin
            AND tma1.region = bmm.marketplace
    ),ci_tpl_marketplace_prio_high AS (
        SELECT ci.location_code, bmm.marketplace,
                bmm.market_count > 1 AS multi_market,
                ci.brand,
                ci.usin,
                tma1.asin,
                CASE
                    WHEN tma1.usin IS NULL OR tma1.asin IS NULL THEN 3
                    ELSE 15
                END AS prio,
                ci.sku, ci.available, ci.available_raw,
                ci.fc_transfer, ci.fc_processing,
                ci.intransit, ci.allocated, ci.unfulfillable
        FROM ci_tpl_brand ci
        LEFT JOIN brand_location_mapping bmm
            ON bmm.location_code  = ci.location_code
            AND bmm.brand = ci.brand
        LEFT JOIN ERP_TPL_MAPPING_ACTIVE tma1
            ON tma1.usin = ci.usin
            AND tma1.marketplace = bmm.marketplace
    ), ci_tpl_marketplace_selection AS (
        SELECT location_code, marketplace,
                multi_market,
                brand,
                usin,
                asin,
                prio,
                sku, available, available_raw,
                fc_transfer, fc_processing,
                intransit, allocated, unfulfillable
        FROM ci_tpl_marketplace_prio_low cil
        UNION ALL
        SELECT location_code, marketplace,
                multi_market,
                brand,
                usin,
                asin,
                prio,
                sku, available, available_raw,
                fc_transfer, fc_processing,
                intransit, allocated, unfulfillable
        FROM ci_tpl_marketplace_prio_high cih
    ), ci_tpl_marketplace_filtered AS (
        SELECT location_code, marketplace, multi_market, brand, usin, asin,
                ROW_NUMBER() OVER (PARTITION BY
                            sku, usin, marketplace, location_code ORDER BY prio DESC) r_num,
                prio, sku, available, available_raw,
                fc_transfer, fc_processing,
                intransit, allocated, unfulfillable
        FROM ci_tpl_marketplace_selection
    )
        SELECT location_code, marketplace, multi_market, brand, usin, asin,
                sku, available, available_raw,
                fc_transfer, fc_processing,
                intransit, allocated, unfulfillable
        FROM ci_tpl_marketplace_filtered
        WHERE r_num = 1
), CONSOLIDATED_INVENTORY_FBA_MARKETPLACE AS (
    WITH brand_location_mapping AS (
        SELECT location_code, brand, marketplace,
                count(*) OVER(PARTITION BY location_code, brand) AS market_count
        FROM {BRAND_MAPPING}
    ), ci_fba_brand AS (
        SELECT  ci.usin, ci.location_code, COALESCE(im.brand,ci.brand) brand,
                ci.sku, ci.available, ci.available_raw, ci.fc_transfer,
                ci.fc_processing, ci.intransit, ci.allocated, ci.unfulfillable
        FROM {CONSOLIDATED_INVENTORY} ci
        LEFT JOIN {ITEM_MASTER} im
            ON im.sku = ci.sku
        WHERE ci.location_code LIKE 'FBA%'
    ),ci_fba_marketplace_prio_low AS (
        SELECT ci.location_code, COALESCE(bmm.marketplace, RIGHT(ci.location_code, 2)) AS marketplace,
                bmm.market_count > 1 AS multi_market,
                ci.brand,
                ci.usin,
                fma1.asin,
                CASE
                    WHEN fma1.usin IS NULL OR fma1.asin IS NULL THEN 1
                    ELSE 5
                END AS prio,
                ci.sku, ci.available, ci.available_raw, ci.fc_transfer,
                ci.fc_processing, ci.intransit, ci.allocated, ci.unfulfillable
        FROM ci_fba_brand ci
        LEFT JOIN brand_location_mapping bmm
            ON bmm.location_code  = ci.location_code
            AND bmm.brand = ci.brand
        LEFT JOIN ERP_FBA_MAPPING_ACTIVE fma1
            ON fma1.sku = ci.sku
            AND fma1.region = COALESCE(bmm.marketplace, RIGHT(ci.location_code, 2))
    ),ci_fba_marketplace_prio_high AS (
        SELECT ci.location_code, COALESCE(bmm.marketplace, RIGHT(ci.location_code, 2)) AS marketplace,
                bmm.market_count > 1 AS multi_market,
                ci.brand,
                ci.usin,
                fma1.asin,
                CASE
                    WHEN fma1.usin IS NULL OR fma1.asin IS NULL THEN 3
                    ELSE 15
                END AS prio,
                ci.sku, ci.available, ci.available_raw, ci.fc_transfer,
                ci.fc_processing, ci.intransit, ci.allocated, ci.unfulfillable
        FROM ci_fba_brand ci
        LEFT JOIN brand_location_mapping bmm
            ON bmm.location_code  = ci.location_code
            AND bmm.brand = ci.brand
        LEFT JOIN ERP_FBA_MAPPING_ACTIVE fma1
            ON fma1.sku = ci.sku
            AND fma1.marketplace = COALESCE(bmm.marketplace, RIGHT(ci.location_code, 2))
    ), ci_fba_marketplace_selection AS (
        SELECT location_code, marketplace,
                multi_market,
                brand,
                usin,
                asin,
                prio,
                sku,
                available, available_raw,
                fc_transfer, fc_processing,
                intransit, allocated, unfulfillable
        FROM ci_fba_marketplace_prio_low cil
        UNION ALL
        SELECT location_code, marketplace,
                multi_market,
                brand,
                usin,
                asin,
                prio,
                sku,
                available, available_raw,
                fc_transfer, fc_processing,
                intransit, allocated, unfulfillable
        FROM ci_fba_marketplace_prio_high cih
    ), ci_fba_marketplace_filtered AS (
        SELECT location_code, marketplace, multi_market, brand, usin, asin,
                ROW_NUMBER() OVER (PARTITION BY
                            sku, usin, marketplace, location_code ORDER BY prio DESC) r_num,
                prio, sku, available, available_raw,
                fc_transfer, fc_processing,
                intransit, allocated, unfulfillable
        FROM ci_fba_marketplace_selection
    )
        SELECT location_code, marketplace, multi_market, brand, usin, asin,
                sku, available, available_raw,
                fc_transfer, fc_processing,
                intransit, allocated, unfulfillable
        FROM ci_fba_marketplace_filtered
        WHERE r_num = 1
), CONSOLIDATED_INVENTORY_MARKETPLACE AS (
    WITH inventory_tpl_region_raw AS (
        SELECT location_code,
                CASE
                    WHEN marketplace IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                    'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                    'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                    'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR')
                        THEN 'EU'
                    WHEN marketplace = 'GB' THEN 'UK'
                    WHEN marketplace IN ('MX', 'US') THEN 'NA'
                    ELSE marketplace
                END AS marketplace,
            multi_market, brand, usin, asin,
            sum(available) available,
            sum(available_raw) available_raw,
            sum(fc_transfer) fc_transfer,
            sum(fc_processing) fc_processing,
            sum(intransit) intransit,
            sum(allocated) allocated,
            sum(unfulfillable) unfulfillable
        FROM CONSOLIDATED_INVENTORY_TPL_MARKETPLACE
        GROUP BY 1,2,3,4,5,6
    ), inventory_fba_region_raw AS (
        SELECT location_code,
                CASE
                    WHEN marketplace IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                    'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                    'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                    'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR')
                        THEN 'EU'
                    WHEN marketplace = 'GB' THEN 'UK'
                    WHEN marketplace IN ('MX', 'US') THEN 'NA'
                    ELSE marketplace
                END AS marketplace,
                multi_market, brand, usin, asin,
                NULL AS usin_by_mkt,
                sum(available) available,
                sum(available_raw) available_raw,
                sum(fc_transfer) fc_transfer,
                sum(fc_processing) fc_processing,
                sum(intransit) intransit,
                sum(allocated) allocated,
                sum(unfulfillable) unfulfillable
        FROM CONSOLIDATED_INVENTORY_FBA_MARKETPLACE
        GROUP BY 1,2,3,4,5,6
    ), inventory_tpl_region AS (
        SELECT location_code, marketplace, multi_market, brand, usin, asin,
                available, available_raw, fc_transfer, fc_processing,
                intransit, allocated, unfulfillable,
                count(*) OVER (PARTITION BY usin, location_code) AS usin_by_mkt
        FROM inventory_tpl_region_raw
    )
    SELECT location_code, marketplace, multi_market, brand, usin, asin, usin_by_mkt,
            available, available_raw, fc_transfer, fc_processing,
            intransit, allocated, unfulfillable
    FROM inventory_tpl_region
    UNION ALL
    SELECT location_code, marketplace, multi_market, brand, usin, asin, usin_by_mkt,
            available, available_raw, fc_transfer, fc_processing,
            intransit, allocated, unfulfillable
    FROM inventory_fba_region_raw
), INVENTORY_BY_MARKETPLACE AS (
    WITH forecast_marketplace_mapping AS (
        SELECT product_code,
                CASE WHEN right(frf.account_label,2) IN ('NA', 'MX', 'US') THEN 'NA'
                 WHEN right(frf.account_label,2) IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                                    'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                                    'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                                    'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR') THEN 'EU'
                ELSE right(frf.account_label,2)
            END as marketplace,
            units
        FROM {FLIBER_FORECAST} frf
        WHERE account_label like '%AMZ%'
            AND account_label IS NOT NULL
            AND product_status != 'inactive'
    ), forecast_data AS (
        SELECT DISTINCT aum.usin,
                frf.marketplace,
                sum(frf.units) AS units
        FROM forecast_marketplace_mapping frf
        INNER JOIN {USIN_ASIN_MAPPING} aum
            ON aum.asin = frf.product_code
            AND aum.marketplace = frf.marketplace
        GROUP BY 1,2
    ), forecast_multi_marketk AS (
        SELECT fd.usin, mp.marketplace, fd.units, mp.location_code, mp.multi_market
        FROM forecast_data fd
        INNER JOIN CONSOLIDATED_INVENTORY_MARKETPLACE mp
            ON mp.usin = fd.usin
            AND  fd.marketplace = mp.marketplace
        GROUP BY 1,2,3,4,5
    ), mapping_forecast AS (
        SELECT usin, marketplace, location_code,
                CASE
                    WHEN multi_market AND sum(units) OVER(PARTITION BY usin, location_code) != 0
                        THEN sum(units) OVER(PARTITION BY usin, marketplace, location_code)/
                            sum(units) OVER(PARTITION BY usin, location_code)
                    WHEN multi_market AND sum(units) OVER(PARTITION BY usin, location_code) = 0
                        THEN 1 / count(usin) OVER(PARTITION BY usin, location_code)
                    WHEN NOT multi_market THEN 1
                ELSE 0 END AS tpl_ratio
        FROM forecast_multi_marketk fmm
    ), mapping_data AS (
        SELECT DISTINCT mp.usin, mp.asin, mp.marketplace, mp.location_code,
            CASE
                WHEN NOT multi_market
                        AND mp.marketplace IS NULL
                    THEN 1
                WHEN multi_market
                        AND mp.marketplace IS NOT NULL
                        AND tpl_ratio > 0
                    THEN tpl_ratio
                WHEN mp.usin_by_mkt > 1
                        AND COALESCE(tpl_ratio,0) = 0
                    THEN (1 - sum(COALESCE(tpl_ratio,0)) OVER (PARTITION BY mp.usin, mp.location_code))
                        / (mp.usin_by_mkt-
                            sum(CASE WHEN COALESCE(tpl_ratio,0)=0 THEN 0 ELSE 1 END)
                                OVER (PARTITION BY mp.usin, mp.location_code))
                ELSE 1/mp.usin_by_mkt
            END tpl_ratio
        FROM CONSOLIDATED_INVENTORY_MARKETPLACE mp
        LEFT JOIN mapping_forecast mf
            ON mp.usin = mf.usin
            AND mp.marketplace = mf.marketplace
            AND mp.location_code = mf.location_code
        WHERE (substring(mp.usin, 5, 1) = 'F'
                OR substring(mp.usin, 5, 1) = 'A')
            AND mp.location_code NOT LIKE 'FBA%'
    )
    SELECT mp.usin, mp.asin, mp.marketplace,
            SUM(CASE
                    WHEN mp.location_code LIKE 'FBA%'
                        THEN mp.available
                    ELSE 0
                END) AS FBA_OH,
            SUM(CASE
                    WHEN mp.location_code LIKE 'FBA%'
                        THEN mp.available_raw
                    ELSE 0
                END) AS fba_available_raw,
            SUM(CASE
                    WHEN mp.location_code NOT LIKE 'FBA%'
                           AND md.tpl_ratio IS NOT NULL
                        THEN md.tpl_ratio*mp.available
                    WHEN mp.location_code NOT LIKE 'FBA%'
                           AND md.tpl_ratio IS NULL
                        THEN mp.available*1/mp.usin_by_mkt
                    ELSE 0
                END) AS TPL_OH,
            SUM(mp.intransit) AS FBA_INBOUND,
            sum(mp.fc_transfer) fba_fc_transfer,
            sum(mp.fc_processing) fba_fc_processing,
            sum(mp.unfulfillable) FBA_unfulfillable,
            SUM(mp.allocated) AS ALLOCATED
    FROM CONSOLIDATED_INVENTORY_MARKETPLACE MP
    LEFT JOIN mapping_data md
        ON mp.usin = md.usin
        AND mp.location_code = md.location_code
        AND mp.marketplace = md.marketplace
    GROUP BY mp.usin, mp.asin, mp.marketplace
)
    SELECT usin, asin, marketplace, fba_oh, fba_available_raw, tpl_oh, fba_inbound,
            fba_fc_transfer, fba_fc_processing, FBA_unfulfillable, allocated
    FROM INVENTORY_BY_MARKETPLACE
);
"""
    inv_anvyl_po = f"""
CREATE OR REPLACE VIEW {ANVYL_INV_VIEW} AS (
    WITH shipment_data AS (
        SELECT rap.usin, rap.po_number, sh_exp_ship_date as expc_date,
                CASE
                WHEN rap.sh_ship_country = 'GB' THEN 'UK'
                WHEN rap.sh_ship_country IN ('MX','US')  THEN 'NA'
                WHEN rap.sh_ship_country IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                            'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                            'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                            'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR') THEN 'EU'
                ELSE rap.sh_ship_country
            END AS marketplace,
            rap.sh_qty_expc AS sh_qty
        FROM {SHIPMENT_DATA} rap
        WHERE rap.sh_ship_country != 'CN'
            AND rap.sh_status = 'In Transit'
            AND sh_recv_loca NOT LIKE '%FBA%'
    ), po_excluded AS (
        SELECT po_number, usin,
            CASE
                WHEN rap.sh_ship_country = 'GB' THEN 'UK'
                WHEN rap.sh_ship_country IN ('MX','US')  THEN 'US'
                WHEN rap.sh_ship_country IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                            'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                            'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                            'RO', 'SK', 'SI', 'ES', 'SE', 'DE', 'TR') THEN 'EU'
                ELSE rap.sh_ship_country
            END AS marketplace,
            sum(CASE 
					WHEN sh_recv_loca LIKE '%FBA%'
						THEN COALESCE(rap.sh_qty_expc,0)
					WHEN sh_status = 'In Transit'
						THEN COALESCE(rap.sh_qty_expc,0)
					WHEN sh_status IN ('Partially Received','Received','Closed')
						THEN COALESCE(rap.sh_qty_recv,0)
					ELSE 0
				END
    	    ) AS sh_qty_rcv
        FROM {SHIPMENT_DATA} rap
        WHERE rap.sh_ship_country != 'CN'
        GROUP BY 1,2,3
    ), po_data AS (
        SELECT pcv.po_usin AS usin, pcv.po_number, expc_ship_date as expc_date,
        	CASE WHEN SUBSTR(location, 10,2) = 'US' THEN 'NA' ELSE SUBSTR(location, 10,2) END AS marketplace,
            po_quantity - COALESCE(poe.sh_qty_rcv,0) AS po_quantity,
        FROM {ORDERS_DATA} pcv
        LEFT JOIN po_excluded poe
            ON poe.usin = pcv.po_usin
            AND poe.marketplace = SUBSTR(location, 10,2)
            AND poe.po_number = pcv.po_number
        WHERE location LIKE 'Region - %'
            AND (pcv.po_status = 'Pending Receipt'
                OR pcv.po_status = 'Partially Received'
                OR pcv.po_status = 'Pending Billing/Partially Received'
                OR pcv.po_status = 'Pending Bill')
            AND pcv.po_acceptance_date IS NOT NULL
        GROUP BY 1,2,3,4,5
    ), anvyl_data AS (
        SELECT usin, po_number, expc_date, marketplace,
            sh_qty, 0 AS po_quantity
        FROM shipment_data
        UNION ALL
        SELECT usin, po_number, expc_date, marketplace,
            0 AS sh_qty, po_quantity
        FROM po_data
    )
        SELECT usin, marketplace, po_number AS order_number, expc_date AS eta,
            sum(po_quantity) AS ANVYL_ACTIVE,
            sum(sh_qty) AS ANVYL_SHIPPED
        FROM anvyl_data
        GROUP BY usin, marketplace, po_number, expc_date
);
"""
    inv_anvyl = f"""
CREATE OR REPLACE VIEW {ANVYL_INV_TMP} AS (
    SELECT usin, marketplace,
        sum(ANVYL_ACTIVE) AS ANVYL_ACTIVE,
        sum(ANVYL_SHIPPED) AS ANVYL_SHIPPED
        FROM {ANVYL_INV_VIEW}
    GROUP BY usin, marketplace
);
"""
    asin_usin_mapping = f"""
CREATE OR REPLACE VIEW {USIN_ASIN_MAPPING} AS (
    SELECT USIN,
            CASE
                WHEN country_code IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                        'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                        'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                        'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR') THEN 'EU'
                WHEN country_code IN ('MX', 'US')  THEN 'NA'
                WHEN country_code IN ('GB')  THEN 'UK'
                ELSE country_code
            END AS marketplace,
            MAX(ASIN) ASIN
    FROM {ERP_MAPPING} em
    WHERE ASIN IS NOT NULL
        AND USIN IS NOT NULL
        AND (substring(usin, 5, 1) = 'F'
                OR substring(usin, 5, 1) = 'A')
        AND CHANNEL = 'Amazon FBA'
        AND active_listing
        AND NOT inactive
    GROUP BY 1, 2
);
"""
    sales_data = f"""
CREATE OR REPLACE VIEW {SALES_DATA} AS (
    WITH raw_ft_usd_sales AS (
        SELECT fus.asin, fus.per_unit_revenue, fus.date, fus.units, fus.tcm_usd,
                fus.revenue, fus.fba_fulfillment_fees, fus.cogs, fus.ppc_cost,
                CASE
                    WHEN fus.marketplace IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                            'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                            'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                            'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR') THEN 'EU'
                    WHEN fus.marketplace IN ('MX', 'US')  THEN 'NA'
                    WHEN fus.marketplace IN ('GB')  THEN 'UK'
                ELSE fus.marketplace END AS marketplace
        FROM {USD_SALES} fus
        WHERE fus.date BETWEEN date_add(CURRENT_DATE, INTERVAL -90 DAY) AND CURRENT_DATE
            AND fus.per_unit_revenue != 0
            AND fus.cogs != 0 AND fus.units > 0
    ), ft_usd_sales_2inventory AS (
        SELECT rim.usin, fus.asin, fus.per_unit_revenue, fus.date, fus.units, fus.tcm_usd,
        fus.revenue, fus.fba_fulfillment_fees, fus.cogs/fus.units AS cogs, fus.ppc_cost,
        fus.marketplace
        FROM raw_ft_usd_sales fus
        LEFT JOIN {USIN_ASIN_MAPPING} rim
            ON rim.asin = fus.asin
            AND rim.marketplace = fus.marketplace
    ), rgm_with_region AS (
        SELECT
            asin,
            marketplace,
            full_date,
            ops_net_tax,
            units,
            CASE
            WHEN marketplace IN (
                'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','GR','HU','IE','IT',
                'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','DE','TR'
            ) THEN 'EU'
            WHEN marketplace = 'GB' THEN 'UK'
            WHEN marketplace IN ('MX','US') THEN 'US'
            ELSE marketplace
            END AS region
        FROM {REPORT_GLOBAL_METRICS}
        WHERE units <> 0 AND ops_net_tax <> 0
    ), latest_date_per_asin AS (
        SELECT
            asin,
            MAX(full_date) AS latest_date
        FROM rgm_with_region
        GROUP BY asin,region
    ), rgm_4week AS (
        SELECT r.*
        FROM rgm_with_region r
        INNER JOIN latest_date_per_asin l
            ON r.asin = l.asin
        WHERE r.full_date >= DATE_SUB(l.latest_date, INTERVAL 27 DAY)  -- last 28 days
    ),marketplace_level AS (
        SELECT
            asin,
            marketplace,
            region,
            SUM(ops_net_tax) AS marketplace_ops_net_tax,
            SUM(units) AS marketplace_units
        FROM rgm_4week
        GROUP BY asin, marketplace, region
        ),
        region_level AS (
        SELECT
            asin,
            region,
            SUM(marketplace_ops_net_tax) AS total_region_ops_net_tax,
            SUM(marketplace_units) AS total_region_units
        FROM marketplace_level
        GROUP BY asin, region
        ),
        asp_from_rgm AS (
        SELECT
            asin,
            CASE
                WHEN region = 'US' THEN 'NA'
                ELSE region
            END AS marketplace,
            SAFE_DIVIDE(total_region_ops_net_tax, total_region_units) AS average_sales_price
        FROM region_level
        )
    SELECT DISTINCT fus.usin, fus.marketplace,
        (sum(fus.units)
            OVER(PARTITION BY fus.marketplace, fus.usin)/12.0) AS act_weekly_avg_unit_sales,
        cdt.cogs  AS cogs,
        COALESCE(asp.average_sales_price, 0) AS average_sales_price,
        AVG(SAFE_DIVIDE(fus.tcm_usd,fus.units))
            OVER (PARTITION BY fus.marketplace, fus.usin) AS TRANSACTIONal_contribution_margin
    FROM ft_usd_sales_2inventory fus
    INNER JOIN (
        SELECT fus.marketplace, fus.usin,
            CASE
                WHEN max(date) OVER(PARTITION BY fus.marketplace, fus.usin) = fus.date
                THEN fus.cogs
            END AS cogs,
            ROW_NUMBER() OVER(PARTITION BY fus.marketplace, fus.usin, fus.date
            ORDER BY fus.marketplace, fus.usin, fus.date) AS row_num
        FROM ft_usd_sales_2inventory fus
    ) cdt ON  cdt.usin = fus.usin
    AND fus.marketplace = cdt.marketplace
    AND cdt.cogs IS NOT NULL
    AND cdt.row_num = 1
    LEFT JOIN asp_from_rgm asp
        ON asp.asin = fus.asin
        AND asp.marketplace = fus.marketplace
);
"""
    forecast_data = f"""
CREATE OR REPLACE VIEW {FORECASTED_YEAR_TMP} AS (
    WITH forecast_by_mkt AS (
        SELECT
            product_code,
            CASE
                WHEN marketplace IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                    'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                    'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                    'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR') THEN 'EU'
                WHEN marketplace  = 'GB'  THEN 'UK'
                WHEN marketplace  IN ('MX', 'US')  THEN 'NA'
            ELSE marketplace END AS marketplace,
            FORMAT_DATE('%B', forecasted_date) AS forecasted_date,
            units
        FROM {FLIBER_FORECAST}
        WHERE account_label like '%AMZ%'
            AND product_status = 'active'
    ), monthly_forecast AS (
        SELECT
            usin,
            rim.marketplace,
            forecasted_date,
            sum(units) quantity
        FROM forecast_by_mkt frf
        INNER JOIN {USIN_ASIN_MAPPING} rim
            ON rim.asin = product_code
            AND rim.marketplace = frf.marketplace
        GROUP BY 1,2,3
    )
    SELECT  *
    FROM monthly_forecast
    PIVOT (
        sum(quantity) FOR forecasted_date  IN (
        FORMAT_DATE('%B', current_date) AS Month1,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 1 MONTH)) AS Month2,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 2 MONTH)) AS Month3,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 3 MONTH)) AS Month4,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 4 MONTH)) AS Month5,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 5 MONTH)) AS Month6,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 6 MONTH)) AS Month7,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 7 MONTH)) AS Month8,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 8 MONTH)) AS Month9,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 9 MONTH)) AS Month10,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 10 MONTH)) AS Month11,
        FORMAT_DATE('%B', DATE_ADD(current_date, INTERVAL 11 MONTH)) AS Month12
        )
    )
);
"""
    cogs_data = f"""
CREATE OR REPLACE VIEW {COGS_DATA} AS (
    SELECT ASIN,
        CASE
            WHEN marketplace IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                    'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                    'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                    'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR') THEN 'EU'
            WHEN marketplace  IN ('MX', 'US')  THEN 'NA'
            ELSE marketplace
        END AS marketplace,
        MIN(tariff_sc_usd+labor_sc_usd+warehouse_sc_usd+freight_sc_usd+product_sc_usd+inbound_placement_usd) AS cogs
    FROM {STANDARD_COSTS}
    WHERE END_DATE IS NULL
    GROUP BY 1,2
);
"""
    po_visibility_tmp = f"""
CREATE OR REPLACE VIEW {PO_VIS_TMP} AS (
WITH tiers AS (
    SELECT
        p.asin,
        CASE WHEN p.region IN ('US') THEN 'NA'
            ELSE p.region
        END AS `region`,
        p.vel_score,
        p.growth_score,
        p.prof_score,
        p.final_tier AS `tier`,
        b.brand_name_short
    FROM {CHILD_TIERS} p
    INNER JOIN (
        SELECT DISTINCT asin,region, brand_name_short
        FROM {USD_SALES}
        ) b
    ON b.asin=p.asin
    AND b.region=p.region
), SC_PLANNING_PARAM AS (
    select lookup_level,
      CASE WHEN market IN ('US') THEN 'NA'
                ELSE market
       END AS market,
      Size, Brand
    FROM {SC_PLANNING_PARAM}
), SC_SAFETY_EXCEPTION AS (
    SELECT min_weeks_ovrd, safety_weeks_ovrd,
      CASE WHEN marketplace IN ('US') THEN 'NA'
                ELSE marketplace
       END AS marketplace, product
    FROM {SC_SAFETY_EXCEPTION}
), SC_TRANS_LT AS (
    SELECT from_destination, trans_lt_days,
       CASE WHEN to_destination IN ('US') THEN 'NA'
                ELSE to_destination
       END AS to_destination
    FROM {SC_TRANS_LT}
)
SELECT RIM.brand, IBM.USIN, COALESCE(EM.ASIN, IBM.ASIN) ASIN, RIM.SKU
    ,IBM.marketplace, MASN.asin_short_name
    ,IBM.fba_oh, IBM.fba_available_raw, IBM.tpl_oh, IBM.fba_inbound
    ,IBM.fba_fc_transfer, IBM.fba_fc_processing, IBM.fba_unfulfillable, IBM.allocated
    ,COALESCE(AI.anvyl_active,0) AS ANVYL_ACTIVE
    ,COALESCE(AI.anvyl_shipped,0) AS ANVYL_SHIPPED
    ,SD.act_weekly_avg_unit_sales, cd.cogs, SD.average_sales_price, SD.transactional_contribution_margin
    ,FY.month1, FY.month2, FY.month3, FY.month4, FY.month5, FY.month6, FY.month7, FY.month8, FY.month9
    ,FY.month10, FY.month11, FY.month12
    ,COALESCE(se.min_weeks_ovrd, sl.min_weeks,0)*7 AS `min_days`
    ,COALESCE(se.safety_weeks_ovrd, sl.safety_weeks,0)*7 AS `safety_days`
    ,pl.prod_lt_days
        + tl.trans_lt_days
        + o.outbound_lt
        + o.buffer_lt
        + o.rev_period AS `total_lt_days`
    ,pl.prod_lt_days
        + tl.trans_lt_days
        + o.outbound_lt
        + o.buffer_lt
        + o.rev_period
        + COALESCE(se.min_weeks_ovrd, sl.min_weeks, 0)*7
        + COALESCE(se.safety_weeks_ovrd, sl.safety_weeks,0)*7 AS `rop_days`
    ,COALESCE(bz1.Size,bz2.Size)*7 as `buy_size_days`
FROM {INVENTORY_BY_MKT} IBM
LEFT JOIN (
    SELECT usin, asin
    FROM {ERP_MAPPING} em
    WHERE CHANNEL = 'Amazon FBA'
        AND active_listing
        AND NOT inactive
    GROUP BY usin, asin
    ) EM
     ON EM.usin = IBM.usin
     AND EM.asin = IBM.asin
LEFT JOIN (
    SELECT USIN, max(BRAND) brand, max(SKU) SKU
    FROM {ITEM_MASTER}
    WHERE USIN IS NOT NULL
        AND (inactive IS NULL OR inactive != 'true')
    GROUP BY 1
    ) RIM
    ON RIM.USIN = IBM.USIN
LEFT JOIN (
    SELECT rim.usin, masn.asin, max(asin_short_name) asin_short_name
    FROM {ASIN_SHORT_NAMES} masn
    INNER JOIN {USIN_ASIN_MAPPING} rim
            ON rim.asin = masn.asin
    GROUP BY 1, 2
    ) masn
    ON IBM.usin = masn.usin
    AND IBM.asin = masn.asin
LEFT JOIN {ANVYL_INV_TMP} AI
    ON AI.usin = IBM.usin
    AND AI.marketplace = IBM.marketplace
LEFT JOIN {SALES_DATA} SD
    ON SD.usin = IBM.usin
    AND SD.marketplace = IBM.marketplace
LEFT JOIN {COGS_DATA} CD
    ON cd.asin = ibm.asin
    AND cd.marketplace = IBM.marketplace
LEFT JOIN {FORECASTED_YEAR_TMP} FY
    ON FY.usin = IBM.usin
    AND FY.marketplace = IBM.marketplace
LEFT JOIN SC_PLANNING_PARAM as bz1
    ON bz1.lookup_level = COALESCE(EM.ASIN, IBM.ASIN)
    AND bz1.market = IBM.marketplace
LEFT JOIN tiers t
    ON t.asin = COALESCE(EM.ASIN, IBM.ASIN)
    AND t.region = IBM.marketplace
LEFT JOIN {SC_SAFETY_LEVEL} sl
    ON sl.tier = COALESCE(t.tier,0)
LEFT JOIN SC_SAFETY_EXCEPTION se
    ON se.marketplace = IBM.marketplace
    AND se.product = COALESCE(EM.ASIN, IBM.ASIN)
LEFT JOIN SC_PLANNING_PARAM as bz2
    ON bz2.Brand = RIM.brand
    AND bz2.market ='all'
LEFT JOIN (SELECT DISTINCT usin, vendor_id, name
            FROM {ITEM_VENDOR_MASTER}
            WHERE is_primary_vendor) AS s
    ON s.usin = IBM.usin
LEFT JOIN {SC_PROD_LT} AS pl
    ON pl.vendor_id = s.vendor_id
LEFT JOIN SC_TRANS_LT AS tl
    ON tl.to_destination = IBM.marketplace
    AND tl.from_destination = pl.vendor_origin
LEFT JOIN {SC_OTHER} AS o
    ON o.level=RIM.brand
WHERE (substring(IBM.usin, 5, 1) = 'F'
       OR substring(IBM.usin, 5, 1) = 'A')
);
"""
    run_statements(asin_usin_mapping)
    run_statements(inv_by_mkt)
    run_statements(inv_anvyl_po)
    run_statements(inv_anvyl)
    run_statements(sales_data)
    run_statements(forecast_data)
    run_statements(cogs_data)
    run_statements(po_visibility_tmp)
    return f"Table {PO_VIS_TMP} created"


def refresh_po_visibility() -> str:
    po_visibility = f"""
DROP TABLE IF EXISTS {PO_VIS};
create table {PO_VIS}(
    product_brand STRING OPTIONS(description="Brand name"),
    product_code STRING OPTIONS(description="Amazon Standard Identification Number"),
    USIN STRING OPTIONS(description="Universal Stock Identification Number"),
    sku STRING OPTIONS(description="Stock Keeping Unit"),
    marketplace STRING OPTIONS(description="Marketplace code (e.g., NA, EU, UK)"),
    asin_short_name STRING OPTIONS(description="Product title"),
    fba_oh FLOAT64 OPTIONS(description="Fulfilled by Amazon on hand inventory"),
    fba_available_raw FLOAT64 OPTIONS(description="Raw available inventory at FBA"),
    `_3pl_oh` FLOAT64 OPTIONS(description="Third-party logistics on hand inventory"),
    fba_inbound FLOAT64 OPTIONS(description="Inbound inventory to Amazon"),
    fba_fc_transfer FLOAT64 OPTIONS(description="Inventory in transfer between fulfillment centers"),
    fba_fc_processing FLOAT64 OPTIONS(description="Inventory being processed at fulfillment centers"),
    fba_unfulfillable FLOAT64 OPTIONS(description="Unfulfillable inventory at FBA"),
    fba_allocated FLOAT64 OPTIONS(description="FBA allocated inventory"),
    anvyl_active FLOAT64 OPTIONS(description="PO created on TradePeg"),
    anvyl_shipped FLOAT64 OPTIONS(description="Shipped units in TradePeg"),
    act_weekly_avg_unit_sales FLOAT64 OPTIONS(description="Actual weekly average unit sales"),
    cogs FLOAT64 OPTIONS(description="Cost of goods sold"),
    average_sales_price FLOAT64 OPTIONS(description="Average sales price"),
    transactional_contribution_margin FLOAT64 OPTIONS(description="Transactional contribution margin"),
    month1 FLOAT64 OPTIONS(description="Forecasted sales for current month"),
    month2 FLOAT64 OPTIONS(description="Forecasted sales for next month"),
    month3 FLOAT64 OPTIONS(description="Forecasted sales for month 3"),
    month4 FLOAT64 OPTIONS(description="Forecasted sales for month 4"),
    month5 FLOAT64 OPTIONS(description="Forecasted sales for month 5"),
    month6 FLOAT64 OPTIONS(description="Forecasted sales for month 6"),
    month7 FLOAT64 OPTIONS(description="Forecasted sales for month 7"),
    month8 FLOAT64 OPTIONS(description="Forecasted sales for month 8"),
    month9 FLOAT64 OPTIONS(description="Forecasted sales for month 9"),
    month10 FLOAT64 OPTIONS(description="Forecasted sales for month 10"),
    month11 FLOAT64 OPTIONS(description="Forecasted sales for month 11"),
    month12 FLOAT64 OPTIONS(description="Forecasted sales for month 12"),
    min_days FLOAT64 OPTIONS(description="Min Lead Time Days from Supply Chain Master"),
    safety_days FLOAT64 OPTIONS(description="Safety stock days from the safety tables, from ASIN/Marketplace or Tier"),
    total_lt_days FLOAT64 OPTIONS(description="Total lead time days from Supply Chain Master"),
    rop_days FLOAT64 OPTIONS(description="Re-order Point Days + Safety Days"),
    buy_size_days FLOAT64 OPTIONS(description="Buy Size from Supply Chain Master, by ASIN/Marketplace or Brand"),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP() OPTIONS(description="Ingestion timestamp")
)
PARTITION BY DATE(created_at)
CLUSTER BY marketplace, product_brand, product_code, USIN
OPTIONS (
    description = "PO Visibility Data, based on Supply Chain Master and the Consolidated Inventory",
    labels = [('po_visibility', 'sc_master')]);

INSERT INTO {PO_VIS}
    (product_brand, USIN, product_code, sku, marketplace, asin_short_name,
    fba_oh, fba_available_raw, _3pl_oh, fba_inbound,
    fba_fc_transfer, fba_fc_processing, fba_unfulfillable, fba_allocated, anvyl_active, anvyl_shipped,
    act_weekly_avg_unit_sales, cogs, average_sales_price, transactional_contribution_margin,
    month1, month2, month3, month4, month5, month6, month7, month8, month9, month10,
    month11, month12, min_days, safety_days, total_lt_days, rop_days, buy_size_days)
SELECT brand, USIN, ASIN, sku,
    CASE
        WHEN marketplace = 'NA' THEN 'US' ELSE marketplace
    END as marketplace
    ,asin_short_name, fba_oh, fba_available_raw, tpl_oh, fba_inbound
    ,fba_fc_transfer, fba_fc_processing, fba_unfulfillable, allocated, anvyl_active, anvyl_shipped
    ,act_weekly_avg_unit_sales, cogs, average_sales_price, transactional_contribution_margin
    ,month1, month2, month3, month4, month5, month6, month7, month8, month9
    ,month10, month11, month12, min_days, safety_days, total_lt_days, rop_days, buy_size_days
FROM {PO_VIS_TMP};
    """
    run_statements(po_visibility)
    return f"Table {PO_VIS} created"


def refresh_po_visibility_historical() -> str:
    po_visibility = f"""
CREATE TABLE IF NOT EXISTS {PO_VIS_HIS}(
    product_brand STRING OPTIONS(description="Brand name"),
    product_code STRING OPTIONS(description="Amazon Standard Identification Number"),
    USIN STRING OPTIONS(description="Universal Stock Identification Number"),
    sku STRING OPTIONS(description="Stock Keeping Unit"),
    marketplace STRING OPTIONS(description="Marketplace code (e.g., NA, EU, UK)"),
    asin_short_name STRING OPTIONS(description="Product title"),
    fba_oh FLOAT64 OPTIONS(description="Fulfilled by Amazon on hand inventory"),
    fba_available_raw FLOAT64 OPTIONS(description="Raw available inventory at FBA"),
    `_3pl_oh` FLOAT64 OPTIONS(description="Third-party logistics on hand inventory"),
    fba_inbound FLOAT64 OPTIONS(description="Inbound inventory to Amazon"),
    fba_fc_transfer FLOAT64 OPTIONS(description="Inventory in transfer between fulfillment centers"),
    fba_fc_processing FLOAT64 OPTIONS(description="Inventory being processed at fulfillment centers"),
    fba_unfulfillable FLOAT64 OPTIONS(description="Unfulfillable inventory at FBA"),
    fba_allocated FLOAT64 OPTIONS(description="FBA allocated inventory"),
    anvyl_active FLOAT64 OPTIONS(description="PO created on TradePeg"),
    anvyl_shipped FLOAT64 OPTIONS(description="Shipped units in TradePeg"),
    act_weekly_avg_unit_sales FLOAT64 OPTIONS(description="Actual weekly average unit sales"),
    cogs FLOAT64 OPTIONS(description="Cost of goods sold"),
    average_sales_price FLOAT64 OPTIONS(description="Average sales price"),
    transactional_contribution_margin FLOAT64 OPTIONS(description="Transactional contribution margin"),
    month1 FLOAT64 OPTIONS(description="Forecasted sales for current month"),
    month2 FLOAT64 OPTIONS(description="Forecasted sales for next month"),
    month3 FLOAT64 OPTIONS(description="Forecasted sales for month 3"),
    month4 FLOAT64 OPTIONS(description="Forecasted sales for month 4"),
    month5 FLOAT64 OPTIONS(description="Forecasted sales for month 5"),
    month6 FLOAT64 OPTIONS(description="Forecasted sales for month 6"),
    month7 FLOAT64 OPTIONS(description="Forecasted sales for month 7"),
    month8 FLOAT64 OPTIONS(description="Forecasted sales for month 8"),
    month9 FLOAT64 OPTIONS(description="Forecasted sales for month 9"),
    month10 FLOAT64 OPTIONS(description="Forecasted sales for month 10"),
    month11 FLOAT64 OPTIONS(description="Forecasted sales for month 11"),
    month12 FLOAT64 OPTIONS(description="Forecasted sales for month 12"),
    min_days FLOAT64 OPTIONS(description="Min Lead Time Days from Supply Chain Master"),
    safety_days FLOAT64 OPTIONS(description="Safety stock days from the safety tables, from ASIN/Marketplace or Tier"),
    total_lt_days FLOAT64 OPTIONS(description="Total lead time days from Supply Chain Master"),
    rop_days FLOAT64 OPTIONS(description="Re-order Point Days + Safety Days"),
    buy_size_days FLOAT64 OPTIONS(description="Buy Size from Supply Chain Master, by ASIN/Marketplace or Brand"),
    created_at DATE DEFAULT CURRENT_DATE()
)
PARTITION BY created_at
CLUSTER BY created_at, marketplace, product_code, USIN
OPTIONS (
    description = "PO Visibility Historical Data, based on Supply Chain Master and the Consolidated Inventory",
    labels = [('po_visibility', 'historical')]);


DELETE {PO_VIS_HIS}
WHERE created_at = CURRENT_DATE();

INSERT INTO {PO_VIS_HIS}
    (product_brand, USIN, product_code, sku, marketplace, asin_short_name,
        fba_oh, fba_available_raw, _3pl_oh, fba_inbound,
        fba_fc_transfer, fba_fc_processing, fba_unfulfillable, fba_allocated, anvyl_active, anvyl_shipped,
        act_weekly_avg_unit_sales, cogs, average_sales_price, transactional_contribution_margin,
        month1, month2, month3, month4, month5, month6, month7, month8, month9, month10,
        month11, month12, min_days, safety_days, total_lt_days, rop_days, buy_size_days)
    SELECT product_brand, USIN, product_code, sku, marketplace, asin_short_name,
        fba_oh, fba_available_raw, _3pl_oh, fba_inbound,
        fba_fc_transfer, fba_fc_processing, fba_unfulfillable, fba_allocated, anvyl_active, anvyl_shipped,
        act_weekly_avg_unit_sales, cogs, average_sales_price, transactional_contribution_margin,
        month1, month2, month3, month4, month5, month6, month7, month8, month9, month10,
        month11, month12, min_days, safety_days, total_lt_days, rop_days, buy_size_days
FROM {PO_VIS};
    """
    run_statements(po_visibility)
    return f"Table {PO_VIS_HIS} updated."


def refresh_po_inv_performance_tmp() -> str:
    po_inv_performance_tmp = f"""
DROP TABLE IF EXISTS {PO_INV_PERF_VISIBILITY_TMP};
CREATE TABLE {PO_INV_PERF_VISIBILITY_TMP} AS (
WITH SKU_USIN_MAPPING AS (
    SELECT SKU, USIN
    FROM {ITEM_MASTER} em
    WHERE SKU IS NOT NULL
        AND USIN IS NOT NULL
    GROUP BY 1, 2
), ASIN_USIN_MAPPING AS (
    SELECT ASIN, USIN
    FROM {ERP_MAPPING} em
    WHERE ASIN IS NOT NULL
        AND USIN IS NOT NULL
        AND CHANNEL = 'Amazon FBA'
        AND active_listing
        AND NOT inactive
    GROUP BY 1, 2
), ANVYL_DATA AS (
    SELECT usin, marketplace, order_number, eta,
        sum(ANVYL_ACTIVE+ANVYL_SHIPPED) AS quantity
    FROM {ANVYL_INV_VIEW}
    GROUP BY usin, marketplace, order_number, eta
), MAN_COGS_DATA AS (
    WITH SC_BY_REGION AS (
        SELECT msc.asin, msc.product_sc_usd,
            CASE WHEN msc.marketplace IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
                                'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
                                'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                                'RO', 'SK', 'SI', 'ES', 'SE', 'DE','TR') THEN 'EU'
            WHEN msc.marketplace IN ('MX', 'US')  THEN 'NA'
                ELSE msc.marketplace
            END AS marketplace,
        msc.tariff_sc_usd + msc.labor_sc_usd+ msc.freight_sc_usd + msc.product_sc_usd + msc.inbound_placement_usd AS Landed_Unit_Cost,
        FROM {STANDARD_COSTS} msc
        WHERE msc.end_date IS NULL
            AND (msc.tariff_sc_usd+msc.labor_sc_usd+msc.warehouse_sc_usd+
                msc.freight_sc_usd+msc.product_sc_usd) < 0
    )
    SELECT DISTINCT rim.usin, msc.product_sc_usd,
            msc.marketplace, msc.Landed_Unit_Cost
    FROM SC_BY_REGION msc
    LEFT JOIN ASIN_USIN_MAPPING rim
        ON rim.asin = msc.asin
), COGS_MAPPING AS (
    SELECT usin, marketplace,
        min(product_sc_usd) product_sc_usd,
        min(Landed_Unit_Cost) Landed_Unit_Cost
    FROM MAN_COGS_DATA
    GROUP BY usin, marketplace
), SHORT_NAMES AS (
    SELECT rim.usin, max(asin_name) asin_name
    FROM {ASIN_SHORT_NAMES} masn
    INNER JOIN ASIN_USIN_MAPPING rim
        ON rim.asin = masn.asin
    GROUP BY 1
), PO_VISIBILITY AS (
    SELECT DISTINCT USIN, product_brand, product_code, asin_short_name, sku,
        fba_oh, fba_available_raw, `_3pl_oh`, fba_inbound,
        fba_fc_transfer, fba_fc_processing, fba_unfulfillable, fba_allocated,
        anvyl_active, anvyl_shipped, min_days, safety_days, total_lt_days, rop_days,
        buy_size_days, act_weekly_avg_unit_sales, cogs, average_sales_price,
        transactional_contribution_margin, month1,
        month2, month3, month4, month5, month6, month7,
        month8, month9, month10, month11, month12,
        CASE
            WHEN pv.marketplace = 'US' THEN 'NA' ELSE pv.marketplace
        END AS marketplace
    FROM {PO_VIS} pv
)
SELECT  DISTINCT
    -- Product Section
    pv.usin,
    pv.product_brand,
    pv.marketplace,
    pv.asin_short_name,
    pv.product_code AS asin,
    pv.sku,
    sn.asin_name as product_name,
    -- Demand SECTION
    pv.month1, pv.month2, pv.month3, pv.month4, pv.month5, pv.month6,
    pv.month7, pv.month8, pv.month9, pv.month10, pv.month11, pv.month12,
    -- Inventory Section
    pv.fba_oh as Amazon,
    pv.fba_inbound as inbound_amz,
    pv._3pl_oh as tpl,
    pv.fba_available_raw,
    pv.fba_fc_transfer,
    pv.fba_fc_processing,
    pv.fba_unfulfillable,
    pv.fba_allocated,
    pv.anvyl_shipped as in_transit,
    pv.anvyl_active as in_production,
    pv.fba_oh+pv.fba_inbound+pv._3pl_oh+pv.anvyl_shipped+pv.anvyl_active as pipeline,
    pv.min_days,
    pv.safety_days,
    pv.total_lt_days,
    pv.rop_days,
    pv.buy_size_days,
    -- Next Inbound
    rap.order_number AS po,
    rap.quantity AS units,
    rap.Marketplace AS destination,
    rap.eta,
    -- Months of Supply Section
    CASE
        WHEN pv.fba_oh + pv.fba_inbound > 0 THEN
            ((pv.month1 + pv.month2 + pv.month3)/(pv.fba_oh + pv.fba_inbound))/3 ELSE 0
    END AS amazon_n3m,
    CASE
        WHEN pv.fba_oh + pv.fba_inbound + pv._3pl_oh > 0
            THEN ((pv.month1 + pv.month2 + pv.month3 + pv.month4 + pv.month5 + pv.month6)/
                    (pv.fba_oh + pv.fba_inbound + pv._3pl_oh))/6 ELSE 0
    END AS market_n6m,
    CASE
        WHEN pv.fba_oh+pv.fba_inbound+pv._3pl_oh+pv.anvyl_shipped+pv.anvyl_active > 0
            THEN ((pv.month1 + pv.month2 + pv.month3 + pv.month4 + pv.month5 +
                        pv.month6 + pv.month7 + pv.month8 + pv.month9)
                    /(pv.fba_oh+pv.fba_inbound+pv._3pl_oh+pv.anvyl_shipped+pv.anvyl_active))/9 ELSE 0
    END AS pipeline_n9m,
    -- Financial Metrics
    pv.average_sales_price AS ASP,
    cogs.Landed_Unit_Cost,
    cogs.product_sc_usd AS unit_cost
FROM PO_VISIBILITY pv
LEFT JOIN ANVYL_DATA  rap
    ON rap.USIN = pv.USIN AND rap.marketplace = pv.marketplace
LEFT JOIN COGS_MAPPING cogs
    ON cogs.usin = pv.usin
    AND cogs.marketplace = pv.marketplace
LEFT JOIN SHORT_NAMES sn
    ON pv.usin = sn.usin
);
"""
    run_statements(po_inv_performance_tmp)
    return f"Table {PO_INV_PERF_VISIBILITY_TMP} created"


def refresh_po_inv_performance_3pls() -> str:
    po_inv_performance_3pls = f"""
DROP TABLE IF EXISTS {PO_INV_PERF_VISIBILITY};
CREATE TABLE IF NOT EXISTS {PO_INV_PERF_VISIBILITY}
(
    USIN STRING OPTIONS(description="Unybrands Stock Identification Number (USIN)")
    ,product_brand STRING OPTIONS(description="Brand name of the product")
    ,marketplace STRING OPTIONS(description="Marketplace code (e.g., NA, EU, UK)")
    ,asin_short_name STRING OPTIONS(description="Product short name or title")
    ,asin STRING OPTIONS(description="Amazon Standard Identification Number (ASIN)")
    ,sku STRING OPTIONS(description="Stock Keeping Unit (SKU)")
    ,product_name STRING OPTIONS(description="Product name or title")
    ,month1 FLOAT64 OPTIONS(description="Forecasted sales for month 1 (current month)")
    ,month2 FLOAT64 OPTIONS(description="Forecasted sales for month 2")
    ,month3 FLOAT64 OPTIONS(description="Forecasted sales for month 3")
    ,month4 FLOAT64 OPTIONS(description="Forecasted sales for month 4")
    ,month5 FLOAT64 OPTIONS(description="Forecasted sales for month 5")
    ,month6 FLOAT64 OPTIONS(description="Forecasted sales for month 6")
    ,month7 FLOAT64 OPTIONS(description="Forecasted sales for month 7")
    ,month8 FLOAT64 OPTIONS(description="Forecasted sales for month 8")
    ,month9 FLOAT64 OPTIONS(description="Forecasted sales for month 9")
    ,month10 FLOAT64 OPTIONS(description="Forecasted sales for month 10")
    ,month11 FLOAT64 OPTIONS(description="Forecasted sales for month 11")
    ,month12 FLOAT64 OPTIONS(description="Forecasted sales for month 12")
    ,amazon FLOAT64 OPTIONS(description="Amazon sales for the period")
    ,inbound_amz FLOAT64 OPTIONS(description="Inbound inventory to Amazon")
    ,tpl FLOAT64 OPTIONS(description="Third-party logistics (TPL) inventory")
    ,fba_available_raw FLOAT64 OPTIONS(description="Raw available inventory at FBA")
    ,fba_fc_transfer FLOAT64 OPTIONS(description="Inventory in transfer between fulfillment centers")
    ,fba_fc_processing FLOAT64 OPTIONS(description="Inventory being processed at fulfillment centers")
    ,fba_unfulfillable FLOAT64 OPTIONS(description="Unfulfillable inventory at FBA")
    ,fba_allocated FLOAT64 OPTIONS(description="Inventory inbound to FBA")
    ,in_transit FLOAT64 OPTIONS(description="Inventory currently in transit")
    ,in_production FLOAT64 OPTIONS(description="Inventory currently in production")
    ,pipeline FLOAT64 OPTIONS(description="Pipeline")
    ,po STRING OPTIONS(description="Purchase order number")
    ,units FLOAT64 OPTIONS(description="Units associated with the purchase order")
    ,destination STRING OPTIONS(description="Destination location for the inventory")
    ,eta DATE OPTIONS(description="Estimated time of arrival for the inventory")
    ,min_days FLOAT64 OPTIONS(description="Min Lead Time Days from Supply Chain Master")
    ,safety_days FLOAT64 OPTIONS(description="Safety stock days from the safety tables, from ASIN/Marketplace or Tier")
    ,total_lt_days FLOAT64 OPTIONS(description="Total lead time days from Supply Chain Master")
    ,rop_days FLOAT64 OPTIONS(description="Re-order Point Days + Safety Days")
    ,buy_size_days FLOAT64 OPTIONS(description="Buy Size from Supply Chain Master, by ASIN/Marketplace or Brand")
    ,amazon_n3m FLOAT64 OPTIONS(description="Amazon sales for the last 3 months")
    ,market_n6m FLOAT64 OPTIONS(description="Marketplace sales for the last 6 months")
    ,pipeline_n9m FLOAT64 OPTIONS(description="Pipeline inventory for the next 9 months")
    ,asp FLOAT64 OPTIONS(description="Average selling price")
    ,landed_unit_cost FLOAT64 OPTIONS(description="Landed unit cost of the product")
    ,unit_cost FLOAT64 OPTIONS(description="Unit cost of the product")
    ,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP() OPTIONS(description="Ingestion timestamp")
) PARTITION BY DATE(created_at)
    CLUSTER BY marketplace, product_brand
    OPTIONS (
      description = "Table providing purchase order visibility, including monthly sales forecasts, "
                    "inventory levels, pipeline status, and related data for Unybrands.",
      labels = [('inventory', 'performance')]
);

INSERT INTO {PO_INV_PERF_VISIBILITY}
     (USIN, product_brand, marketplace, asin_short_name, asin, sku, product_name,
     month1, month2, month3, month4, month5, month6,
     month7, month8, month9, month10, month11, month12,
     amazon, inbound_amz, tpl, min_days, safety_days, total_lt_days, rop_days,
    buy_size_days, fba_available_raw, fba_fc_transfer, fba_fc_processing,
     fba_unfulfillable, fba_allocated, in_transit,
     in_production, pipeline, po, units, destination, eta,
     amazon_n3m, market_n6m, pipeline_n9m, asp,
     landed_unit_cost, unit_cost)
SELECT usin, product_brand,
        CASE
            WHEN marketplace = 'NA' THEN 'US' ELSE marketplace
        END as marketplace, asin_short_name, asin, sku, product_name,
        month1, month2, month3, month4, month5, month6,
        month7, month8, month9, month10, month11, month12,
        amazon, inbound_amz, tpl, min_days, safety_days, total_lt_days, rop_days,
        buy_size_days, fba_available_raw, fba_fc_transfer, fba_fc_processing,
        fba_unfulfillable, fba_allocated, in_transit,
        in_production, pipeline, po, units, destination, eta,
        amazon_n3m, market_n6m, pipeline_n9m, asp,
        landed_unit_cost, unit_cost
FROM {PO_INV_PERF_VISIBILITY_TMP};
DROP TABLE {PO_INV_PERF_VISIBILITY_TMP};
    """
    run_statements(po_inv_performance_3pls)
    return f"Table {PO_INV_PERF_VISIBILITY} created"


def refresh_po_inv_per_3pls_historical() -> str:
    po_inv_performance_3pls_hist = f"""
CREATE TABLE IF NOT EXISTS {PO_INV_PERF_VIS_HIS}
(
    USIN STRING OPTIONS(description="Unybrands Stock Identification Number (USIN)")
    ,product_brand STRING OPTIONS(description="Brand name of the product")
    ,marketplace STRING OPTIONS(description="Marketplace code (e.g., NA, EU, UK)")
    ,asin_short_name STRING OPTIONS(description="Product short name or title")
    ,asin STRING OPTIONS(description="Amazon Standard Identification Number (ASIN)")
    ,sku STRING OPTIONS(description="Stock Keeping Unit (SKU)")
    ,product_name STRING OPTIONS(description="Product name or title")
    ,month1 FLOAT64 OPTIONS(description="Forecasted sales for month 1 (current month)")
    ,month2 FLOAT64 OPTIONS(description="Forecasted sales for month 2")
    ,month3 FLOAT64 OPTIONS(description="Forecasted sales for month 3")
    ,month4 FLOAT64 OPTIONS(description="Forecasted sales for month 4")
    ,month5 FLOAT64 OPTIONS(description="Forecasted sales for month 5")
    ,month6 FLOAT64 OPTIONS(description="Forecasted sales for month 6")
    ,month7 FLOAT64 OPTIONS(description="Forecasted sales for month 7")
    ,month8 FLOAT64 OPTIONS(description="Forecasted sales for month 8")
    ,month9 FLOAT64 OPTIONS(description="Forecasted sales for month 9")
    ,month10 FLOAT64 OPTIONS(description="Forecasted sales for month 10")
    ,month11 FLOAT64 OPTIONS(description="Forecasted sales for month 11")
    ,month12 FLOAT64 OPTIONS(description="Forecasted sales for month 12")
    ,amazon FLOAT64 OPTIONS(description="Amazon sales for the period")
    ,inbound_amz FLOAT64 OPTIONS(description="Inbound inventory to Amazon")
    ,tpl FLOAT64 OPTIONS(description="Third-party logistics (TPL) inventory")
    ,fba_available_raw FLOAT64 OPTIONS(description="Raw available inventory at FBA")
    ,fba_fc_transfer FLOAT64 OPTIONS(description="Inventory in transfer between fulfillment centers")
    ,fba_fc_processing FLOAT64 OPTIONS(description="Inventory being processed at fulfillment centers")
    ,fba_unfulfillable FLOAT64 OPTIONS(description="Unfulfillable inventory at FBA")
    ,fba_allocated FLOAT64 OPTIONS(description="Inventory inbound to FBA")
    ,in_transit FLOAT64 OPTIONS(description="Inventory currently in transit")
    ,in_production FLOAT64 OPTIONS(description="Inventory currently in production")
    ,pipeline FLOAT64 OPTIONS(description="Pipeline")
    ,po STRING OPTIONS(description="Purchase order number")
    ,units FLOAT64 OPTIONS(description="Units associated with the purchase order")
    ,destination STRING OPTIONS(description="Destination location for the inventory")
    ,eta DATE OPTIONS(description="Estimated time of arrival for the inventory")
    ,min_days FLOAT64 OPTIONS(description="Min Lead Time Days from Supply Chain Master")
    ,safety_days FLOAT64 OPTIONS(description="Safety stock days from the safety tables, from ASIN/Marketplace or Tier")
    ,total_lt_days FLOAT64 OPTIONS(description="Total lead time days from Supply Chain Master")
    ,rop_days FLOAT64 OPTIONS(description="Re-order Point Days + Safety Days")
    ,buy_size_days FLOAT64 OPTIONS(description="Buy Size from Supply Chain Master, by ASIN/Marketplace or Brand")
    ,amazon_n3m FLOAT64 OPTIONS(description="Amazon sales for the last 3 months")
    ,market_n6m FLOAT64 OPTIONS(description="Marketplace sales for the last 6 months")
    ,pipeline_n9m FLOAT64 OPTIONS(description="Pipeline inventory for the next 9 months")
    ,asp FLOAT64 OPTIONS(description="Average selling price")
    ,landed_unit_cost FLOAT64 OPTIONS(description="Landed unit cost of the product")
    ,unit_cost FLOAT64 OPTIONS(description="Unit cost of the product")
    ,created_at DATE DEFAULT CURRENT_DATE() OPTIONS(description="Ingestion date")
) PARTITION BY created_at
    CLUSTER BY marketplace, product_brand
    OPTIONS (
      description = "Historical table providing purchase order visibility, including monthly sales forecasts, "
                    "inventory levels, pipeline status, and related data for Unybrands.",
      labels = [('inventory', 'performance')]
);


DELETE {PO_INV_PERF_VIS_HIS}
WHERE created_at = CURRENT_DATE();

INSERT INTO {PO_INV_PERF_VIS_HIS}
     (USIN, product_brand, marketplace, asin_short_name, asin, sku, product_name,
     month1, month2, month3, month4, month5, month6,
     month7, month8, month9, month10, month11, month12,
     amazon, inbound_amz, tpl, min_days, safety_days, total_lt_days, rop_days,
     buy_size_days, fba_available_raw, fba_fc_transfer, fba_fc_processing,
     fba_unfulfillable, fba_allocated, in_transit,
     in_production, pipeline, po, units, destination, eta,
     amazon_n3m, market_n6m, pipeline_n9m, asp,
     landed_unit_cost, unit_cost)
SELECT USIN, product_brand, marketplace, asin_short_name, asin, sku, product_name,
     month1, month2, month3, month4, month5, month6,
     month7, month8, month9, month10, month11, month12,
     amazon, inbound_amz, tpl, min_days, safety_days, total_lt_days, rop_days,
     buy_size_days, fba_available_raw, fba_fc_transfer, fba_fc_processing,
     fba_unfulfillable, fba_allocated, in_transit,
     in_production, pipeline, po, units, destination, eta,
     amazon_n3m, market_n6m, pipeline_n9m, asp,
     landed_unit_cost, unit_cost
FROM {PO_INV_PERF_VISIBILITY};
    """
    run_statements(po_inv_performance_3pls_hist)
    return f"Table {PO_INV_PERF_VIS_HIS} updated."


DEFAULT_ARGS = {
    "owner": "airflow",
    "depends_on_past": False,
    "retries": 3,
    "retry_delay": timedelta(seconds=180),
    "on_failure_callback": on_failure,
    "on_success_callback": None
}
with DAG(
        dag_id="po-visibility",
        default_args=DEFAULT_ARGS,
        dagrun_timeout=timedelta(hours=2),
        start_date=datetime(2024, 6, 25),
        schedule_interval=None,
        max_active_runs=1,
        max_active_tasks=3,
        catchup=False,
        tags=["SupplyChain", "3PL", "Child"],
) as dag:
    check_mapping_file = PythonOperator(
        task_id="check_mapping_file",
        python_callable=check_mapping_file_existence
    )
    create_po_visibility_tmp_table = PythonOperator(
        task_id="create_po_visibility_tmp",
        python_callable=create_po_visibility_tmp
    )
    refresh_po_visibility_3pls = PythonOperator(
        task_id="refresh_po_visibility_3pls",
        python_callable=refresh_po_visibility
    )
    update_po_vis_3pls_his = PythonOperator(
        task_id="update_po_visibility_3pls_historical",
        python_callable=refresh_po_visibility_historical
    )
    refresh_po_inv_performance_3pls_tmp = PythonOperator(
        task_id="refresh_po_inv_performance_3pls_tmp",
        python_callable=refresh_po_inv_performance_tmp
    )
    refresh_po_inv_performance_3pls_tsk = PythonOperator(
        task_id="refresh_po_inv_performance_3pls",
        python_callable=refresh_po_inv_performance_3pls
    )
    update_po_inv_per_3pls_historical = PythonOperator(
        task_id="update_po_inv_performance_3pls_historical",
        python_callable=refresh_po_inv_per_3pls_historical
    )

    check_mapping_file >> create_po_visibility_tmp_table >> refresh_po_visibility_3pls >> update_po_vis_3pls_his
    refresh_po_visibility_3pls >> refresh_po_inv_performance_3pls_tmp >> refresh_po_inv_performance_3pls_tsk
    refresh_po_inv_performance_3pls_tsk >> update_po_inv_per_3pls_historical
