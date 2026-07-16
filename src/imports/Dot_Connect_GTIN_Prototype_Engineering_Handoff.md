# Dot Connect GTIN Enrichment Prototype

## Comprehensive Engineering Handoff

**Version:** 1.0 **Purpose:** Complete project context for future AI
agents or engineers.

------------------------------------------------------------------------

# 1. Vision

Dot Connect is an industry-specific PIM for food distributors and
suppliers.

Primary prototype workflow:

1.  User uploads/manages products in Dot Connect.
2.  Products without GTINs are identified.
3.  User searches Dot's master catalog to assign a GTIN.
4.  Assigned GTIN unlocks comparison of multiple enrichment sources.
5.  User selects the preferred source (or uses a global default).
6.  Product returns to the Products list with GTIN and enrichment source
    saved.

Prototype goal: Validate the workflow and usability---not production
integrations.

------------------------------------------------------------------------

# 2. Functional Screens

## Products Listing

Shows: - Product ID - Supplier - Product Name - GTIN - Enrichment
Source - Ecommerce readiness - Updated date

Clicking `<Add GTIN>`{=html} opens: - inline type-ahead - Advanced GTIN
Search

------------------------------------------------------------------------

## Advanced GTIN Search

Purpose: Assign GTIN.

Displays: - candidate matches - confidence score - package hierarchy
(Each/Case/Pallet) - source availability

User selects one packaging GTIN.

------------------------------------------------------------------------

## Compare Enrichment Sources

Columns: - Dot Foods Mastered - GDSN (1WorldSync) - USDA - Unipro

Sections: - Images - Features - Ingredients - Nutrition - Allergens -
Storage & Shelf Life - Packaging & Weight - Additional Details

User selects enrichment source.

------------------------------------------------------------------------

# 3. Architecture

Normalized tables:

-   connect_products
-   universal_products
-   product_identifiers
-   enrichment_sources
-   source_product_records
-   product_match_candidates
-   prototype_settings

Legacy: - gdsn_results (kept until migration complete)

Reason: Normalized backend with simplified UI layer.

------------------------------------------------------------------------

# 4. Canonical Modeling Decisions

Supplier Mapping to GDSN (MVP) spreadsheet is the canonical schema.

Every enrichment source supports every MVP field.

Unavailable values are NULL/empty.

Unavailable source = no source_product_records row.

GTIN is the universal identifier.

Packaging identifiers are modeled separately.

------------------------------------------------------------------------

# 5. source_product_records

Contains the complete MVP field set.

Scalar fields include: - product title - product type - manufacturer -
GLNs - brand - GPC - descriptions - marketing - ingredients - serving
size - storage - dimensions - weights - palletization - regulatory -
timeline

JSONB fields: - referenced_files - allergens - nutrients -
preparation_methods - applicable_diets - child_gtins - net_contents -
fsma_restrictions - raw_source_data

All enrichment sources share this schema.

------------------------------------------------------------------------

# 6. Supabase Status

Completed:

Schema created.

Tables: - connect_products - enrichment_sources - universal_products -
product_identifiers - source_product_records -
product_match_candidates - prototype_settings

Imported dataset:

-   enrichment_sources = 4
-   universal_products = 500
-   product_identifiers = 1500
-   source_product_records = 1695
-   connect_products = 100
-   product_match_candidates = 500
-   prototype_settings = 1

RLS enabled.

connect_products policies: - public SELECT - public UPDATE

Legacy gdsn_results: - retained - still connected to current Make
prototype

------------------------------------------------------------------------

# 7. Mock Dataset

100 Connect products.

500 Universal products.

1500 GTIN identifiers.

Each universal product may have: - Each GTIN - Case GTIN - Pallet GTIN

Source records intentionally vary in completeness.

Scenarios include: - High matches - Medium matches - Low matches -
Missing source - Missing attributes

------------------------------------------------------------------------

# 8. Why the Architecture Changed

Originally Make would query normalized tables directly.

After reviewing the Make editor, strategy changed.

Instead: PostgreSQL should expose UI-specific SQL Views.

This reduces Make complexity dramatically.

------------------------------------------------------------------------

# 9. Planned SQL Views

products_listing

Purpose: Entire Products page.

gtin_search_results

Purpose: Advanced GTIN Search page.

Should flatten: - connect_products - product_match_candidates -
universal_products - product_identifiers - source availability

enrichment_comparison

Purpose: Comparison page.

Should return one UI-friendly record per enrichment source.

------------------------------------------------------------------------

# 10. Figma Make Migration Strategy

DO NOT redesign screens.

Migration order:

1.  Create SQL Views.
2.  Switch Products page.
3.  Switch GTIN Search.
4.  Switch Compare page.
5.  Wire persistence.
6.  Remove dependency on gdsn_results.
7.  Rename gdsn_results after validation.

------------------------------------------------------------------------

# 11. Persistence

Selections ultimately update connect_products:

GTIN: - assigned_universal_product_id - assigned_identifier_id -
assigned_gtin - assigned_packaging_level

Enrichment: - selected_enrichment_source_id -
selected_source_product_record_id

------------------------------------------------------------------------

# 12. Prototype Principles

-   Prototype first.
-   Production-quality data model.
-   Simple UI contract.
-   SQL views isolate UI from schema.
-   CSV defines business language.
-   Future production evolution should not require redesign of UI.

------------------------------------------------------------------------

# 13. Remaining Work

Immediate: - Build SQL views. - Connect Make to views. - Test Products
page. - Test GTIN Search. - Test Compare screen. - Test persistence.

Later: - Remove legacy table. - Add audit history. - Add enrichment
history. - Add production security.

------------------------------------------------------------------------

# 14. Guiding Principle

The relational model exists for correctness.

The UI should consume flat, purpose-built SQL views.

This separation is the final recommended architecture for the prototype
and future evolution.
