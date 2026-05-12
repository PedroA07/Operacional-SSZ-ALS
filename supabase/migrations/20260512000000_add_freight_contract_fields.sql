-- Add freight contract delivery configuration fields to drivers table
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS freight_contract_send_to TEXT CHECK (freight_contract_send_to IN ('driver', 'beneficiary', 'group')),
  ADD COLUMN IF NOT EXISTS last_freight_contract_date DATE,
  ADD COLUMN IF NOT EXISTS last_freight_contract_location TEXT;
