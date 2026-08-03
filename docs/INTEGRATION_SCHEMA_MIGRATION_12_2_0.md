# Integration Schema and Migration Requirements — Build 12.2.0

The complete repository migration should support:

- IntegrationConnection
- ProviderLocationMapping
- PosItemMapping with version/effective date
- SalesImportBatch
- SalesImportLine
- SalesReconciliation
- ImportAttempt or retry history
- ManualSalesAudit
- SupplierCostSnapshot and SupplierCostRecord
- SupplierCostAlert

Required uniqueness includes provider/tenant/location/providerEventId and batch/orderId/lineId. Indexes must support tenant/location/business-date queries, unmapped queues, failed batches, and effective mappings.

No migration is executed by this overlay.
