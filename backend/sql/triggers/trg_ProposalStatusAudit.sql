CREATE OR ALTER TRIGGER trg_ProposalStatusAudit
ON proposals_proposal
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO proposals_proposalstatushistory
        (proposal_id, old_status, new_status, changed_at, changed_by)
    SELECT
        i.id,
        d.status,
        i.status,
        GETDATE(),
        CAST(i.owner_id AS VARCHAR(150))
    FROM inserted i
    INNER JOIN deleted d ON d.id = i.id
    WHERE i.status <> d.status;
END;
