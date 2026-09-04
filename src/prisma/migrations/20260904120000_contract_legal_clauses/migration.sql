-- Preserve the selected clause identifiers while content_html keeps the immutable rendered snapshot.
ALTER TABLE `Contract`
    ADD COLUMN `legal_clause_ids` JSON NULL;

ALTER TABLE `HrmStaffContract`
    ADD COLUMN `legal_clause_ids` JSON NULL;
